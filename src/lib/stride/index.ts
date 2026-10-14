import { db } from "@/db";
import { llmClient } from "../llm/client";
import {
  CategorizedStrideResultSchema,
  StrideCritiqueResultSchema,
  type StrideThreatItem,
} from "../llm/schemas/stride";
import { STRIDE_SYSTEM_PROMPT } from "../llm/prompts/v1_stride";
import {
  STRIDE_CRITIQUE_SYSTEM_PROMPT,
  buildStrideCritiqueUserPrompt,
} from "../llm/prompts/v1_stride_critique";
import {
  validateCweId,
  validateCapecId,
  validateAsvsId,
  validateMitreAttackId,
  filterVerifiedReferences,
} from "../references/validator";

export async function runStrideAnalysis(analysisId: string): Promise<{
  threatsCount: number;
  threats: StrideThreatItem[];
}> {
  const analysis = db.analyses.findFirst(analysisId);
  if (!analysis) {
    throw new Error(`Analysis with id ${analysisId} not found.`);
  }

  const modelRecord = db.systemModels.findFirst(analysisId);
  if (!modelRecord) {
    throw new Error(`System model for analysis ${analysisId} not found. Run Stage 1 extraction first.`);
  }

  const systemModel = {
    entities: JSON.parse(modelRecord.entities || "[]"),
    processes: JSON.parse(modelRecord.processes || "[]"),
    dataStores: JSON.parse(modelRecord.dataStores || "[]"),
    dataFlows: JSON.parse(modelRecord.dataFlows || "[]"),
    trustBoundaries: JSON.parse(modelRecord.trustBoundaries || "[]"),
    assets: JSON.parse(modelRecord.assets || "[]"),
    technologies: JSON.parse(modelRecord.technologies || "[]"),
    assumptions: JSON.parse(modelRecord.assumptions || "[]"),
  };

  const currentProgress = JSON.parse(analysis.stageProgress || "{}");
  currentProgress.stride = { status: "running", startedAt: Date.now() };

  db.analyses.update(analysisId, {
    status: "analyzing",
    stage: "stride",
    stageProgress: JSON.stringify(currentProgress),
    updatedAt: Date.now(),
  });

  const effectiveTokenBudget = Math.max(analysis.tokenBudget || 0, 250000);
  let runningTokensUsed = analysis.totalTokensUsed;
  let runningPromptTokens = analysis.promptTokens;
  let runningCompletionTokens = analysis.completionTokens;

  // Step 1: Execute Categorized STRIDE Generation
  // Structured schema strictly enforces all 6 categories (Spoofing, Tampering, Repudiation,
  // Information Disclosure, Denial of Service, Elevation of Privilege) simultaneously.
  const categorizedUserPrompt = `You are performing a comprehensive STRIDE threat modeling analysis.
You MUST provide 2 to 3 technically specific, defensible security threats for EACH of the 6 STRIDE categories:
1. Spoofing (spoofingThreats): Impersonating users, API keys, JWT sessions, webhooks, or inter-service mTLS identities.
2. Tampering (tamperingThreats): Modifying data in transit, query parameters, webhook payloads, DB records, or configuration.
3. Repudiation (repudiationThreats): Plausible deniability of transactions, missing cryptographic audit trails, unprovable actions, or log falsification.
4. Information Disclosure (informationDisclosureThreats): Leaking secrets, PII, sensitive payment tokens, cloud metadata (SSRF), or verbose errors.
5. Denial of Service (denialOfServiceThreats): Resource exhaustion, rate limit bypass, expensive database operations, or queue blocking.
6. Elevation of Privilege (elevationOfPrivilegeThreats): IDOR, role escalation, tenant crossover, or bypassing authorization middleware.

System Architectural Components:
${JSON.stringify(
  {
    entities: systemModel.entities,
    processes: systemModel.processes,
    dataStores: systemModel.dataStores,
    dataFlows: systemModel.dataFlows,
    trustBoundaries: systemModel.trustBoundaries,
    assets: systemModel.assets,
    technologies: systemModel.technologies,
  },
  null,
  2
)}

Application Architectural Description:
<UNTRUSTED_USER_APPLICATION_DESCRIPTION>
${analysis.rawDescription.trim()}
</UNTRUSTED_USER_APPLICATION_DESCRIPTION>

MANDATORY INSTRUCTIONS:
- Every attack narrative must be 2-4 sentences detailing the exact technical mechanism specific to THIS architecture and technology stack.
- Populate every single one of the 6 category arrays with exactly 2 high-impact, architecture-specific threats (12 threats total). Do NOT leave any category empty.`;

  const generationRes = await llmClient.generateStructured({
    systemPrompt: STRIDE_SYSTEM_PROMPT,
    userPrompt: categorizedUserPrompt,
    schema: CategorizedStrideResultSchema,
    schemaName: "CategorizedStrideResult",
    metadata: {
      promptVersion: "v2.0",
      stageName: "stride_categorized_generate",
      modelSnapshot: process.env.OPENAI_MODEL || "gpt-4o",
    },
    currentSpentTokens: runningTokensUsed,
    tokenBudget: effectiveTokenBudget,
    temperature: 0.2,
  });

  runningTokensUsed += generationRes.usage.totalTokens;
  runningPromptTokens += generationRes.usage.promptTokens;
  runningCompletionTokens += generationRes.usage.completionTokens;

  const rawData = generationRes.data;
  const rawCandidates: StrideThreatItem[] = [
    ...rawData.spoofingThreats.map((t) => ({ ...t, strideCategory: "Spoofing" as const })),
    ...rawData.tamperingThreats.map((t) => ({ ...t, strideCategory: "Tampering" as const })),
    ...rawData.repudiationThreats.map((t) => ({ ...t, strideCategory: "Repudiation" as const })),
    ...rawData.informationDisclosureThreats.map((t) => ({ ...t, strideCategory: "Information Disclosure" as const })),
    ...rawData.denialOfServiceThreats.map((t) => ({ ...t, strideCategory: "Denial of Service" as const })),
    ...rawData.elevationOfPrivilegeThreats.map((t) => ({ ...t, strideCategory: "Elevation of Privilege" as const })),
  ];

  // Step 2: Quality Critique Pass (deduplicate and verify completeness)
  let finalizedThreats: StrideThreatItem[] = [];

  try {
    const critiqueRes = await llmClient.generateStructured({
      systemPrompt: STRIDE_CRITIQUE_SYSTEM_PROMPT,
      userPrompt: buildStrideCritiqueUserPrompt({
        candidateThreats: rawCandidates,
        systemModel,
      }),
      schema: StrideCritiqueResultSchema,
      schemaName: "StrideCritiqueResult",
      metadata: {
        promptVersion: "v2.0",
        stageName: "stride_critique",
        modelSnapshot: process.env.OPENAI_MODEL || "gpt-4o",
      },
      currentSpentTokens: runningTokensUsed,
      tokenBudget: effectiveTokenBudget,
      temperature: 0.15,
    });

    runningTokensUsed += critiqueRes.usage.totalTokens;
    runningPromptTokens += critiqueRes.usage.promptTokens;
    runningCompletionTokens += critiqueRes.usage.completionTokens;

    const critique = critiqueRes.data;
    const removedSet = new Set(critique.removedThreatIds);
    const updateMap = new Map(critique.updatedThreats.map((t) => [t.id, t]));

    const keptCandidates = rawCandidates
      .filter((t) => !removedSet.has(t.id))
      .map((t) => (updateMap.has(t.id) ? updateMap.get(t.id)! : t));

    finalizedThreats = [...keptCandidates, ...(critique.addedThreats || [])];
  } catch (critiqueError: unknown) {
    console.warn("[STRIDE] Critique pass error, using raw candidates:", critiqueError);
    finalizedThreats = rawCandidates;
  }

  // Step 3: Reference Catalog Validation (Drop hallucinated IDs deterministically)
  const validatedThreats = finalizedThreats.map((threat, idx) => {
    const verifiedCwe = filterVerifiedReferences(threat.cweIds || [], validateCweId);
    const verifiedCapec = filterVerifiedReferences(threat.capecIds || [], validateCapecId);
    const verifiedAsvs = filterVerifiedReferences(threat.asvsIds || [], validateAsvsId);
    const verifiedAttack = filterVerifiedReferences(threat.mitreAttackIds || [], validateMitreAttackId);

    const formattedId = `STRIDE-${String(idx + 1).padStart(3, "0")}`;
    const uniqueDbId = `${analysisId.slice(0, 8)}_${formattedId}`;

    return {
      ...threat,
      id: uniqueDbId,
      displayId: formattedId,
      cweIds: verifiedCwe,
      capecIds: verifiedCapec,
      asvsIds: verifiedAsvs,
      mitreAttackIds: verifiedAttack,
    };
  });

  // Step 4: Persist to Database (atomically clear old threats for this analysis first)
  db.strideThreats.deleteByAnalysis(analysisId);

  for (const t of validatedThreats) {
    db.strideThreats.insert({
      id: t.id,
      analysisId,
      title: t.title,
      strideCategory: t.strideCategory,
      affectedElementId: t.affectedElementId,
      affectedElementType: t.affectedElementType,
      trustBoundaryId: t.trustBoundaryId ?? null,
      attackerPrecondition: t.attackerPrecondition,
      attackNarrative: t.attackNarrative,
      impact: t.impact,
      impactRationale: t.impactRationale,
      likelihood: t.likelihood,
      likelihoodRationale: t.likelihoodRationale,
      existingControls: JSON.stringify(t.existingControls || []),
      recommendedMitigations: JSON.stringify(t.recommendedMitigations || []),
      cweIds: JSON.stringify(t.cweIds),
      capecIds: JSON.stringify(t.capecIds),
      asvsIds: JSON.stringify(t.asvsIds),
      mitreAttackIds: JSON.stringify(t.mitreAttackIds),
      confidence: t.confidence,
      basis: t.basis,
      createdAt: Date.now(),
    });
  }

  currentProgress.stride = {
    status: "completed",
    completedAt: Date.now(),
    threatsIdentified: validatedThreats.length,
    tokensUsed: runningTokensUsed - analysis.totalTokensUsed,
  };

  db.analyses.update(analysisId, {
    stageProgress: JSON.stringify(currentProgress),
    totalTokensUsed: runningTokensUsed,
    promptTokens: runningPromptTokens,
    completionTokens: runningCompletionTokens,
    updatedAt: Date.now(),
  });

  return {
    threatsCount: validatedThreats.length,
    threats: validatedThreats,
  };
}
