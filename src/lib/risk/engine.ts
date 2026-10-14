import { db } from "@/db";

export type RiskSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type UserStatus = "open" | "accepted" | "mitigated" | "false_positive" | "needs_verification";

export interface RiskModifierContext {
  crossesInternetDmz?: boolean;
  isKev?: boolean;
  epssScore?: number | null;
  hasConfidentialAsset?: boolean;
}

export interface RiskCalculationResult {
  baseLikelihood: number;
  baseImpact: number;
  baseScore: number;
  modifiersApplied: { name: string; value: number }[];
  calculatedScore: number;
  severity: RiskSeverity;
  scoringRationale: string;
}

/**
 * Deterministic formula:
 * Base Risk = Likelihood (1–5) * Impact (1–5)
 * Modifiers:
 * +3.0 if crosses Internet/DMZ boundary
 * +4.0 if finding is a CVE on CISA KEV
 * +2.0 if CVE EPSS score > 0.1
 * +1.5 if Restrictive/Confidential data asset involved
 * Normalized Risk Score = min(25.0, Base Risk + Modifiers)
 */
export function calculateRiskScore(
  likelihood: number,
  impact: number,
  context: RiskModifierContext = {}
): RiskCalculationResult {
  const safeLikelihood = Math.max(1, Math.min(5, Math.round(likelihood)));
  const safeImpact = Math.max(1, Math.min(5, Math.round(impact)));
  const baseScore = safeLikelihood * safeImpact;

  const modifiersApplied: { name: string; value: number }[] = [];
  let modifierSum = 0;

  if (context.crossesInternetDmz) {
    modifiersApplied.push({ name: "Internet / DMZ Exposure", value: 3.0 });
    modifierSum += 3.0;
  }

  if (context.isKev) {
    modifiersApplied.push({ name: "CISA Known Exploited Vulnerability (KEV)", value: 4.0 });
    modifierSum += 4.0;
  }

  if (context.epssScore && context.epssScore > 0.1) {
    modifiersApplied.push({ name: `High EPSS Exploit Probability (${(context.epssScore * 100).toFixed(1)}%)`, value: 2.0 });
    modifierSum += 2.0;
  }

  if (context.hasConfidentialAsset) {
    modifiersApplied.push({ name: "Confidential / Restricted Asset Involvement", value: 1.5 });
    modifierSum += 1.5;
  }

  const rawScore = baseScore + modifierSum;
  const calculatedScore = Math.min(25.0, Math.max(1.0, Math.round(rawScore * 10) / 10));

  let severity: RiskSeverity = "INFO";
  if (calculatedScore >= 20.0) severity = "CRITICAL";
  else if (calculatedScore >= 15.0) severity = "HIGH";
  else if (calculatedScore >= 10.0) severity = "MEDIUM";
  else if (calculatedScore >= 5.0) severity = "LOW";
  else severity = "INFO";

  const modifierText = modifiersApplied.length > 0
    ? ` Modifiers: ${modifiersApplied.map((m) => `+${m.value} (${m.name})`).join(", ")}.`
    : " No exposure modifiers.";

  const scoringRationale = `Base score ${baseScore} (Likelihood ${safeLikelihood} × Impact ${safeImpact}).${modifierText} Normalized calculated score: ${calculatedScore.toFixed(1)} / 25 (${severity}).`;

  return {
    baseLikelihood: safeLikelihood,
    baseImpact: safeImpact,
    baseScore,
    modifiersApplied,
    calculatedScore,
    severity,
    scoringRationale,
  };
}

/**
 * Consolidate all findings (STRIDE, Business Logic, CVEs) into the unified risk register.
 * Preserves existing user overrides and statuses across recalculations.
 */
export async function buildUnifiedRiskRegister(analysisId: string) {
  const analysis = db.analyses.findFirst(analysisId);
  if (!analysis) {
    throw new Error(`Analysis ${analysisId} not found`);
  }

  const modelRecord = db.systemModels.findFirst(analysisId);
  const systemModel = modelRecord
    ? {
        entities: JSON.parse(modelRecord.entities || "[]"),
        processes: JSON.parse(modelRecord.processes || "[]"),
        dataStores: JSON.parse(modelRecord.dataStores || "[]"),
        dataFlows: JSON.parse(modelRecord.dataFlows || "[]"),
        trustBoundaries: JSON.parse(modelRecord.trustBoundaries || "[]"),
        assets: JSON.parse(modelRecord.assets || "[]"),
      }
    : null;

  // Identify components crossing Internet/DMZ
  const internetBoundaries = new Set<string>();
  if (systemModel?.trustBoundaries) {
    for (const b of systemModel.trustBoundaries) {
      if (b.type === "internet_dmz" || b.name?.toLowerCase().includes("internet") || b.name?.toLowerCase().includes("dmz")) {
        internetBoundaries.add(b.id);
        (b.elementIds || []).forEach((elId: string) => internetBoundaries.add(elId));
      }
    }
  }

  // Check confidential/restricted assets
  const hasConfidentialAssets = (systemModel?.assets || []).some(
    (a: any) => a.classification === "confidential" || a.classification === "restricted"
  );

  // Load existing register to preserve user overrides
  const existingEntries = db.riskRegister.findMany(analysisId);
  const existingMap = new Map<string, any>(existingEntries.map((e) => [e.findingRefId, e]));

  const strideThreats = db.strideThreats.findMany(analysisId);
  const businessLogicScenarios = db.businessLogicScenarios.findMany(analysisId);
  const cveFindings = db.cveFindings.findMany(analysisId);

  const newRegisterEntries: any[] = [];

  // 1. Process STRIDE Threats
  for (const threat of strideThreats) {
    const isExposed = threat.trustBoundaryId ? internetBoundaries.has(threat.trustBoundaryId) : internetBoundaries.has(threat.affectedElementId);
    const scoreResult = calculateRiskScore(threat.likelihood, threat.impact, {
      crossesInternetDmz: isExposed,
      hasConfidentialAsset: hasConfidentialAssets,
    });

    const displayRefId = threat.id.includes("_") ? threat.id.split("_")[1] : threat.id;
    const existing = existingMap.get(displayRefId) || existingMap.get(threat.id);

    newRegisterEntries.push({
      id: `${analysisId.slice(0, 8)}_RR_${displayRefId}`,
      analysisId,
      findingType: "STRIDE" as const,
      findingRefId: displayRefId,
      title: threat.title,
      affectedAssetOrComponent: `${threat.affectedElementId} (${threat.strideCategory})`,
      baseLikelihood: scoreResult.baseLikelihood,
      baseImpact: scoreResult.baseImpact,
      calculatedRiskScore: scoreResult.calculatedScore,
      riskSeverity: scoreResult.severity,
      scoringRationale: scoreResult.scoringRationale,
      userOverrideScore: existing?.userOverrideScore ?? null,
      userOverrideSeverity: existing?.userOverrideSeverity ?? null,
      userStatus: existing?.userStatus ?? "open",
      userNotes: existing?.userNotes ?? null,
      updatedAt: Date.now(),
    });
  }

  // 2. Process Business Logic Scenarios
  for (const scenario of businessLogicScenarios) {
    const scoreResult = calculateRiskScore(scenario.likelihoodScore, scenario.impactScore, {
      crossesInternetDmz: true, // Business logic flows exposed via customer/partner API surface
      hasConfidentialAsset: hasConfidentialAssets,
    });

    const displayRefId = scenario.id.includes("_") ? scenario.id.split("_")[1] : scenario.id;
    const existing = existingMap.get(displayRefId) || existingMap.get(scenario.id);

    newRegisterEntries.push({
      id: `${analysisId.slice(0, 8)}_RR_${displayRefId}`,
      analysisId,
      findingType: "BUSINESS_LOGIC" as const,
      findingRefId: displayRefId,
      title: scenario.title,
      affectedAssetOrComponent: `${scenario.workflow} (${scenario.abuseCategory})`,
      baseLikelihood: scoreResult.baseLikelihood,
      baseImpact: scoreResult.baseImpact,
      calculatedRiskScore: scoreResult.calculatedScore,
      riskSeverity: scoreResult.severity,
      scoringRationale: scoreResult.scoringRationale,
      userOverrideScore: existing?.userOverrideScore ?? null,
      userOverrideSeverity: existing?.userOverrideSeverity ?? null,
      userStatus: existing?.userStatus ?? "open",
      userNotes: existing?.userNotes ?? null,
      updatedAt: Date.now(),
    });
  }

  // 3. Process CVE Findings
  for (const cve of cveFindings) {
    // Derive base impact from CVSS
    let derivedImpact = 3;
    if (cve.cvssScore) {
      if (cve.cvssScore >= 9.0) derivedImpact = 5;
      else if (cve.cvssScore >= 7.0) derivedImpact = 4;
      else if (cve.cvssScore >= 4.0) derivedImpact = 3;
      else derivedImpact = 2;
    }

    // Derive base likelihood from EPSS and status
    let derivedLikelihood = 2;
    if (cve.isKev === 1) derivedLikelihood = 5;
    else if (cve.epssScore && cve.epssScore > 0.2) derivedLikelihood = 5;
    else if (cve.epssScore && cve.epssScore > 0.05) derivedLikelihood = 4;
    else if (cve.status === "confirmed_affected") derivedLikelihood = 3;

    const scoreResult = calculateRiskScore(derivedLikelihood, derivedImpact, {
      isKev: cve.isKev === 1,
      epssScore: cve.epssScore,
      crossesInternetDmz: internetBoundaries.has(cve.componentName.toLowerCase()),
      hasConfidentialAsset: hasConfidentialAssets,
    });

    const existing = existingMap.get(cve.cveId);

    newRegisterEntries.push({
      id: `${analysisId.slice(0, 8)}_RR_${cve.cveId.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
      analysisId,
      findingType: "CVE" as const,
      findingRefId: cve.cveId,
      title: `${cve.cveId}: ${cve.summary.slice(0, 85)}${cve.summary.length > 85 ? "..." : ""}`,
      affectedAssetOrComponent: `${cve.componentName}${cve.componentVersion ? ` v${cve.componentVersion}` : ""}`,
      baseLikelihood: scoreResult.baseLikelihood,
      baseImpact: scoreResult.baseImpact,
      calculatedRiskScore: scoreResult.calculatedScore,
      riskSeverity: scoreResult.severity,
      scoringRationale: scoreResult.scoringRationale,
      userOverrideScore: existing?.userOverrideScore ?? null,
      userOverrideSeverity: existing?.userOverrideSeverity ?? null,
      userStatus: existing?.userStatus ?? "open",
      userNotes: existing?.userNotes ?? null,
      updatedAt: Date.now(),
    });
  }

  // Atomically replace register in SQLite
  db.riskRegister.deleteByAnalysis(analysisId);
  for (const entry of newRegisterEntries) {
    db.riskRegister.insert(entry);
  }

  // Sort descending by effective score (user override if present, else calculated score)
  return newRegisterEntries.sort((a, b) => {
    const scoreA = a.userOverrideScore ?? a.calculatedRiskScore;
    const scoreB = b.userOverrideScore ?? b.calculatedRiskScore;
    return scoreB - scoreA;
  });
}
