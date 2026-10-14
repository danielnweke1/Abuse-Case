import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const analyses = sqliteTable("analyses", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  rawDescription: text("raw_description").notNull(),
  status: text("status", {
    enum: ["pending", "extracting", "clarifying", "analyzing", "completed", "failed"]
  }).notNull().default("pending"),
  stage: text("stage", {
    enum: ["idle", "extraction", "clarification", "stride", "business_logic", "cve", "consolidation", "complete"]
  }).notNull().default("idle"),
  stageProgress: text("stage_progress").notNull().default("{}"), // JSON string
  modelSnapshot: text("model_snapshot").notNull().default("gpt-4o"),
  promptVersion: text("prompt_version").notNull().default("v1.0"),
  totalTokensUsed: integer("total_tokens_used").notNull().default(0),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  tokenBudget: integer("token_budget").notNull().default(60000),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const clarifyingQuestions = sqliteTable("clarifying_questions", {
  id: text("id").primaryKey(),
  analysisId: text("analysis_id").notNull().references(() => analyses.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  category: text("category", {
    enum: ["auth", "hosting", "data_sensitivity", "multi_tenancy", "integrations"]
  }).notNull(),
  suggestedOptions: text("suggested_options").notNull().default("[]"), // JSON string array
  status: text("status", { enum: ["pending", "answered", "skipped"] }).notNull().default("pending"),
  userAnswer: text("user_answer"),
  recordedAssumption: text("recorded_assumption"),
  createdAt: integer("created_at").notNull(),
});

export const systemModels = sqliteTable("system_models", {
  id: text("id").primaryKey(),
  analysisId: text("analysis_id").notNull().references(() => analyses.id, { onDelete: "cascade" }),
  entities: text("entities").notNull().default("[]"), // JSON
  processes: text("processes").notNull().default("[]"), // JSON
  dataStores: text("data_stores").notNull().default("[]"), // JSON
  dataFlows: text("data_flows").notNull().default("[]"), // JSON
  trustBoundaries: text("trust_boundaries").notNull().default("[]"), // JSON
  assets: text("assets").notNull().default("[]"), // JSON
  technologies: text("technologies").notNull().default("[]"), // JSON
  assumptions: text("assumptions").notNull().default("[]"), // JSON
  createdAt: integer("created_at").notNull(),
});

export const strideThreats = sqliteTable("stride_threats", {
  id: text("id").primaryKey(),
  analysisId: text("analysis_id").notNull().references(() => analyses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  strideCategory: text("stride_category", {
    enum: ["Spoofing", "Tampering", "Repudiation", "Information Disclosure", "Denial of Service", "Elevation of Privilege"]
  }).notNull(),
  affectedElementId: text("affected_element_id").notNull(),
  affectedElementType: text("affected_element_type").notNull(),
  trustBoundaryId: text("trust_boundary_id"),
  attackerPrecondition: text("attacker_precondition").notNull(),
  attackNarrative: text("attack_narrative").notNull(),
  impact: integer("impact").notNull(),
  impactRationale: text("impact_rationale").notNull(),
  likelihood: integer("likelihood").notNull(),
  likelihoodRationale: text("likelihood_rationale").notNull(),
  existingControls: text("existing_controls").notNull().default("[]"), // JSON array
  recommendedMitigations: text("recommended_mitigations").notNull().default("[]"), // JSON array
  cweIds: text("cwe_ids").notNull().default("[]"), // JSON array of verified IDs
  capecIds: text("capec_ids").notNull().default("[]"), // JSON array of verified IDs
  asvsIds: text("asvs_ids").notNull().default("[]"), // JSON array of verified IDs
  mitreAttackIds: text("mitre_attack_ids").notNull().default("[]"), // JSON array of verified IDs
  confidence: text("confidence", { enum: ["high", "medium", "low"] }).notNull().default("medium"),
  basis: text("basis", { enum: ["stated", "inferred", "assumption"] }).notNull().default("inferred"),
  createdAt: integer("created_at").notNull(),
});

export const businessLogicScenarios = sqliteTable("business_logic_scenarios", {
  id: text("id").primaryKey(),
  analysisId: text("analysis_id").notNull().references(() => analyses.id, { onDelete: "cascade" }),
  workflow: text("workflow").notNull(),
  title: text("title").notNull(),
  abuseCategory: text("abuse_category").notNull(),
  preconditions: text("preconditions").notNull().default("[]"), // JSON array
  abuseSequence: text("abuse_sequence").notNull().default("[]"), // JSON array
  businessImpact: text("business_impact").notNull(),
  impactScore: integer("impact_score").notNull(),
  likelihoodScore: integer("likelihood_score").notNull(),
  detectionSignals: text("detection_signals").notNull().default("[]"), // JSON array
  mitigations: text("mitigations").notNull().default("[]"), // JSON array
  pentestTestCase: text("pentest_test_case").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const cveFindings = sqliteTable("cve_findings", {
  id: text("id").primaryKey(),
  analysisId: text("analysis_id").notNull().references(() => analyses.id, { onDelete: "cascade" }),
  componentId: text("component_id").notNull(),
  componentName: text("component_name").notNull(),
  componentVersion: text("component_version"),
  cpe: text("cpe"),
  cveId: text("cve_id").notNull(),
  summary: text("summary").notNull(),
  contextualRelevance: text("contextual_relevance").notNull(),
  cvssScore: real("cvss_score"),
  cvssVersion: text("cvss_version"),
  cvssVector: text("cvss_vector"),
  epssScore: real("epss_score"),
  epssPercentile: real("epss_percentile"),
  isKev: integer("is_kev").notNull().default(0), // boolean 0 or 1
  kevDueDate: text("kev_due_date"),
  status: text("status", { enum: ["confirmed_affected", "potentially_affected", "version_unknown"] }).notNull(),
  affectedVersionRange: text("affected_version_range"),
  fixedInVersion: text("fixed_in_version"),
  primarySource: text("primary_source", { enum: ["NVD", "OSV"] }).notNull(),
  sourceUrl: text("source_url").notNull(),
  retrievedAt: integer("retrieved_at").notNull(),
});

export const riskRegister = sqliteTable("risk_register", {
  id: text("id").primaryKey(),
  analysisId: text("analysis_id").notNull().references(() => analyses.id, { onDelete: "cascade" }),
  findingType: text("finding_type", { enum: ["STRIDE", "BUSINESS_LOGIC", "CVE"] }).notNull(),
  findingRefId: text("finding_ref_id").notNull(),
  title: text("title").notNull(),
  affectedAssetOrComponent: text("affected_asset_or_component").notNull(),
  baseLikelihood: integer("base_likelihood").notNull(),
  baseImpact: integer("base_impact").notNull(),
  calculatedRiskScore: real("calculated_risk_score").notNull(),
  riskSeverity: text("risk_severity", { enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] }).notNull(),
  scoringRationale: text("scoring_rationale").notNull(),
  userOverrideScore: real("user_override_score"),
  userOverrideSeverity: text("user_override_severity"),
  userStatus: text("user_status", {
    enum: ["open", "accepted", "mitigated", "false_positive", "needs_verification"]
  }).notNull().default("open"),
  userNotes: text("user_notes"),
  updatedAt: integer("updated_at").notNull(),
});

export const apiCache = sqliteTable("api_cache", {
  cacheKey: text("cache_key").primaryKey(),
  source: text("source").notNull(),
  data: text("data").notNull(), // JSON string
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull(),
});
