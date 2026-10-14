"use client";

import React, { useState } from "react";
import { X, ExternalLink, CheckCircle, Terminal, Copy, Check, GitFork, AlertTriangle, ShieldAlert, Activity } from "lucide-react";
import type { StrideThreatViewItem } from "../tables/StrideTable";
import type { BusinessLogicScenarioViewItem } from "../tables/BusinessLogicTable";

interface InspectorDrawerProps {
  threat?: StrideThreatViewItem | null;
  scenario?: BusinessLogicScenarioViewItem | null;
  onClose: () => void;
}

export function InspectorDrawer({ threat, scenario, onClose }: InspectorDrawerProps) {
  const [copied, setCopied] = useState(false);

  if (!threat && !scenario) return null;

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSeverityBadge = (impact: number, likelihood: number) => {
    const score = impact * likelihood;
    if (score >= 16) return <span className="badge badge-critical">Critical ({score})</span>;
    if (score >= 12) return <span className="badge badge-high">High ({score})</span>;
    if (score >= 8) return <span className="badge badge-medium">Medium ({score})</span>;
    return <span className="badge badge-low">Low ({score})</span>;
  };

  // Render Business Logic Scenario Inspector
  if (scenario) {
    const displayId = scenario.id.includes("_") ? scenario.id.split("_")[1] : scenario.id;
    return (
      <div
        style={{
          width: "440px",
          minWidth: "440px",
          height: "100%",
          borderLeft: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          zIndex: 20,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "16px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span className="mono" style={{ fontWeight: 700, color: "var(--accent-text)", fontSize: "12px" }}>
                {displayId}
              </span>
              <span className="badge badge-neutral">{scenario.abuseCategory}</span>
              {getSeverityBadge(scenario.impactScore, scenario.likelihoodScore)}
            </div>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", lineHeight: "1.35" }}>
              {scenario.title}
            </h3>
          </div>
          <button onClick={onClose} className="subtle" style={{ padding: "4px" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Workflow Target Banner */}
          <div
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 12px",
              fontSize: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ color: "var(--text-muted)" }}>Target Workflow:</span>
              <span className="mono" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                {scenario.workflow}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Abuse Vector:</span>
              <span className="badge badge-info">{scenario.abuseCategory}</span>
            </div>
          </div>

          {/* Business Impact Card */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>
              Direct Business Impact
            </div>
            <div
              style={{
                background: "var(--bg-app)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 12px",
                fontSize: "12px",
                lineHeight: "1.5",
                color: "var(--text-primary)",
              }}
            >
              {scenario.businessImpact}
            </div>
          </div>

          {/* Preconditions */}
          {scenario.preconditions && scenario.preconditions.length > 0 && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>
                Attacker Preconditions
              </div>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                {scenario.preconditions.map((prec, i) => (
                  <li key={i} style={{ marginBottom: "4px" }}>{prec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Abuse Sequence */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
              Multi-Step State Machine Abuse Sequence
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {scenario.abuseSequence.map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    background: "var(--bg-app)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    padding: "8px 10px",
                    fontSize: "12px",
                    lineHeight: "1.4",
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      background: "var(--accent-primary)",
                      color: "#fff",
                      fontSize: "10px",
                      fontWeight: 700,
                      borderRadius: "10px",
                      padding: "1px 6px",
                      flexShrink: 0,
                      marginTop: "1px",
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span style={{ color: "var(--text-primary)" }}>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actionable Pentest Reproduction Script */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Pentest Reproduction Script / Test Case
              </div>
              <button
                onClick={() => handleCopyCode(scenario.pentestTestCase)}
                className="subtle"
                style={{ padding: "2px 8px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}
              >
                {copied ? <Check size={12} color="var(--severity-low-text)" /> : <Copy size={12} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <pre
              className="mono"
              style={{
                background: "var(--bg-app)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "12px",
                fontSize: "11px",
                lineHeight: "1.45",
                color: "var(--text-primary)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                maxHeight: "260px",
                overflowY: "auto",
              }}
            >
              {scenario.pentestTestCase}
            </pre>
          </div>

          {/* SOC & SIEM Detection Signals */}
          {scenario.detectionSignals && scenario.detectionSignals.length > 0 && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>
                SIEM & Log Detection Signals
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {scenario.detectionSignals.map((signal, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      fontSize: "12px",
                      lineHeight: "1.4",
                      background: "var(--bg-app)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      padding: "8px 10px",
                    }}
                  >
                    <Activity size={14} color="var(--severity-high-text)" style={{ flexShrink: 0, marginTop: "2px" }} />
                    <span style={{ color: "var(--text-secondary)" }}>{signal}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remediations & Mitigations */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>
              State Machine Mitigations
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {scenario.mitigations.map((mitigation, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "12px",
                    lineHeight: "1.4",
                    background: "var(--bg-app)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    padding: "8px 10px",
                  }}
                >
                  <CheckCircle size={14} color="var(--severity-low-text)" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <span style={{ color: "var(--text-primary)" }}>{mitigation}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render STRIDE Threat Inspector
  if (threat) {
    return (
      <div
        style={{
          width: "440px",
          minWidth: "440px",
          height: "100%",
          borderLeft: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          zIndex: 20,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "16px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span className="mono" style={{ fontWeight: 700, color: "var(--accent-text)", fontSize: "12px" }}>
                {threat.id}
              </span>
              <span className="badge badge-neutral">{threat.strideCategory}</span>
              <span className="badge badge-info">{threat.confidence} confidence</span>
            </div>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", lineHeight: "1.35" }}>
              {threat.title}
            </h3>
          </div>
          <button onClick={onClose} className="subtle" style={{ padding: "4px" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Component & Boundary Context */}
          <div
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 12px",
              fontSize: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ color: "var(--text-muted)" }}>Target Element:</span>
              <span className="mono" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                {threat.affectedElementId} ({threat.affectedElementType})
              </span>
            </div>
            {threat.trustBoundaryId && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Boundary Crossed:</span>
                <span className="badge badge-medium mono">{threat.trustBoundaryId}</span>
              </div>
            )}
          </div>

          {/* Attack Narrative */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>
              Attack Narrative
            </div>
            <div
              style={{
                background: "var(--bg-app)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 12px",
                fontSize: "12px",
                lineHeight: "1.5",
                color: "var(--text-primary)",
              }}
            >
              {threat.attackNarrative}
            </div>
          </div>

          {/* Attacker Precondition */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>
              Attacker Precondition
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
              {threat.attackerPrecondition}
            </div>
          </div>

          {/* Scoring Breakdown & Rationales */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div
              style={{
                background: "var(--bg-app)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "10px",
              }}
            >
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>Impact Score</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>{threat.impact} / 5</div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                {threat.impactRationale}
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-app)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "10px",
              }}
            >
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>Likelihood</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>{threat.likelihood} / 5</div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                {threat.likelihoodRationale}
              </div>
            </div>
          </div>

          {/* Recommended Mitigations */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>
              Recommended Technical Mitigations
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {threat.recommendedMitigations.map((mitigation, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "12px",
                    lineHeight: "1.4",
                    background: "var(--bg-app)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    padding: "8px 10px",
                  }}
                >
                  <CheckCircle size={14} color="var(--severity-low-text)" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <span>{mitigation}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Verified References */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>
              Verified References (Validated Against Catalog)
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {threat.cweIds.map((cwe) => (
                <a
                  key={cwe}
                  href={`https://cwe.mitre.org/data/definitions/${cwe.replace("CWE-", "")}.html`}
                  target="_blank"
                  rel="noreferrer"
                  className="badge badge-info mono"
                  style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <span>{cwe}</span>
                  <ExternalLink size={10} />
                </a>
              ))}

              {threat.capecIds.map((capec) => (
                <a
                  key={capec}
                  href={`https://capec.mitre.org/data/definitions/${capec.replace("CAPEC-", "")}.html`}
                  target="_blank"
                  rel="noreferrer"
                  className="badge badge-medium mono"
                  style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <span>{capec}</span>
                  <ExternalLink size={10} />
                </a>
              ))}

              {threat.asvsIds.map((asvs) => (
                <span key={asvs} className="badge badge-low mono">
                  ASVS {asvs}
                </span>
              ))}

              {threat.mitreAttackIds.map((att) => (
                <a
                  key={att}
                  href={`https://attack.mitre.org/techniques/${att}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="badge badge-critical mono"
                  style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <span>ATT&CK {att}</span>
                  <ExternalLink size={10} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
