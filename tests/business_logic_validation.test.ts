import {
  BusinessLogicBatchResultSchema,
  BusinessLogicCritiqueResultSchema,
} from "../src/lib/llm/schemas/business_logic";
import fs from "fs";
import path from "path";

function runBusinessLogicTests() {
  console.log("=== Running Phase 5 Business Logic Engine Unit Tests ===");

  // 1. Validate BusinessLogicBatchResultSchema on realistic fixture
  console.log("\n[Test 1] Testing BusinessLogicBatchResultSchema on realistic fixture...");
  const fixturePath = path.join(__dirname, "fixtures", "business_logic_output.json");
  const rawFixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));

  const parsed = BusinessLogicBatchResultSchema.safeParse(rawFixture);
  if (!parsed.success) {
    console.error("FAIL: BusinessLogicBatchResultSchema failed on valid fixture:", parsed.error.format());
    process.exit(1);
  }
  console.log(`PASS: Validated ${parsed.data.scenarios.length} Business Logic scenarios against strict schema.`);
  parsed.data.scenarios.forEach((s) => {
    console.log(`  - [${s.abuseCategory}] ${s.id}: ${s.title} (Workflow: ${s.workflow})`);
    console.log(`    Impact: ${s.impactScore}/5 | Likelihood: ${s.likelihoodScore}/5 | Steps: ${s.abuseSequence.length}`);
  });

  // 2. Validate Rejection of Illegal Enums & Bad Ranges
  console.log("\n[Test 2] Testing schema rejection of illegal categories & invalid scores...");
  const badScenario = {
    scenarios: [
      {
        id: "BL-999",
        workflow: "Checkout",
        title: "Invalid Attack",
        abuseCategory: "Generic SQL Injection", // Illegal enum
        preconditions: ["None"],
        abuseSequence: ["Send ' OR 1=1;--"],
        businessImpact: "Data leak",
        impactScore: 10, // Out of range 1-5
        likelihoodScore: 2,
        detectionSignals: ["Error logs"],
        mitigations: ["Use prepared statements"],
        pentestTestCase: "curl http://test",
      },
    ],
  };

  const badParsed = BusinessLogicBatchResultSchema.safeParse(badScenario);
  if (badParsed.success) {
    console.error("FAIL: Schema accepted invalid category enum and out-of-range impactScore!");
    process.exit(1);
  }
  console.log("PASS: Correctly rejected illegal category enum and out-of-range score.");

  // 3. Validate BusinessLogicCritiqueResultSchema
  console.log("\n[Test 3] Testing BusinessLogicCritiqueResultSchema...");
  const mockCritique = {
    approvedScenarioIds: ["BL-001", "BL-002"],
    removedScenarioIds: ["BL-DUPLICATE-99"],
    updatedScenarios: [
      {
        ...parsed.data.scenarios[0],
        title: "Coupon Stacking via Concurrent Multiplexed HTTP/2 Race Condition",
      },
    ],
    addedScenarios: [
      {
        id: "BL-004",
        workflow: "KYC & Identity Verification",
        title: "Document Verification Step Omission via Webhook State Manipulation",
        abuseCategory: "Workflow / State Bypass",
        preconditions: ["Registered user account with pending KYC status"],
        abuseSequence: [
          "User uploads fraudulent ID documents to initiate verification.",
          "Attacker intercepts the client callback and fires forged internal webhook /webhooks/kyc-verified.",
          "Service marks account as 'KYC_APPROVED' without checking cryptographic webhook HMAC signature."
        ],
        businessImpact: "Regulatory fines, illicit money laundering, and sanction violations.",
        impactScore: 5,
        likelihoodScore: 3,
        detectionSignals: [
          "KYC approval timestamp precedes document processing completion log",
          "Webhook event payload received with missing or invalid signature header"
        ],
        mitigations: [
          "Enforce constant-time HMAC-SHA256 signature verification on all incoming KYC provider webhooks",
          "Verify identity status against third-party provider REST API out-of-band before upgrading account tier"
        ],
        pentestTestCase: "curl -X POST https://api.target.local/webhooks/kyc-verified -H 'Content-Type: application/json' -d '{\"userId\":\"usr_attacker\",\"status\":\"VERIFIED\"}'",
      },
    ],
    critiqueSummary: "Approved 2 core workflow abuse scenarios, removed 1 generic duplicate, and added 1 missing KYC webhook bypass scenario.",
  };

  const critiqueParsed = BusinessLogicCritiqueResultSchema.safeParse(mockCritique);
  if (!critiqueParsed.success) {
    console.error("FAIL: BusinessLogicCritiqueResultSchema failed:", critiqueParsed.error.format());
    process.exit(1);
  }
  console.log("PASS: BusinessLogicCritiqueResultSchema successfully validated.");

  console.log("\nALL PHASE 5 BUSINESS LOGIC ENGINE TESTS PASSED!");
}

runBusinessLogicTests();
