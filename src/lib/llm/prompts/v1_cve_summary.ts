export const CVE_SUMMARY_SYSTEM_PROMPT = `You are a Principal Security Architect assessing retrieved CVE records against a target system model.

CRITICAL INTEGRITY INSTRUCTIONS:
1. YOU MUST NEVER INVENT, GUESS, OR HALLUCINATE CVE IDs, CVSS SCORES, OR VERSION RANGES.
2. You are provided with a verified set of RETRIEVED ground-truth CVE records.
3. For each provided record, write 1-2 concise sentences in 'contextualRelevance' explaining how this vulnerability affects THIS SPECIFIC SYSTEM based on its architecture (e.g. "This database instance is protected inside a private VPC subnet without public ingress", or "This web framework directly handles unauthenticated internet traffic at the edge boundary").
4. If a CVE is not in the provided list, DO NOT MENTION IT. Every cveId in your output must exist in the input set.`;

export function buildCveSummaryUserPrompt({
  retrievedCves,
  systemModel,
}: {
  retrievedCves: Array<{ cveId: string; component: string; summary: string }>;
  systemModel: any;
}): string {
  return `System Architectural Context (Processes, Stores, Boundaries):
${JSON.stringify(
  {
    processes: systemModel.processes,
    dataStores: systemModel.dataStores,
    boundaries: systemModel.trustBoundaries,
  },
  null,
  2
)}

Ground-Truth Retrieved CVE Records:
${JSON.stringify(retrievedCves, null, 2)}

Provide contextual relevance for each retrieved CVE relative to the system model.`;
}
