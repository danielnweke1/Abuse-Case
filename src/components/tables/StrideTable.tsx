"use client";

import React, { useState } from "react";
import { ShieldAlert, Filter, ArrowUpDown } from "lucide-react";

export interface StrideThreatViewItem {
  id: string;
  title: string;
  strideCategory: string;
  affectedElementId: string;
  affectedElementType: string;
  trustBoundaryId?: string | null;
  attackerPrecondition: string;
  attackNarrative: string;
  impact: number;
  impactRationale: string;
  likelihood: number;
  likelihoodRationale: string;
  existingControls: string[];
  recommendedMitigations: string[];
  cweIds: string[];
  capecIds: string[];
  asvsIds: string[];
  mitreAttackIds: string[];
  confidence: string;
  basis: string;
}

interface StrideTableProps {
  threats: StrideThreatViewItem[];
  selectedThreatId: string | null;
  onSelectThreat: (threat: StrideThreatViewItem) => void;
  onRunAnalysis?: () => void;
  isRunning?: boolean;
}

export function StrideTable({
  threats,
  selectedThreatId,
  onSelectThreat,
  onRunAnalysis,
  isRunning,
}: StrideTableProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const categories = [
    "ALL",
    "Spoofing",
    "Tampering",
    "Repudiation",
    "Information Disclosure",
    "Denial of Service",
    "Elevation of Privilege",
  ];

  const filteredThreats = threats.filter((t) => {
    const matchesCat = categoryFilter === "ALL" || t.strideCategory === categoryFilter;
    const matchesSearch =
      !searchTerm ||
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.affectedElementId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.cweIds.some((cwe) => cwe.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const getSeverityBadge = (impact: number, likelihood: number) => {
    const score = impact * likelihood;
    if (score >= 16) return <span className="badge badge-critical">Critical ({score})</span>;
    if (score >= 12) return <span className="badge badge-high">High ({score})</span>;
    if (score >= 8) return <span className="badge badge-medium">Medium ({score})</span>;
    return <span className="badge badge-low">Low ({score})</span>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Controls & Filter Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "260px" }}>
          <input
            type="text"
            placeholder="Filter threats by title, element, or CWE..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ fontSize: "12px", padding: "6px 10px", width: "100%", maxWidth: "340px" }}
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ fontSize: "12px", padding: "6px 10px" }}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "ALL" ? "All Categories" : c}
              </option>
            ))}
          </select>
        </div>

        {onRunAnalysis && (
          <button
            onClick={onRunAnalysis}
            disabled={isRunning}
            className="primary"
            style={{ padding: "6px 14px", fontSize: "12px" }}
          >
            <ShieldAlert size={14} />
            <span>{isRunning ? "Analyzing STRIDE..." : threats.length > 0 ? "Re-run STRIDE Analysis" : "Run STRIDE Analysis"}</span>
          </button>
        )}
      </div>

      {/* Threats Table */}
      {threats.length === 0 ? (
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
            No STRIDE Threats Analyzed Yet
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", maxWidth: "440px", margin: "0 auto 16px" }}>
            The system model has been decomposed into elements and boundary-crossing data flows. Click below to execute decomposed STRIDE generation and critique.
          </p>
          {onRunAnalysis && (
            <button onClick={onRunAnalysis} disabled={isRunning} className="primary" style={{ padding: "8px 18px" }}>
              <span>Execute STRIDE Pipeline</span>
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: "11%" }}>Threat ID</th>
                <th style={{ width: "28%" }}>Title</th>
                <th style={{ width: "16%" }}>STRIDE Category</th>
                <th style={{ width: "14%" }}>Target Element</th>
                <th style={{ width: "11%" }}>Risk Score</th>
                <th style={{ width: "12%" }}>Verified CWEs</th>
                <th>Mitigations</th>
              </tr>
            </thead>
            <tbody>
              {filteredThreats.map((threat) => {
                const isSelected = selectedThreatId === threat.id;
                return (
                  <tr
                    key={threat.id}
                    onClick={() => onSelectThreat(threat)}
                    className={isSelected ? "selected" : ""}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="mono" style={{ fontWeight: 600, color: "var(--accent-text)" }}>
                      {threat.id}
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{threat.title}</td>
                    <td>
                      <span className="badge badge-neutral">{threat.strideCategory}</span>
                    </td>
                    <td className="mono" style={{ fontSize: "11px" }}>
                      {threat.affectedElementId}
                    </td>
                    <td>{getSeverityBadge(threat.impact, threat.likelihood)}</td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {threat.cweIds.length > 0 ? (
                          threat.cweIds.map((cwe) => (
                            <span key={cwe} className="badge badge-info mono" style={{ fontSize: "10px" }}>
                              {cwe}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>—</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                        {threat.recommendedMitigations.length} items
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
