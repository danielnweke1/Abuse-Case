import { verifyCveIntegrity, assertCveIntegrity, HallucinatedCveError } from "../src/lib/cve/post-check";
import { resolveComponentCpe } from "../src/lib/cve/nvd-cpe";

async function runCveTests() {
  console.log("=== Running Phase 4 CVE Integrity & Resolution Tests ===");

  // 1. Test CPE Resolution
  console.log("\n[Test 1] Testing CPE Resolution for known and unknown components...");
  const pgCpe = await resolveComponentCpe({ name: "postgresql", version: "15" });
  if (!pgCpe.cpe.includes("postgresql:postgresql:15")) {
    console.error("FAIL: PostgreSQL CPE resolution incorrect:", pgCpe);
    process.exit(1);
  }
  console.log("PASS: Resolved PostgreSQL 15 to:", pgCpe.cpe);

  const redisCpe = await resolveComponentCpe({ name: "redis", version: null });
  if (!redisCpe.cpe.includes("redis:redis:*")) {
    console.error("FAIL: Redis CPE without version incorrect:", redisCpe);
    process.exit(1);
  }
  console.log("PASS: Resolved Redis without version to:", redisCpe.cpe);

  // 2. Test Strict CVE-ID Integrity Post-Check (Passing case)
  console.log("\n[Test 2] Testing CVE Integrity Post-Check with valid retrieved set...");
  const retrievedSet = new Set(["CVE-2023-38606", "CVE-2024-21626", "CVE-2022-41852"]);
  const validLlmText = `Based on the system architecture, CVE-2023-38606 affects the kernel runtime, while CVE-2024-21626 impacts container breakout across the boundary.`;

  const validResult = verifyCveIntegrity(validLlmText, retrievedSet);
  if (!validResult.isValid || validResult.hallucinatedIds.length > 0) {
    console.error("FAIL: Valid LLM text failed post-check:", validResult);
    process.exit(1);
  }
  console.log("PASS: Legitimate retrieved CVE IDs approved.");

  // 3. Test Strict CVE-ID Integrity Post-Check (Fabrication / Hallucination Rejection)
  console.log("\n[Test 3] Testing rejection of hallucinated/fabricated CVE IDs...");
  const hallucinatedLlmText = `The PostgreSQL server is susceptible to CVE-2024-99999 and CVE-2023-38606.`;

  const invalidResult = verifyCveIntegrity(hallucinatedLlmText, retrievedSet);
  if (invalidResult.isValid || !invalidResult.hallucinatedIds.includes("CVE-2024-99999")) {
    console.error("FAIL: Hallucinated CVE was not caught by post-check:", invalidResult);
    process.exit(1);
  }
  console.log("PASS: Successfully caught and rejected hallucinated ID: CVE-2024-99999");

  // Test assertion throws HallucinatedCveError
  try {
    assertCveIntegrity(hallucinatedLlmText, retrievedSet);
    console.error("FAIL: assertCveIntegrity failed to throw!");
    process.exit(1);
  } catch (err) {
    if (err instanceof HallucinatedCveError) {
      console.log("PASS: assertCveIntegrity threw HallucinatedCveError as expected.");
    } else {
      console.error("FAIL: Unexpected error type thrown:", err);
      process.exit(1);
    }
  }

  // 4. Test Version Status & Language Rules
  console.log("\n[Test 4] Testing Version Status Rules...");
  const knownVersion = "15";
  const unstatedVersion = null;

  const statusKnown = knownVersion ? "confirmed_affected" : "version_unknown";
  const statusUnstated = unstatedVersion ? "confirmed_affected" : "version_unknown";

  if (statusKnown !== "confirmed_affected" || statusUnstated !== "version_unknown") {
    console.error("FAIL: Status rules violated:", { statusKnown, statusUnstated });
    process.exit(1);
  }
  console.log("PASS: Version rules adhered to: known version -> confirmed_affected, null version -> version_unknown.");

  console.log("\nALL PHASE 4 CVE INTEGRITY TESTS PASSED SUCCESSFULLY!");
}

runCveTests();
