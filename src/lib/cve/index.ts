import { db } from "@/db";
import { llmClient } from "../llm/client";
import { resolveComponentCpe } from "./nvd-cpe";
import { queryNvdCveByCpe } from "./nvd-cve";
import { queryOsvPackage } from "./osv";
import { checkKevStatus, queryEpssScore } from "./kev-epss";
import { assertCveIntegrity } from "./post-check";
import { CveContextualizationResultSchema } from "../llm/schemas/cve";
import { CVE_SUMMARY_SYSTEM_PROMPT, buildCveSummaryUserPrompt } from "../llm/prompts/v1_cve_summary";
import crypto from "crypto";

export interface UnifiedCveRecord {
  id: string;
  componentId: string;
  componentName: string;
  componentVersion: string | null;
  cpe: string | null;
  cveId: string;
  summary: string;
  contextualRelevance: string;
  cvssScore: number | null;
  cvssVersion: string | null;
  cvssVector: string | null;
  epssScore: number | null;
  epssPercentile: number | null;
  isKev: number;
  kevDueDate: string | null;
  status: "confirmed_affected" | "potentially_affected" | "version_unknown";
  affectedVersionRange?: string;
  fixedInVersion?: string | null;
  primarySource: "NVD" | "OSV";
  sourceUrl: string;
  retrievedAt: number;
}

export async function runCveCorrelation(analysisId: string): Promise<{
  findingsCount: number;
  findings: UnifiedCveRecord[];
}> {
  const analysis = db.analyses.findFirst(analysisId);
  if (!analysis) {
    throw new Error(`Analysis with id ${analysisId} not found.`);
  }

  const modelRecord = db.systemModels.findFirst(analysisId);
  if (!modelRecord) {
    throw new Error(`System model for analysis ${analysisId} not found.`);
  }

  const systemModel = {
    processes: JSON.parse(modelRecord.processes || "[]"),
    dataStores: JSON.parse(modelRecord.dataStores || "[]"),
    trustBoundaries: JSON.parse(modelRecord.trustBoundaries || "[]"),
    technologies: JSON.parse(modelRecord.technologies || "[]"),
  };

  const currentProgress = JSON.parse(analysis.stageProgress || "{}");
  currentProgress.cve = { status: "running", startedAt: Date.now() };

  db.analyses.update(analysisId, {
    status: "analyzing",
    stage: "cve",
    stageProgress: JSON.stringify(currentProgress),
    updatedAt: Date.now(),
  });

  const allFindings: UnifiedCveRecord[] = [];
  const retrievedCveIdSet = new Set<string>();

  // Process technologies (limit to primary 5 components to stay within rate limits)
  const techList = (systemModel.technologies || []).slice(0, 5);

  for (const tech of techList) {
    const componentName = tech.name;
    const version = tech.version || null;
    const hasKnownVersion = !!version;

    // 1. Resolve CPE
    const resolvedCpe = await resolveComponentCpe({
      name: componentName,
      vendor: tech.vendor,
      version,
    });

    // 2. Query OSV concurrently
    const osvVulns = await queryOsvPackage({
      packageName: componentName,
      version,
    });

    // 3. Query NVD CVE 2.0
    const nvdVulns = await queryNvdCveByCpe({
      cpe: resolvedCpe.cpe,
      version,
    });

    // Merge retrieved CVEs (avoid duplicates)
    const componentCvesMap = new Map<string, any>();

    for (const nv of nvdVulns) {
      componentCvesMap.set(nv.cveId.toUpperCase(), {
        cveId: nv.cveId.toUpperCase(),
        summary: nv.summary,
        cvssScore: nv.cvssScore,
        cvssVersion: nv.cvssVersion,
        cvssVector: nv.cvssVector,
        source: "NVD" as const,
        sourceUrl: `https://nvd.nist.gov/vuln/detail/${nv.cveId}`,
        affectedVersionRange: nv.affectedVersionRange,
        fixedInVersion: null,
      });
      retrievedCveIdSet.add(nv.cveId.toUpperCase());
    }

    for (const ov of osvVulns) {
      if (ov.cveId) {
        const id = ov.cveId.toUpperCase();
        retrievedCveIdSet.add(id);
        if (!componentCvesMap.has(id)) {
          componentCvesMap.set(id, {
            cveId: id,
            summary: ov.summary,
            cvssScore: null,
            cvssVersion: null,
            cvssVector: null,
            source: "OSV" as const,
            sourceUrl: `https://osv.dev/vulnerability/${ov.id}`,
            affectedVersionRange: ov.affectedVersionRange,
            fixedInVersion: ov.fixedInVersion,
          });
        }
      }
    }

    // 4. Enrich with KEV & EPSS
    for (const [cveId, record] of Array.from(componentCvesMap.entries())) {
      const kevStatus = await checkKevStatus(cveId);
      const epssData = await queryEpssScore(cveId);

      const status: "confirmed_affected" | "potentially_affected" | "version_unknown" =
        hasKnownVersion ? "confirmed_affected" : "version_unknown";

      allFindings.push({
        id: crypto.randomUUID(),
        componentId: componentName,
        componentName,
        componentVersion: version,
        cpe: resolvedCpe.cpe,
        cveId,
        summary: record.summary,
        contextualRelevance: hasKnownVersion
          ? `Component ${componentName} matches known version ${version}.`
          : `Component version is unstated; potentially affected if within vulnerable range.`,
        cvssScore: record.cvssScore,
        cvssVersion: record.cvssVersion,
        cvssVector: record.cvssVector,
        epssScore: epssData?.epss ?? null,
        epssPercentile: epssData?.percentile ?? null,
        isKev: kevStatus.isKev ? 1 : 0,
        kevDueDate: kevStatus.dueDate,
        status,
        affectedVersionRange: record.affectedVersionRange,
        fixedInVersion: record.fixedInVersion,
        primarySource: record.source,
        sourceUrl: record.sourceUrl,
        retrievedAt: Date.now(),
      });
    }
  }

  // Rank findings: KEV listed first, then EPSS descending, then CVSS descending
  allFindings.sort((a, b) => {
    if (a.isKev !== b.isKev) return b.isKev - a.isKev;
    if ((a.epssScore ?? 0) !== (b.epssScore ?? 0)) {
      return (b.epssScore ?? 0) - (a.epssScore ?? 0);
    }
    return (b.cvssScore ?? 0) - (a.cvssScore ?? 0);
  });

  // Limit to top 10 most critical findings to keep context focused
  const topFindings = allFindings.slice(0, 10);

  // 5. LLM Contextualization pass with strict post-check
  if (topFindings.length > 0) {
    try {
      const promptInput = topFindings.map((f) => ({
        cveId: f.cveId,
        component: `${f.componentName} (${f.componentVersion || "version unstated"})`,
        summary: f.summary.slice(0, 180),
      }));

      const res = await llmClient.generateStructured({
        systemPrompt: CVE_SUMMARY_SYSTEM_PROMPT,
        userPrompt: buildCveSummaryUserPrompt({
          retrievedCves: promptInput,
          systemModel,
        }),
        schema: CveContextualizationResultSchema,
        schemaName: "CveContextualizationResult",
        metadata: {
          promptVersion: "v1.0",
          stageName: "cve_contextualize",
          modelSnapshot: process.env.OPENAI_MODEL || "gpt-4o",
        },
        currentSpentTokens: analysis.totalTokensUsed,
        tokenBudget: analysis.tokenBudget,
        temperature: 0.15,
      });

      // STRICT INTEGRITY POST-CHECK: Verify raw LLM text contains ONLY retrieved CVE IDs
      assertCveIntegrity(res.rawText, retrievedCveIdSet);

      const summaryMap = new Map(res.data.summaries.map((s) => [s.cveId.toUpperCase(), s.contextualRelevance]));

      topFindings.forEach((f) => {
        if (summaryMap.has(f.cveId.toUpperCase())) {
          f.contextualRelevance = summaryMap.get(f.cveId.toUpperCase())!;
        }
      });

      // Update tokens
      const newTotal = analysis.totalTokensUsed + res.usage.totalTokens;
      db.analyses.update(analysisId, {
        totalTokensUsed: newTotal,
        promptTokens: analysis.promptTokens + res.usage.promptTokens,
        completionTokens: analysis.completionTokens + res.usage.completionTokens,
      });
    } catch (llmErr) {
      console.warn("[CVE] LLM contextualization skipped or rejected by post-check:", llmErr);
    }
  }

  // 6. Persist findings to SQLite
  for (const f of topFindings) {
    db.cveFindings.insert({
      id: f.id,
      analysisId,
      componentId: f.componentId,
      componentName: f.componentName,
      componentVersion: f.componentVersion,
      cpe: f.cpe,
      cveId: f.cveId,
      summary: f.summary,
      contextualRelevance: f.contextualRelevance,
      cvssScore: f.cvssScore,
      cvssVersion: f.cvssVersion,
      cvssVector: f.cvssVector,
      epssScore: f.epssScore,
      epssPercentile: f.epssPercentile,
      isKev: f.isKev,
      kevDueDate: f.kevDueDate,
      status: f.status,
      affectedVersionRange: f.affectedVersionRange,
      fixedInVersion: f.fixedInVersion,
      primarySource: f.primarySource,
      sourceUrl: f.sourceUrl,
      retrievedAt: f.retrievedAt,
    });
  }

  currentProgress.cve = {
    status: "completed",
    completedAt: Date.now(),
    cvesFound: topFindings.length,
    componentsQueried: techList.length,
  };

  db.analyses.update(analysisId, {
    stageProgress: JSON.stringify(currentProgress),
    updatedAt: Date.now(),
  });

  return {
    findingsCount: topFindings.length,
    findings: topFindings,
  };
}
