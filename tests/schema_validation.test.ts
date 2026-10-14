import { ExtractionResultSchema } from "../src/lib/llm/schemas/extraction";
import {
  validateCweId,
  validateCapecId,
  validateAsvsId,
  validateMitreAttackId,
  filterVerifiedReferences,
} from "../src/lib/references/validator";
import fs from "fs";
import path from "path";

function runTests() {
  console.log("=== Running Phase 2 Unit Tests ===");

  // 1. Validate Extraction Output Schema against realistic fixture
  console.log("\n[Test 1] Testing ExtractionResultSchema on realistic fixture...");
  const fixturePath = path.join(__dirname, "fixtures", "extraction_output.json");
  const rawData = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));

  const parsed = ExtractionResultSchema.safeParse(rawData);
  if (!parsed.success) {
    console.error("FAIL: Schema validation failed on valid fixture:", parsed.error.format());
    process.exit(1);
  }
  console.log("PASS: Fixture parsed and strictly validated by Zod.");
  console.log(`  - System Name: ${parsed.data.systemName}`);
  console.log(`  - Processes: ${parsed.data.processes.length}`);
  console.log(`  - Data Stores: ${parsed.data.dataStores.length}`);
  console.log(`  - Trust Boundaries: ${parsed.data.trustBoundaries.length}`);
  console.log(`  - Technologies: ${parsed.data.technologies.length}`);

  // 2. Reject malformed extraction (missing required field, illegal enum value)
  console.log("\n[Test 2] Testing rejection of malformed extraction output...");
  const invalidData = {
    ...rawData,
    assets: [
      {
        id: "ASSET-99",
        name: "Test Asset",
        classification: "SUPER_SECRET_INVALID_ENUM", // Invalid enum
        criticalityReason: "Test",
      },
    ],
  };
  const invalidResult = ExtractionResultSchema.safeParse(invalidData);
  if (invalidResult.success) {
    console.error("FAIL: Schema unexpectedly allowed illegal enum value!");
    process.exit(1);
  }
  console.log("PASS: Correctly rejected illegal enum value.");

  // 3. Test Offline Reference Validator
  console.log("\n[Test 3] Testing offline reference validation for CWE, CAPEC, ASVS, ATT&CK...");

  // Valid CWEs
  const cwe89 = validateCweId("CWE-89");
  if (!cwe89.isValid || !cwe89.name.includes("SQL")) {
    console.error("FAIL: CWE-89 validation failed:", cwe89);
    process.exit(1);
  }

  // Hallucinated CWE
  const cweFake = validateCweId("CWE-99999");
  if (cweFake.isValid) {
    console.error("FAIL: Hallucinated CWE was marked as valid!");
    process.exit(1);
  }

  // Valid CAPEC
  const capec66 = validateCapecId("CAPEC-66");
  if (!capec66.isValid) {
    console.error("FAIL: CAPEC-66 validation failed");
    process.exit(1);
  }

  // Valid ASVS
  const asvs531 = validateAsvsId("V5.3.1");
  if (!asvs531.isValid) {
    console.error("FAIL: ASVS V5.3.1 validation failed");
    process.exit(1);
  }

  // Valid ATT&CK
  const attack1190 = validateMitreAttackId("T1190");
  if (!attack1190.isValid) {
    console.error("FAIL: MITRE ATT&CK T1190 validation failed");
    process.exit(1);
  }

  // Filtering list
  const mixedCwes = ["CWE-89", "CWE-99999", "CWE-79", "HALLUCINATED"];
  const verifiedOnly = filterVerifiedReferences(mixedCwes, validateCweId);
  if (verifiedOnly.length !== 2 || !verifiedOnly.includes("CWE-89") || !verifiedOnly.includes("CWE-79")) {
    console.error("FAIL: Reference filtering dropped valid or kept invalid IDs:", verifiedOnly);
    process.exit(1);
  }
  console.log("PASS: Reference validator correctly approved real IDs and dropped hallucinations.");
  console.log(`  - Verified set: ${JSON.stringify(verifiedOnly)}`);

  console.log("\nALL PHASE 2 UNIT TESTS PASSED SUCCESSFULLY!");
}

runTests();
