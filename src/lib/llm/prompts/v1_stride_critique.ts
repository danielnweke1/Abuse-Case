export const STRIDE_CRITIQUE_SYSTEM_PROMPT = `You are a Lead Application Security Reviewer critiquing a draft STRIDE threat model.
Your goal is to enforce high standards of technical rigor, eliminate generic padding, and ensure comprehensive STRIDE category balance across all 6 categories:
1. Spoofing
2. Tampering
3. Repudiation
4. Information Disclosure
5. Denial of Service
6. Elevation of Privilege

EVALUATION RULES:
1. CATEGORY COMPLETENESS:
   - Check that all 6 STRIDE categories have representation.
   - If any category is completely absent, add 1 concrete threat for that category in 'addedThreats'.
2. REMOVE DUPLICATES & GENERIC CHECKLIST ITEMS:
   - If threats are redundant or generic, place their IDs in 'removedThreatIds'.
3. TOKEN ECONOMY:
   - Do NOT rewrite or populate 'updatedThreats' unless a threat has an outright incorrect score or flawed narrative. Keep 'updatedThreats' minimal (0 to 2 items) to stay within completion limits.
4. APPROVE GENUINE FINDINGS:
   - Place validated threat IDs in 'approvedThreatIds'.`;

export function buildStrideCritiqueUserPrompt({
  candidateThreats,
  systemModel,
}: {
  candidateThreats: any[];
  systemModel: any;
}): string {
  // Pass a concise overview of candidate threats to stay within token budget
  const summaryCandidates = candidateThreats.map((t) => ({
    id: t.id,
    title: t.title,
    strideCategory: t.strideCategory,
    affectedElementId: t.affectedElementId,
    affectedElementType: t.affectedElementType,
    impact: t.impact,
    likelihood: t.likelihood,
    cweIds: t.cweIds,
  }));

  return `System Architectural Summary:
${JSON.stringify(
  {
    entities: (systemModel.entities || []).map((e: any) => ({ id: e.id, name: e.name })),
    processes: (systemModel.processes || []).map((p: any) => ({ id: p.id, name: p.name, tech: p.tech })),
    dataStores: (systemModel.dataStores || []).map((s: any) => ({ id: s.id, name: s.name, tech: s.tech })),
    boundaries: (systemModel.trustBoundaries || []).map((b: any) => ({ id: b.id, name: b.name })),
  },
  null,
  2
)}

Draft STRIDE Threats (${candidateThreats.length} total across categories):
${JSON.stringify(summaryCandidates, null, 2)}

Review all draft threats:
1. Ensure all 6 categories (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) have coverage. If any category has 0 threats, add 1 specific threat to 'addedThreats'.
2. Identify any obvious duplicates in 'removedThreatIds'.
3. List approved IDs in 'approvedThreatIds'.`;
}
