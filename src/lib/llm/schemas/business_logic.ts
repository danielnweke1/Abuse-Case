import { z } from "zod";

export const AbuseCategoryEnum = z.enum([
  "Workflow / State Bypass",
  "Race Condition / TOCTOU",
  "IDOR / Authorization Context Flaw",
  "Financial / Pricing Abuse",
  "Replay / Re-entrancy Attack",
  "Rate Limiting / Exhaustion Flaw",
]);

export const BusinessLogicScenarioItemSchema = z.object({
  id: z.string().describe("Unique identifier, e.g. BL-001"),
  workflow: z.string().describe("Target transaction or workflow name, e.g. Order Checkout & Payment Settlement"),
  title: z.string().describe("Concise descriptive scenario title, e.g. Cart Coupon Stacking via Parallel Thread Checkout Race Condition"),
  abuseCategory: AbuseCategoryEnum.describe("Classification category of business logic flaw"),
  preconditions: z.array(z.string()).describe("Prerequisite attacker privileges, account state, or initial assets"),
  abuseSequence: z.array(z.string()).describe("Ordered list of technical steps executed by attacker to subvert workflow state machine"),
  businessImpact: z.string().describe("Direct financial, inventory, reputational, or data integrity damage to business"),
  impactScore: z.number().int().min(1).max(5).describe("Business severity impact score (1-5)"),
  likelihoodScore: z.number().int().min(1).max(5).describe("Likelihood score of discovery and successful execution (1-5)"),
  detectionSignals: z.array(z.string()).describe("Actionable SIEM telemetry, audit logs, and anomaly detection signatures"),
  mitigations: z.array(z.string()).describe("Definitive architectural and code-level remediations (e.g. database locks, idempotency keys, state validations)"),
  pentestTestCase: z.string().describe("Actionable penetration testing instructions with concrete HTTP requests, Burp Suite intruder configs, or concurrent curl commands"),
});

export const BusinessLogicBatchResultSchema = z.object({
  scenarios: z.array(BusinessLogicScenarioItemSchema).describe("Defensible, highly concrete business logic abuse scenarios"),
});

export const BusinessLogicCritiqueResultSchema = z.object({
  approvedScenarioIds: z.array(z.string()).describe("Scenario IDs that are technically credible, non-generic, and architecture-specific"),
  removedScenarioIds: z.array(z.string()).describe("Scenario IDs dropped due to being generic OWASP top 10 padding, duplicate, or irrelevant"),
  updatedScenarios: z.array(BusinessLogicScenarioItemSchema).describe("Scenarios enriched with sharper pentest steps or concrete detection signals"),
  addedScenarios: z.array(BusinessLogicScenarioItemSchema).describe("Crucial business logic abuse scenarios missed during initial batch"),
  critiqueSummary: z.string().describe("Summary of business logic analysis quality assessment"),
});

export type BusinessLogicScenarioItem = z.infer<typeof BusinessLogicScenarioItemSchema>;
export type BusinessLogicBatchResult = z.infer<typeof BusinessLogicBatchResultSchema>;
export type BusinessLogicCritiqueResult = z.infer<typeof BusinessLogicCritiqueResultSchema>;
