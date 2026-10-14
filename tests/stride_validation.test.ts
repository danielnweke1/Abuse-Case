import { StrideBatchResultSchema, StrideCritiqueResultSchema } from "../src/lib/llm/schemas/stride";
import {
  validateCweId,
  validateCapecId,
  validateAsvsId,
  validateMitreAttackId,
  filterVerifiedReferences,
} from "../src/lib/references/validator";
import fs from "fs";
import path from "path";

function runStrideTests() {
  console.log("=== Running Phase 3 STRIDE Module Unit Tests ===");

  // 1. Validate StrideBatchResultSchema against fixture
  console.log("\n[Test 1] Testing StrideBatchResultSchema on realistic fixture...");
  const fixturePath = path.join(__dirname, "fixtures", "stride_output.json");
  const rawFixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));

  const parsed = StrideBatchResultSchema.safeParse(rawFixture);
  if (!parsed.success) {
    console.error("FAIL: StrideBatchResultSchema failed on valid fixture:", parsed.error.format());
    process.exit(1);
  }
  console.log(`PASS: Validated ${parsed.data.threats.length} STRIDE threats against schema.`);
  parsed.data.threats.forEach((t) => {
    console.log(`  - [${t.strideCategory}] ${t.id}: ${t.title}`);
  });

  // 2. Validate StrideCritiqueResultSchema
  console.log("\n[Test 2] Testing StrideCritiqueResultSchema...");
  const mockCritique = {
    approvedThreatIds: ["STRIDE-001"],
    removedThreatIds: ["STRIDE-GENERIC-99"],
    updatedThreats: [
      {
        ...parsed.data.threats[0],
        title: "Updated Title with Sharper Focus",
      },
    ],
    addedThreats: [
      {
        id: "STRIDE-003",
        title: "Direct S3 Bucket Leakage via Unsigned Pre-signed URLs",
        strideCategory: "Information Disclosure",
        affectedElementId: "STORE-03",
        affectedElementType: "dataStore",
        trustBoundaryId: "BOUNDARY-01",
        attackerPrecondition: "Public internet client with guessing access to invoice IDs",
        attackNarrative: "An attacker enumerates sequential invoice identifiers to access sensitive customer billing PDFs directly from AWS S3 without authenticating against the merchant portal.",
        impact: 4,
        impactRationale: "Exposes sensitive financial invoices and PII.",
        likelihood: 3,
        likelihoodRationale: "Predictable identifier format allows automated harvesting.",
        existingControls: ["S3 bucket policies"],
        recommendedMitigations: ["Use cryptographically random UUIDv4 or HMAC-signed pre-signed URLs with short 5-minute TTLs"],
        cweIds: ["CWE-200", "CWE-639"],
        capecIds: ["CAPEC-1"],
        asvsIds: ["V4.2.1"],
        mitreAttackIds: ["T1190"],
        confidence: "high",
        basis: "inferred",
      },
    ],
    critiqueSummary: "Removed 1 generic threat, refined 1 timing attack mitigation, and added 1 missing S3 direct object reference threat.",
  };

  const critiqueParsed = StrideCritiqueResultSchema.safeParse(mockCritique);
  if (!critiqueParsed.success) {
    console.error("FAIL: StrideCritiqueResultSchema failed:", critiqueParsed.error.format());
    process.exit(1);
  }
  console.log("PASS: StrideCritiqueResultSchema validated successfully.");

  // 3. Test Reference Validation and Hallucination Filtering
  console.log("\n[Test 3] Testing Reference ID catalog filtering on STRIDE threats...");
  const testThreat = {
    cweIds: ["CWE-287", "CWE-99999", "CWE-345", "FAKE-CWE"],
    capecIds: ["CAPEC-115", "CAPEC-FAKE-00"],
    asvsIds: ["V2.1.1", "V99.9.9"],
    mitreAttackIds: ["T1190", "T9999"],
  };

  const filteredCwe = filterVerifiedReferences(testThreat.cweIds, validateCweId);
  const filteredCapec = filterVerifiedReferences(testThreat.capecIds, validateCapecId);
  const filteredAsvs = filterVerifiedReferences(testThreat.asvsIds, validateAsvsId);
  const filteredAttack = filterVerifiedReferences(testThreat.mitreAttackIds, validateMitreAttackId);

  if (filteredCwe.length !== 2 || !filteredCwe.includes("CWE-287") || !filteredCwe.includes("CWE-345")) {
    console.error("FAIL: CWE filtering failed:", filteredCwe);
    process.exit(1);
  }
  if (filteredCapec.length !== 1 || filteredCapec[0] !== "CAPEC-115") {
    console.error("FAIL: CAPEC filtering failed:", filteredCapec);
    process.exit(1);
  }
  if (filteredAsvs.length !== 1 || filteredAsvs[0] !== "V2.1.1") {
    console.error("FAIL: ASVS filtering failed:", filteredAsvs);
    process.exit(1);
  }
  if (filteredAttack.length !== 1 || filteredAttack[0] !== "T1190") {
    console.error("FAIL: ATT&CK filtering failed:", filteredAttack);
    process.exit(1);
  }
  console.log("PASS: Offline reference validator verified real IDs and purged all hallucinations.");

  console.log("\nALL PHASE 3 STRIDE MODULE TESTS PASSED!");
}

runStrideTests();
