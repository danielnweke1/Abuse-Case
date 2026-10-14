"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
  Printer,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Info,
  Edit2,
  X,
  Save,
} from "lucide-react";

export interface RiskRegisterViewItem {
  id: string;
  analysisId: string;
  findingType: "STRIDE" | "BUSINESS_LOGIC" | "CVE";
  findingRefId: string;
  title: string;
  affectedAssetOrComponent: string;
  baseLikelihood: number;
  baseImpact: number;
  calculatedRiskScore: number;
  riskSeverity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  scoringRationale: string;
  userOverrideScore: number | null;
  userOverrideSeverity: string | null;
  userStatus: "open" | "accepted" | "mitigated" | "false_positive" | "needs_verification";
  userNotes: string | null;
  updatedAt: number;
}

interface RiskRegisterTableProps {
  analysisId: string;
  register: RiskRegisterViewItem[];
  onRecalculate: () => void;
  onUpdateFinding: (
    findingId: string,
    updates: {
      userStatus?: string;
      userOverrideScore?: number | null;
      userOverrideSeverity?: string | null;
      userNotes?: string | null;
    }
  ) => Promise<void>;
  isCalculating?: boolean;
}

export function RiskRegisterTable({
  analysisId,
  register,
  onRecalculate,
  onUpdateFinding,
  isCalculating,
}: RiskRegisterTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [editingItem, setEditingItem] = useState<RiskRegisterViewItem | null>(null);
  const [overrideScore, setOverrideScore] = useState<string>("");
  const [overrideSeverity, setOverrideSeverity] = useState<string>("");
  const [overrideStatus, setOverrideStatus] = useState<string>("open");
  const [overrideNotes, setOverrideNotes] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Statistics
  const totalCount = register.length;
  const criticalCount = register.filter((r) => (r.userOverrideSeverity || r.riskSeverity) === "CRITICAL").length;
  const highCount = register.filter((r) => (r.userOverrideSeverity || r.riskSeverity) === "HIGH").length;
  const mediumCount = register.filter((r) => (r.userOverrideSeverity || r.riskSeverity) === "MEDIUM").length;
  const lowCount = register.filter((r) => ["LOW", "INFO"].includes(r.userOverrideSeverity || r.riskSeverity)).length;
  const openCount = register.filter((r) => r.userStatus === "open").length;

  const filteredItems = register.filter((item) => {
    const effectiveSev = item.userOverrideSeverity || item.riskSeverity;
    const matchesType = typeFilter === "ALL" || item.findingType === typeFilter;
    const matchesSev = severityFilter === "ALL" || effectiveSev === severityFilter;
    const matchesStatus = statusFilter === "ALL" || item.userStatus === statusFilter;
    const matchesSearch =
      !searchTerm ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.findingRefId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.affectedAssetOrComponent.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.scoringRationale.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSev && matchesStatus && matchesSearch;
  });

  const getSeverityBadge = (severity: string, score: number) => {
    switch (severity) {
      case "CRITICAL":
        return <span className="badge badge-critical">Critical ({score.toFixed(1)})</span>;
      case "HIGH":
        return <span className="badge badge-high">High ({score.toFixed(1)})</span>;
      case "MEDIUM":
        return <span className="badge badge-medium">Medium ({score.toFixed(1)})</span>;
      case "LOW":
        return <span className="badge badge-low">Low ({score.toFixed(1)})</span>;
      default:
        return <span className="badge badge-neutral">Info ({score.toFixed(1)})</span>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "STRIDE":
        return <span className="badge badge-neutral mono">STRIDE</span>;
      case "BUSINESS_LOGIC":
        return <span className="badge badge-high mono">LOGIC</span>;
      case "CVE":
        return <span className="badge badge-critical mono">CVE</span>;
      default:
        return <span className="badge badge-neutral mono">{type}</span>;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "open":
        return "badge-medium";
      case "mitigated":
        return "badge-low";
      case "accepted":
        return "badge-neutral";
      case "false_positive":
        return "badge-neutral";
      case "needs_verification":
        return "badge-high";
      default:
        return "badge-neutral";
    }
  };

  const handleOpenEdit = (item: RiskRegisterViewItem) => {
    setEditingItem(item);
    setOverrideScore(item.userOverrideScore !== null ? String(item.userOverrideScore) : "");
    setOverrideSeverity(item.userOverrideSeverity || "");
    setOverrideStatus(item.userStatus);
    setOverrideNotes(item.userNotes || "");
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSaving(true);
    try {
      const parsedScore = overrideScore.trim() ? parseFloat(overrideScore) : null;
      await onUpdateFinding(editingItem.id, {
        userStatus: overrideStatus,
        userOverrideScore: parsedScore,
        userOverrideSeverity: overrideSeverity.trim() || null,
        userNotes: overrideNotes.trim() || null,
      });
      setEditingItem(null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Metric Cards Header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Total Findings</div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>{totalCount}</div>
        </div>

        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
          <div style={{ fontSize: "11px", color: "var(--severity-critical-text)", marginBottom: "4px" }}>Critical Risk</div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--severity-critical-text)" }}>{criticalCount}</div>
        </div>

        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
          <div style={{ fontSize: "11px", color: "var(--severity-high-text)", marginBottom: "4px" }}>High Risk</div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--severity-high-text)" }}>{highCount}</div>
        </div>

        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
          <div style={{ fontSize: "11px", color: "var(--severity-medium-text)", marginBottom: "4px" }}>Medium Risk</div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--severity-medium-text)" }}>{mediumCount}</div>
        </div>

        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
          <div style={{ fontSize: "11px", color: "var(--severity-low-text)", marginBottom: "4px" }}>Low / Info</div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--severity-low-text)" }}>{lowCount}</div>
        </div>

        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Open Triage</div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>{openCount}</div>
        </div>
      </div>

      {/* Action Bar & Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "280px" }}>
          <input
            type="text"
            placeholder="Search findings, components, or CVEs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ fontSize: "12px", padding: "6px 10px", width: "100%", maxWidth: "260px" }}
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ fontSize: "12px", padding: "6px 8px" }}
          >
            <option value="ALL">All Types</option>
            <option value="STRIDE">STRIDE Only</option>
            <option value="BUSINESS_LOGIC">Business Logic</option>
            <option value="CVE">CVEs Only</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{ fontSize: "12px", padding: "6px 8px" }}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="INFO">Info</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ fontSize: "12px", padding: "6px 8px" }}
          >
            <option value="ALL">All Statuses</option>
            <option value="open">Open</option>
            <option value="mitigated">Mitigated</option>
            <option value="accepted">Accepted</option>
            <option value="false_positive">False Positive</option>
            <option value="needs_verification">Needs Verification</option>
          </select>
        </div>

        {/* Exporters and Recalculate */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={onRecalculate}
            disabled={isCalculating}
            className="subtle"
            style={{ padding: "6px 10px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
            title="Recalculate unified scores across STRIDE, Business Logic, and CVEs"
          >
            <RefreshCw size={13} className={isCalculating ? "animate-spin" : ""} />
            <span>{isCalculating ? "Calculating..." : "Recalculate"}</span>
          </button>

          <a
            href={`/api/analyses/${analysisId}/export/markdown`}
            download
            className="subtle button"
            style={{ padding: "6px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px", textDecoration: "none" }}
            title="Download executive threat modeling Markdown report"
          >
            <FileText size={13} />
            <span>Markdown</span>
          </a>

          <a
            href={`/api/analyses/${analysisId}/export/csv`}
            download
            className="subtle button"
            style={{ padding: "6px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px", textDecoration: "none" }}
            title="Export CSV for spreadsheets and JIRA import"
          >
            <FileSpreadsheet size={13} />
            <span>CSV</span>
          </a>

          <a
            href={`/api/analyses/${analysisId}/export/json`}
            download
            className="subtle button"
            style={{ padding: "6px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px", textDecoration: "none" }}
            title="Export OWASP Threat Dragon v2 JSON schema"
          >
            <FileCode size={13} />
            <span>Threat Dragon</span>
          </a>

          <button
            onClick={() => window.print()}
            className="subtle"
            style={{ padding: "6px 10px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
            title="Print or save as PDF"
          >
            <Printer size={13} />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      {register.length === 0 ? (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px dashed var(--border-strong)",
            borderRadius: "var(--radius-sm)",
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <ShieldAlert size={28} color="var(--accent-text)" style={{ margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>
            Unified Risk Register Not Yet Calculated
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", maxWidth: "460px", margin: "0 auto 16px" }}>
            Synthesize all findings from STRIDE threat modeling, business logic abuse vectors, and grounded CVE records using deterministic formula scoring.
          </p>
          <button onClick={onRecalculate} disabled={isCalculating} className="primary" style={{ padding: "8px 18px" }}>
            <span>Generate Unified Risk Register</span>
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: "10%" }}>Finding ID</th>
                <th style={{ width: "9%" }}>Type</th>
                <th style={{ width: "27%" }}>Finding Title</th>
                <th style={{ width: "17%" }}>Target / Component</th>
                <th style={{ width: "14%" }}>Risk Score</th>
                <th style={{ width: "13%" }}>Triage Status</th>
                <th style={{ width: "10%" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const effectiveScore = item.userOverrideScore ?? item.calculatedRiskScore;
                const effectiveSeverity = item.userOverrideSeverity ?? item.riskSeverity;
                return (
                  <tr key={item.id}>
                    <td className="mono" style={{ fontWeight: 600, color: "var(--accent-text)", fontSize: "12px" }}>
                      {item.findingRefId}
                    </td>
                    <td>{getTypeBadge(item.findingType)}</td>
                    <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                      <div>{item.title}</div>
                      {item.userNotes && (
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px", fontStyle: "italic" }}>
                          Note: {item.userNotes}
                        </div>
                      )}
                    </td>
                    <td className="mono" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                      {item.affectedAssetOrComponent}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <div>{getSeverityBadge(effectiveSeverity, effectiveScore)}</div>
                        {item.userOverrideScore !== null && (
                          <span style={{ fontSize: "10px", color: "var(--severity-high-text)" }}>Overridden</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <select
                        value={item.userStatus}
                        onChange={(e) => onUpdateFinding(item.id, { userStatus: e.target.value })}
                        className={`badge ${getStatusBadgeClass(item.userStatus)}`}
                        style={{ border: "none", cursor: "pointer", fontSize: "11px", padding: "3px 6px" }}
                      >
                        <option value="open">Open</option>
                        <option value="mitigated">Mitigated</option>
                        <option value="accepted">Accepted</option>
                        <option value="false_positive">False Positive</option>
                        <option value="needs_verification">Needs Verification</option>
                      </select>
                    </td>
                    <td>
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="subtle"
                        style={{ padding: "4px 8px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}
                      >
                        <Edit2 size={12} />
                        <span>Triage</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Triage / Override Modal */}
      {editingItem && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius-md)",
              width: "520px",
              maxWidth: "92vw",
              padding: "24px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span className="mono" style={{ color: "var(--accent-text)", fontWeight: 700, fontSize: "12px" }}>
                    {editingItem.findingRefId}
                  </span>
                  {getTypeBadge(editingItem.findingType)}
                </div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>{editingItem.title}</h3>
              </div>
              <button onClick={() => setEditingItem(null)} className="subtle" style={{ padding: "4px" }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Scoring Rationale */}
              <div
                style={{
                  background: "var(--bg-app)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 12px",
                  fontSize: "12px",
                  lineHeight: "1.45",
                  color: "var(--text-secondary)",
                }}
              >
                <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "2px" }}>Calculated Baseline:</div>
                {editingItem.scoringRationale}
              </div>

              {/* Status Selector */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>
                  Triage Lifecycle Status
                </label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", fontSize: "12px" }}
                >
                  <option value="open">Open (Active Unresolved Risk)</option>
                  <option value="mitigated">Mitigated (Technical Control Deployed)</option>
                  <option value="accepted">Accepted (Business Risk Sign-off)</option>
                  <option value="false_positive">False Positive (Not Applicable to Stack)</option>
                  <option value="needs_verification">Needs Verification (Pending Investigation)</option>
                </select>
              </div>

              {/* Override Score & Severity */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>
                    Override Score (1.0 - 25.0)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="25.0"
                    placeholder={`Default: ${editingItem.calculatedRiskScore.toFixed(1)}`}
                    value={overrideScore}
                    onChange={(e) => setOverrideScore(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", fontSize: "12px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>
                    Override Severity Rating
                  </label>
                  <select
                    value={overrideSeverity}
                    onChange={(e) => setOverrideSeverity(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", fontSize: "12px" }}
                  >
                    <option value="">Default ({editingItem.riskSeverity})</option>
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                    <option value="INFO">INFO</option>
                  </select>
                </div>
              </div>

              {/* Triage / Audit Notes */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>
                  Triage Justification & Audit Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Compensating WAF rule deployed, or risk accepted by AppSec team for Q4 release..."
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", fontSize: "12px", resize: "vertical" }}
                />
              </div>

              {/* Modal Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button onClick={() => setEditingItem(null)} className="subtle" style={{ padding: "6px 14px" }}>
                  Cancel
                </button>
                <button onClick={handleSaveEdit} disabled={isSaving} className="primary" style={{ padding: "6px 16px" }}>
                  <Save size={13} />
                  <span>{isSaving ? "Saving..." : "Save Triage Changes"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
