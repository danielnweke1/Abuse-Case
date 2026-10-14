import { z } from "zod";

export const StrideCategoryEnum = z.enum([
  "Spoofing",
  "Tampering",
  "Repudiation",
  "Information Disclosure",
  "Denial of Service",
  "Elevation of Privilege",
]);

export const StrideThreatItemSchema = z.object({
  id: z.string().describe("Unique identifier, e.g. STRIDE-001"),
  title: z.string().describe("Concise threat title specific to component, e.g. HMAC API Key Spoofing via Weak Timing Comparison"),
  strideCategory: StrideCategoryEnum.describe("STRIDE category classification"),
  affectedElementId: z.string().describe("ID of the affected process, store, flow, or entity"),
  affectedElementType: z.enum(["process", "dataStore", "dataFlow", "externalEntity"]),
  trustBoundaryId: z.string().nullable().describe("ID of crossed trust boundary, if applicable"),
  attackerPrecondition: z.string().describe("Prerequisite position or access required by attacker"),
  attackNarrative: z.string().describe("Concrete 2 to 4 sentence attack scenario specific to this architecture"),
  impact: z.number().int().min(1).max(5).describe("Severity impact score (1-5)"),
  impactRationale: z.string().describe("One-line justification for impact score"),
  likelihood: z.number().int().min(1).max(5).describe("Exploitation likelihood score (1-5)"),
  likelihoodRationale: z.string().describe("One-line justification for likelihood score"),
  existingControls: z.array(z.string()).describe("Existing security controls inferred from description"),
  recommendedMitigations: z.array(z.string()).describe("Specific, concrete architectural mitigations (no generic advice)"),
  cweIds: z.array(z.string()).describe("Applicable CWE IDs, e.g. ['CWE-287', 'CWE-89']"),
  capecIds: z.array(z.string()).describe("Applicable CAPEC attack pattern IDs, e.g. ['CAPEC-115']"),
  asvsIds: z.array(z.string()).describe("Applicable OWASP ASVS requirement IDs, e.g. ['V2.1.1', 'V4.1.1']"),
  mitreAttackIds: z.array(z.string()).describe("Applicable MITRE ATT&CK technique IDs, e.g. ['T1190', 'T1078']"),
  confidence: z.enum(["high", "medium", "low"]).describe("Threat confidence"),
  basis: z.enum(["stated", "inferred", "assumption"]).describe("Basis of threat in application description"),
});

export const StrideBatchResultSchema = z.object({
  threats: z.array(StrideThreatItemSchema),
});

export const CategorizedStrideResultSchema = z.object({
  spoofingThreats: z.array(StrideThreatItemSchema).describe("Concrete, defensible Spoofing threats"),
  tamperingThreats: z.array(StrideThreatItemSchema).describe("Concrete, defensible Tampering threats"),
  repudiationThreats: z.array(StrideThreatItemSchema).describe("Concrete, defensible Repudiation threats"),
  informationDisclosureThreats: z.array(StrideThreatItemSchema).describe("Concrete, defensible Information Disclosure threats"),
  denialOfServiceThreats: z.array(StrideThreatItemSchema).describe("Concrete, defensible Denial of Service threats"),
  elevationOfPrivilegeThreats: z.array(StrideThreatItemSchema).describe("Concrete, defensible Elevation of Privilege threats"),
});

export const StrideCritiqueResultSchema = z.object({
  approvedThreatIds: z.array(z.string()).describe("Threat IDs that are high quality and specific"),
  removedThreatIds: z.array(z.string()).describe("Threat IDs dropped because they are generic, duplicate, or lack basis"),
  updatedThreats: z.array(StrideThreatItemSchema).describe("Threats with improved attack narratives, scores, or mitigations"),
  addedThreats: z.array(StrideThreatItemSchema).describe("Crucial boundary threats that were missed in the initial pass"),
  critiqueSummary: z.string().describe("Summary of threat modeling quality and adjustments made"),
});

export type StrideThreatItem = z.infer<typeof StrideThreatItemSchema>;
export type StrideBatchResult = z.infer<typeof StrideBatchResultSchema>;
export type CategorizedStrideResult = z.infer<typeof CategorizedStrideResultSchema>;
export type StrideCritiqueResult = z.infer<typeof StrideCritiqueResultSchema>;
