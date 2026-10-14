import type { BusinessLogicScenarioItem } from "../schemas/business_logic";

export const BUSINESS_LOGIC_CRITIQUE_SYSTEM_PROMPT = `You are a Lead Application Security Assessor critiquing draft Business Logic Abuse Scenarios.
Your mission is to enforce high technical fidelity, eliminate generic boilerplate or irrelevant injection findings, and guarantee actionable test cases and detection rules.

EVALUATION RULES:
1. BUSINESS LOGIC RELEVANCE:
   - Reject generic infrastructure vulnerabilities (e.g., standard SQL injection, buffer overflows, generic XSS) that do not exploit legitimate workflow state machines or business rules.
   - Place IDs of invalid or low-quality scenarios in 'removedScenarioIds'.
2. REMOVE DUPLICATES:
   - If two scenarios target the same transaction with nearly identical mechanics, remove the duplicate and keep the stronger one.
3. QUALITY ENHANCEMENT:
   - Ensure the scenarios have practical reproduction steps ('pentestTestCase') and viable detection rules ('detectionSignals').
   - Keep 'updatedScenarios' minimal (0 to 2 items) to respect token budgets.
4. APPROVE DEFENSIVE & REPRODUCIBLE FINDINGS:
   - Place IDs of solid, architecture-specific scenarios in 'approvedScenarioIds'.`;

export function buildBusinessLogicCritiqueUserPrompt({
  candidateScenarios,
  systemModel,
}: {
  candidateScenarios: BusinessLogicScenarioItem[];
  systemModel: any;
}): string {
  const summarizedScenarios = candidateScenarios.map((s) => ({
    id: s.id,
    workflow: s.workflow,
    title: s.title,
    abuseCategory: s.abuseCategory,
    impactScore: s.impactScore,
    likelihoodScore: s.likelihoodScore,
    abuseSequenceStepsCount: s.abuseSequence.length,
    hasPentestTestCase: Boolean(s.pentestTestCase && s.pentestTestCase.length > 20),
  }));

  return `System Architectural Summary:
${JSON.stringify(
  {
    entities: (systemModel.entities || []).map((e: any) => ({ id: e.id, name: e.name })),
    processes: (systemModel.processes || []).map((p: any) => ({ id: p.id, name: p.name, tech: p.tech })),
    dataStores: (systemModel.dataStores || []).map((s: any) => ({ id: s.id, name: s.name, tech: s.tech })),
  },
  null,
  2
)}

Draft Business Logic Scenarios (${candidateScenarios.length} total):
${JSON.stringify(summarizedScenarios, null, 2)}

Review all draft scenarios:
1. Approve technically sound, architecture-specific scenarios by listing their IDs in 'approvedScenarioIds'.
2. If any scenario is a generic OWASP injection vulnerability instead of a business logic state machine issue, place its ID in 'removedScenarioIds'.
3. If an important workflow (such as payment processing, coupon redemption, or authorization delegation) was overlooked, you may add 1 scenario in 'addedScenarios'.`;
}
