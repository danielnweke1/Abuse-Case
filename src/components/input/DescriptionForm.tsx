"use client";

import React, { useState } from "react";
import { Play, FileText, AlertCircle, ShieldCheck, Sparkles, Cpu, Activity, Terminal } from "lucide-react";

interface DescriptionFormProps {
  onSubmit: (description: string, title: string) => Promise<void>;
  isLoading: boolean;
}

const SAMPLE_ARCHITECTURES = [
  {
    id: "omnipay",
    name: "FinTech: OmniPay",
    icon: Sparkles,
    title: "OmniPay Payment Orchestration Gateway",
    description: `OmniPay is a multi-tenant B2B payment orchestration gateway deployed on AWS ECS.

Architecture & Components:
- Public-facing Next.js 14 Merchant Dashboard hosted behind Cloudflare and AWS ALB.
- Core Payment API Service written in Go (Gin) exposing authenticated REST endpoints for merchants.
- Background Worker Service in Node.js (BullMQ + Redis 7) handling async webhook dispatch and reconciliation jobs.
- Primary Database: PostgreSQL 15 (RDS Aurora) storing merchant accounts, API keys, customer cards (tokenized), and transaction ledgers.
- In-memory Cache & Rate Limiter: Redis 7 cluster.
- Object Storage: AWS S3 storing exportable financial audit statements and invoice PDFs.

Authentication & Access:
- Merchant Portal uses OAuth2 / OIDC with Session Cookies (JWT stored in HttpOnly cookie).
- Core Payment API uses HMAC-SHA256 merchant API keys and signed bearer tokens.
- Internal services communicate over mutual TLS (mTLS) within an internal VPC private subnet.

Data Handled & Integrations:
- Cardholder metadata, customer billing addresses, transaction volumes, bank account tokens.
- Third-party integrations: Stripe API for credit card settlement, Plaid API for bank account verification, SendGrid for transactional email receipts, and external merchant webhooks over HTTPS.`,
  },
  {
    id: "aerodrop",
    name: "IoT / Drone: AeroDrop",
    icon: Cpu,
    title: "AeroDrop Fleet Orchestration Platform",
    description: `AeroDrop is an autonomous commercial drone delivery and airspace management platform.

Architecture & Components:
- Edge Drone Hardware: Ubuntu Core 22.04 running ROS2 (Robot Operating System) with embedded cellular 5G modems and GPS/RTK navigation.
- Real-Time Telemetry Ingestion: High-throughput Go gateway communicating with drones over mutual TLS (mTLS) via MQTT on AWS IoT Core.
- Flight Dispatch & Airspace Management API: Python (FastAPI 0.100.0) handling flight path planning, FAA airspace clearance, and remote pilot controls.
- Web Management Console: React 18 frontend communicating via WebSockets for live telemetry map tracking and mission abort triggers.
- Storage: TimescaleDB for high-frequency GPS/battery telemetry logs and PostgreSQL 15 for customer delivery orders, flight authorizations, and drone certificates.
- Cache & Event Stream: Redis 7 Streams for immediate waypoint message buffering.
- Locker Stations: Smart ground locker drop boxes connected via BLE and HTTPS REST API for automated package release upon drone touchdown.

Access Control & Integrations:
- Drones authenticate via X.509 device certificates installed at factory provisioning.
- Ground station pilots authenticate via OIDC / Okta SSO with mandatory FIDO2 WebAuthn.
- Third-Party Integrations: OpenSky Network API for commercial air traffic alerts, SendGrid for delivery notifications, and Stripe for customer billing.`,
  },
  {
    id: "pulsevault",
    name: "Healthcare: PulseVault",
    icon: Activity,
    title: "PulseVault Telehealth & Clinical EHR",
    description: `PulseVault is a multi-tenant cloud EHR and telemedicine SaaS connecting patients, clinicians, and licensed pharmacies.

Architecture & Components:
- Web & Mobile Clients: Next.js 14 web application for clinical staff and React Native mobile app for patients.
- Core Clinical API: Node.js (Express 4.18.2) behind an AWS Application Load Balancer and AWS WAF.
- Telehealth Video Service: WebRTC media server running LiveKit on Docker with end-to-end media encryption.
- Background Job Engine: Python Celery workers with RabbitMQ 3.12 managing prescription routing and insurance eligibility verification.
- Primary Database: PostgreSQL 16 on AWS RDS with column-level encryption (pgcrypto) for patient Protected Health Information (PHI) and clinical visit notes.
- Object Storage: AWS S3 with KMS CMK encryption storing DICOM medical imaging scans and lab result PDFs.
- Cache: Redis 6.2 for clinical session state.

Access Control & Integrations:
- Role-Based Access Control (RBAC): Clinician, Nurse, Patient, Billing Admin, and Pharmacist.
- Authentication: JWT tokens signed with RS256 with 15-minute expiration; biometric passkeys on mobile.
- External Integrations: Surescripts API for digital e-prescriptions, Change Healthcare for insurance claim eligibility, and Twilio for SMS appointment reminders.`,
  },
  {
    id: "codesphere",
    name: "AI Sandbox: CodeSphere",
    icon: Terminal,
    title: "CodeSphere AI Code Agent Sandbox",
    description: `CodeSphere is an AI-powered software engineering platform that autonomously writes, tests, and executes code in multi-tenant cloud environments.

Architecture & Components:
- Web IDE: Next.js 14 frontend integrating Monaco Editor and xterm.js over WebSockets.
- Orchestrator API: Go microservice deployed on AWS EKS managing user workspaces, project git repositories, and LLM orchestration.
- Code Execution Engine: Multi-tenant Kubernetes cluster utilizing gVisor runtime sandboxes with strict CPU, memory, and cgroup limits to run untrusted user code.
- Vector Database: Qdrant cluster storing code embeddings for semantic repository retrieval.
- Primary Database: PostgreSQL 16 (AWS RDS) storing user projects, GitHub OAuth tokens, and workspace logs.
- Object Storage: AWS S3 storing workspace snapshots and build artifacts.

Access Control & Integrations:
- User Authentication: GitHub OAuth 2.0 app with repo permissions.
- LLM Gateway: Internal Python proxy interfacing with OpenAI API (GPT-4o) and Anthropic API (Claude 3.5 Sonnet) with token billing counters.
- Network Policies: Calico CNI rules intended to prevent untrusted sandbox containers from reaching the AWS IMDS metadata service (169.254.169.254) or internal cluster services.`,
  },
];

export function DescriptionForm({ onSubmit, isLoading }: DescriptionFormProps) {
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectSample = (sample: typeof SAMPLE_ARCHITECTURES[0]) => {
    setTitle(sample.title);
    setDescription(sample.description);
    setSelectedSampleId(sample.id);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please provide an application description before analyzing.");
      return;
    }
    setError(null);
    try {
      await onSubmit(description, title.trim() || "Target Application");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis initiation failed");
    }
  };

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "32px 24px" }}>
      {/* Workbench Subtitle / Direct Instructions */}
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
          Target System Description
        </h1>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
          Describe your application architecture, components, data flows, trust boundaries, user roles, and integrations in plain text.
          The workbench infers system elements, STRIDE threats, business logic abuse vectors, and correlated CVEs.
        </p>
      </div>

      {/* Quick-Load Realistic Sample Architectures */}
      <div style={{ marginBottom: "18px" }}>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
          Quick-Load Realistic Architecture Presets
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {SAMPLE_ARCHITECTURES.map((sample) => {
            const Icon = sample.icon;
            const isSelected = selectedSampleId === sample.id;
            return (
              <button
                key={sample.id}
                type="button"
                onClick={() => handleSelectSample(sample)}
                disabled={isLoading}
                className={isSelected ? "primary" : "subtle"}
                style={{
                  fontSize: "12px",
                  padding: "6px 12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                }}
              >
                <Icon size={13} />
                <span>{sample.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: "6px",
            }}
          >
            System / Project Name
          </label>
          <input
            type="text"
            placeholder="e.g. Acme Core Banking API, OmniPay Gateway"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSelectedSampleId(null);
            }}
            disabled={isLoading}
            style={{ width: "100%", fontSize: "13px" }}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: "6px",
            }}
          >
            Application Architecture & Details
          </label>

          <textarea
            rows={14}
            placeholder="Describe components (e.g. Web frontend, API gateway, databases), authentication model, data sensitivity, trust boundaries, third-party services, and deployment environment..."
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setSelectedSampleId(null);
            }}
            disabled={isLoading}
            style={{
              width: "100%",
              resize: "vertical",
              fontSize: "13px",
              lineHeight: "1.5",
              fontFamily: "var(--font-mono)",
            }}
          />
        </div>

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--severity-critical-bg)",
              border: "1px solid var(--severity-critical-border)",
              color: "var(--severity-critical-text)",
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              fontSize: "12px",
            }}
          >
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px" }}>
          {/* Privacy & Zero-Telemetry notice */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11px",
              color: "var(--text-muted)",
              maxWidth: "520px",
            }}
          >
            <ShieldCheck size={14} color="var(--severity-low-text)" style={{ flexShrink: 0 }} />
            <span>
              Zero telemetry. Sensitive system descriptions leave this server solely to query OpenAI GPT-4o and external vulnerability catalogs.
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading || !description.trim()}
            className="primary"
            style={{ padding: "8px 20px", fontSize: "13px" }}
          >
            <Play size={14} fill="currentColor" />
            <span>{isLoading ? "Analyzing..." : "Start Threat Analysis"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
