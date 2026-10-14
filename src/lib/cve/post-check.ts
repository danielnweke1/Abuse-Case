export class HallucinatedCveError extends Error {
  constructor(public hallucinatedIds: string[]) {
    super(
      `CVE Integrity Check Violation: LLM output contained ungrounded/hallucinated CVE IDs: ${hallucinatedIds.join(", ")}`
    );
    this.name = "HallucinatedCveError";
  }
}

/**
 * Validates that every CVE ID mentioned in any LLM text or output
 * strictly belongs to the verified, retrieved ground-truth set.
 */
export function verifyCveIntegrity(
  text: string,
  retrievedCveIds: Set<string>
): {
  isValid: boolean;
  hallucinatedIds: string[];
  detectedIds: string[];
} {
  const cveRegex = /\bCVE-\d{4}-\d{4,}\b/gi;
  const matches = text.match(cveRegex) || [];
  const normalizedMatches = Array.from(new Set(matches.map((id) => id.toUpperCase())));

  const hallucinatedIds: string[] = [];
  for (const id of normalizedMatches) {
    if (!retrievedCveIds.has(id)) {
      hallucinatedIds.push(id);
    }
  }

  return {
    isValid: hallucinatedIds.length === 0,
    hallucinatedIds,
    detectedIds: normalizedMatches,
  };
}

/**
 * Assertion version: throws immediately if an ungrounded CVE is detected
 */
export function assertCveIntegrity(text: string, retrievedCveIds: Set<string>): void {
  const result = verifyCveIntegrity(text, retrievedCveIds);
  if (!result.isValid) {
    throw new HallucinatedCveError(result.hallucinatedIds);
  }
}
