import cweData from "@/../data/references/cwe.json";
import capecData from "@/../data/references/capec.json";
import asvsData from "@/../data/references/asvs.json";
import attackData from "@/../data/references/attack.json";

interface ReferenceItem {
  id: string;
  name: string;
}

const cweMap = new Map<string, string>(
  (cweData as ReferenceItem[]).map((item) => [item.id.toUpperCase(), item.name])
);

const capecMap = new Map<string, string>(
  (capecData as ReferenceItem[]).map((item) => [item.id.toUpperCase(), item.name])
);

const asvsMap = new Map<string, string>(
  (asvsData as ReferenceItem[]).map((item) => [item.id.toUpperCase(), item.name])
);

const attackMap = new Map<string, string>(
  (attackData as ReferenceItem[]).map((item) => [item.id.toUpperCase(), item.name])
);

export interface ValidatedReference {
  id: string;
  name: string;
  isValid: boolean;
  type: "CWE" | "CAPEC" | "ASVS" | "ATTACK";
}

export function validateCweId(id: string): ValidatedReference {
  const normalized = id.trim().toUpperCase();
  const name = cweMap.get(normalized);
  return {
    id: normalized,
    name: name || "Unknown / Unverified CWE",
    isValid: !!name,
    type: "CWE",
  };
}

export function validateCapecId(id: string): ValidatedReference {
  const normalized = id.trim().toUpperCase();
  const name = capecMap.get(normalized);
  return {
    id: normalized,
    name: name || "Unknown / Unverified CAPEC",
    isValid: !!name,
    type: "CAPEC",
  };
}

export function validateAsvsId(id: string): ValidatedReference {
  const normalized = id.trim().toUpperCase();
  const name = asvsMap.get(normalized);
  return {
    id: normalized,
    name: name || "Unknown / Unverified ASVS Requirement",
    isValid: !!name,
    type: "ASVS",
  };
}

export function validateMitreAttackId(id: string): ValidatedReference {
  const normalized = id.trim().toUpperCase();
  const name = attackMap.get(normalized);
  return {
    id: normalized,
    name: name || "Unknown / Unverified MITRE ATT&CK Technique",
    isValid: !!name,
    type: "ATTACK",
  };
}

/**
 * Filter an array of IDs, retaining only verified IDs from the catalog.
 */
export function filterVerifiedReferences(
  ids: string[],
  validator: (id: string) => ValidatedReference
): string[] {
  return ids
    .map((id) => validator(id))
    .filter((ref) => ref.isValid)
    .map((ref) => ref.id);
}
