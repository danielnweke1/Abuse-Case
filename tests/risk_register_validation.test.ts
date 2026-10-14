import { calculateRiskScore } from "../src/lib/risk/engine";

function runRiskRegisterTests() {
  console.log("=== Running Phase 6 Unified Risk Register & Scoring Tests ===");

  // 1. Base score calculation without modifiers
  console.log("\n[Test 1] Testing base risk calculation without modifiers...");
  const baseResult = calculateRiskScore(3, 3);
  if (baseResult.baseScore !== 9 || baseResult.calculatedScore !== 9.0 || baseResult.severity !== "LOW") {
    console.error("FAIL: Base calculation unexpected:", baseResult);
    process.exit(1);
  }
  console.log(`PASS: Likelihood 3 × Impact 3 = Score ${baseResult.calculatedScore} (${baseResult.severity})`);

  // 2. Modifiers: Internet Exposure (+3.0) and Confidential Asset (+1.5)
  console.log("\n[Test 2] Testing Internet and Confidential asset modifiers...");
  const modResult1 = calculateRiskScore(4, 4, {
    crossesInternetDmz: true,
    hasConfidentialAsset: true,
  });
  // Base 16 + 3.0 + 1.5 = 20.5 -> CRITICAL
  if (modResult1.calculatedScore !== 20.5 || modResult1.severity !== "CRITICAL") {
    console.error("FAIL: Modifiers calculation unexpected:", modResult1);
    process.exit(1);
  }
  console.log(`PASS: Base 16 + 3.0 (Internet) + 1.5 (Confidential) = ${modResult1.calculatedScore} (${modResult1.severity})`);

  // 3. Modifiers: CISA KEV (+4.0) and High EPSS (+2.0)
  console.log("\n[Test 3] Testing CISA KEV and EPSS modifiers...");
  const modResult2 = calculateRiskScore(3, 3, {
    isKev: true,
    epssScore: 0.45,
  });
  // Base 9 + 4.0 (KEV) + 2.0 (EPSS) = 15.0 -> HIGH
  if (modResult2.calculatedScore !== 15.0 || modResult2.severity !== "HIGH") {
    console.error("FAIL: KEV/EPSS calculation unexpected:", modResult2);
    process.exit(1);
  }
  console.log(`PASS: Base 9 + 4.0 (KEV) + 2.0 (EPSS) = ${modResult2.calculatedScore} (${modResult2.severity})`);

  // 4. Maximum score clamping to 25.0
  console.log("\n[Test 4] Testing score clamping to 25.0 ceiling...");
  const maxResult = calculateRiskScore(5, 5, {
    crossesInternetDmz: true,
    isKev: true,
    epssScore: 0.9,
    hasConfidentialAsset: true,
  });
  // Base 25 + 3 + 4 + 2 + 1.5 = 35.5 -> Clamped to 25.0
  if (maxResult.calculatedScore !== 25.0 || maxResult.severity !== "CRITICAL") {
    console.error("FAIL: Clamping failed:", maxResult);
    process.exit(1);
  }
  console.log(`PASS: Score correctly clamped to maximum ${maxResult.calculatedScore} (${maxResult.severity})`);

  // 5. Severity boundaries
  console.log("\n[Test 5] Testing severity rating boundaries...");
  const crit = calculateRiskScore(5, 4); // 20 -> CRITICAL
  const high = calculateRiskScore(4, 4); // 16 -> HIGH
  const med = calculateRiskScore(4, 3); // 12 -> MEDIUM
  const low = calculateRiskScore(3, 2); // 6 -> LOW
  const info = calculateRiskScore(1, 2); // 2 -> INFO

  if (crit.severity !== "CRITICAL" || high.severity !== "HIGH" || med.severity !== "MEDIUM" || low.severity !== "LOW" || info.severity !== "INFO") {
    console.error("FAIL: Severity boundary checks failed:", {
      crit: crit.severity,
      high: high.severity,
      med: med.severity,
      low: low.severity,
      info: info.severity,
    });
    process.exit(1);
  }
  console.log("PASS: All severity rating bands (CRITICAL, HIGH, MEDIUM, LOW, INFO) mapped correctly.");

  console.log("\nALL PHASE 6 RISK REGISTER & SCORING TESTS PASSED!");
}

runRiskRegisterTests();
