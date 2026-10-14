# Abuse Case — Threat Modeling Workbench for Security Professionals

**Abuse Case** is a local-first, production-grade threat modeling and application security workbench. It bridges high-level architectural threat modeling (STRIDE), multi-step state machine exploitation (Business Logic Abuse), and verified external vulnerability intelligence (NVD CVE 2.0, OSV.dev, CISA KEV, FIRST EPSS) into a deterministic, unified risk register.

---

## Key Capabilities & Pipeline Stages

```
                ┌──────────────────────────────────────────────────┐
                │          Target System Description               │
                └─────────────────────────┬────────────────────────┘
                                          ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 1: Extraction & System Model Decomposition                                 │
│ • Deconstructs architecture into Entities, Processes, Stores, Flows, Boundaries  │
│ • Validates reference catalogs against offline CWE, CAPEC, ASVS, ATT&CK datasets │
│ • Targeted clarification modal capped at <= 5 architectural questions            │
└─────────────────────────────────────────┬────────────────────────────────────────┘
                                          │
       ┌──────────────────────────────────┼──────────────────────────────────┐
       ▼                                  ▼                                  ▼
┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
│ STAGE 2: STRIDE Engine  │  │ STAGE 3: Business Logic │  │ STAGE 4: CVE Grounding  │
│ • Balanced 6-category   │  │ • Multi-step workflows  │  │ • NVD CPE resolution    │
│   guarantee via schema  │  │ • Concurrency / TOCTOU  │  │ • NVD 2.0 & OSV.dev     │
│ • Generate + Critique   │  │ • Actionable pentest    │  │ • CISA KEV & EPSS scores│
│ • Interactive React     │  │   scripts (Burp/curl)   │  │ • Zero hallucination    │
│   Flow DFD canvas       │  │ • SIEM detection rules  │  │   post-check gate       │
└────────────┬────────────┘  └────────────┬────────────┘  └────────────┬────────────┘
             │                            │                            │
             └────────────────────────────┼────────────────────────────┘
                                          ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 5: Deterministic Unified Risk Register & Multi-Format Exporters            │
│ • Formula: Likelihood × Impact + Exposure Modifiers (Internet, KEV, EPSS, Assets)│
│ • Triage lifecycle tracking: Open, Mitigated, Accepted, False Positive           │
│ • Exporters: Executive Markdown (.md), CSV (.csv), OWASP Threat Dragon (.json)   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. STRIDE Threat Engine (Stage 2)
- **Schema-Enforced 6-Category Guarantee:** Dedicated JSON schema properties for `spoofingThreats`, `tamperingThreats`, `repudiationThreats`, `informationDisclosureThreats`, `denialOfServiceThreats`, and `elevationOfPrivilegeThreats` prevent category collapse or bias.
- **Reference Catalog Validation:** Every suggested CWE, CAPEC, ASVS, and MITRE ATT&CK technique is deterministically validated against offline lookup tables in `data/references/`. Hallucinated IDs are automatically purged.
- **Interactive DFD:** Visual diagram rendered with `@xyflow/react` showing trust boundaries, processes, stores, and data flows.

## 2. Business Logic Abuse Engine (Stage 3)
- Models multi-step transactions and state machines (checkout settlement, coupon stacking, invoice approval, KYC onboarding, webhook signatures).
- Detects **Race Condition / TOCTOU**, **Workflow / State Bypass**, **IDOR / Authorization Context Flaws**, **Financial / Pricing Abuse**, and **Replay / Re-entrancy Attacks**.
- Provides **actionable penetration testing test cases** (Burp Suite Turbo Intruder scripts, curl request sequences) and **SIEM detection signatures**.

## 3. Grounded CVE Correlation Engine (Stage 4)
- **Zero Hallucination Guarantee:** The LLM is never permitted to synthesize CVE IDs. Queries external feeds via NVD CPE 2.3 matcher, NVD CVE 2.0 API, and OSV.dev.
- **Runtime Post-Check (`assertCveIntegrity`):** Throws `HallucinatedCveError` if any CVE not present in the verified retrieved set appears in output.
- Enriched with **CISA KEV** (Known Exploited Vulnerabilities) and **FIRST EPSS** (Exploit Prediction Scoring System) metrics.

## 4. Deterministic Risk Scoring Formula (Stage 5)
Risk score is computed strictly in TypeScript using deterministic rules:

$$\text{Base Risk} = \text{Likelihood (1–5)} \times \text{Impact (1–5)}$$

$$\text{Architectural Modifiers}:$$
- **$+3.0$** if component or flow crosses an **Internet / DMZ boundary**
- **$+4.0$** if finding is a CVE on **CISA KEV**
- **$+2.0$** if CVE **FIRST EPSS** exploitation probability score $> 0.1$ ($> 10\%$)
- **$+1.5$** for **Confidential or Restricted** data asset involvement

$$\text{Normalized Risk Score} = \min(25.0, \max(1.0, \text{Base Risk} + \sum \text{Modifiers}))$$

| Normalized Score | Severity Rating | SLA / Action |
| :--- | :--- | :--- |
| **20.0 – 25.0** | **CRITICAL** | Production blocker; immediate remediation required |
| **15.0 – 19.9** | **HIGH** | Fix prioritized in active sprint |
| **10.0 – 14.9** | **MEDIUM** | Scheduled in engineering backlog |
| **5.0 – 9.9** | **LOW** | Monitored baseline risk |
| **1.0 – 4.9** | **INFO** | Informational architecture note |

---

## Quickstart & Installation

### Prerequisites
- Node.js 18+ (tested on Node 20+)
- npm or pnpm
- OpenAI API Key

### Setup
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Add your `OPENAI_API_KEY` in `.env.local`. Optionally provide `NVD_API_KEY` for higher rate limits.

3. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running the Automated Test Suite

Run all unit and schema verification tests:
```bash
npm test
```

This runs:
1. `tests/schema_validation.test.ts` (Extraction schema and offline reference catalogs)
2. `tests/stride_validation.test.ts` (STRIDE 6-category schema, critique pass, reference filtering)
3. `tests/cve_integrity.test.ts` (CPE resolution, zero-hallucination post-check, version bounds)
4. `tests/business_logic_validation.test.ts` (State machine schema, illegal enum rejections, critique pass)
5. `tests/risk_register_validation.test.ts` (Deterministic risk formula, modifiers, clamping, severity bands)

---

## Exporters Supported

- **Executive Markdown Report (`.md`):** `GET /api/analyses/[id]/export/markdown`
- **JIRA / Spreadsheet CSV (`.csv`):** `GET /api/analyses/[id]/export/csv`
- **OWASP Threat Dragon v2 (`.json`):** `GET /api/analyses/[id]/export/json`
- **Printable PDF:** Integrated via browser print layout.

---

## Technology Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Local SQLite via native Node.js `node:sqlite` (WAL mode enabled)
- **Diagrams:** `@xyflow/react` (React Flow)
- **Validation:** Zod 3.23 (Structured Outputs with `strict: true`)
- **LLM Client:** OpenAI SDK (pinned to `gpt-4o-2024-08-06`) with token budget safeguards
- **External Feeds:** NVD CPE 2.0, NVD CVE 2.0, OSV.dev, CISA KEV, FIRST EPSS
