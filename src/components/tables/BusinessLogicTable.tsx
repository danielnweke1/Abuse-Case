"use client";

import React, { useState } from "react";
import { GitFork, Terminal, AlertTriangle, ShieldCheck, Zap } from "lucide-react";

export interface BusinessLogicScenarioViewItem {
  id: string;
  workflow: string;
  title: string;
  abuseCategory: string;
  preconditions: string[];
  abuseSequence: string[];
  businessImpact: string;
  impactScore: number;
  likelihoodScore: number;
  detectionSignals: string[];
  mitigations: string[];
  pentestTestCase: string;
}

interface BusinessLogicTableProps {
  scenarios: BusinessLogicScenarioViewItem[];
  selectedScenarioId: string | null;
  onSelectScenario: (scenario: BusinessLogicScenarioViewItem) => void;
  onRunAnalysis?: () => void;
  isRunning?: boolean;
}

export function BusinessLogicTable({
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  onRunAnalysis,
  isRunning,
}: BusinessLogicTableProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const categories = [
    "ALL",
    "Workflow / State Bypass",
    "Race Condition / TOCTOU",
    "IDOR / Authorization Context Flaw",
    "Financial / Pricing Abuse",
    "Replay / Re-entrancy Attack",
    "Rate Limiting / Exhaustion Flaw",
  ];

  const filteredScenarios = scenarios.filter((s) => {
    const matchesCat = categoryFilter === "ALL" || s.abuseCategory === categoryFilter;
    const matchesSearch =
      !searchTerm ||
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.workflow.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.abuseCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.businessImpact.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getSeverityBadge = (impact: number, likelihood: number) => {
    const score = impact * likelihood;
    if (score >= 16) return <span className="badge badge-critical">Critical ({score})</span>;
    if (score >= 12) return <span className="badge badge-high">High ({score})</span>;
    if (score >= 8) return <span className="badge badge-medium">Medium ({score})</span>;
    return <span className="badge badge-low">Low ({score})</span>;
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "Race Condition / TOCTOU":
        return "badge badge-critical";
      case "Workflow / State Bypass":
        return "badge badge-high";
      case "IDOR / Authorization Context Flaw":
        return "badge badge-medium";
      case "Financial / Pricing Abuse":
        return "badge badge-critical";
      case "Replay / Re-entrancy Attack":
        return "badge badge-info";
      default:
        return "badge badge-neutral";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Controls & Filter Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "260px" }}>
          <input
            type="text"
            placeholder="Filter scenarios by title, workflow, or impact..."
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
                {c === "ALL" ? "All Abuse Categories" : c}
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
            <GitFork size={14} />
            <span>{isRunning ? "Modeling Workflows..." : scenarios.length > 0 ? "Re-run Business Logic Modeling" : "Run Business Logic Analysis"}</span>
          </button>
        )}
      </div>

      {/* Scenarios Table */}
      {scenarios.length === 0 ? (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px dashed var(--border-strong)",
            borderRadius: "var(--radius-sm)",
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <GitFork size={28} color="var(--accent-text)" style={{ margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>
            No Business Logic Abuse Scenarios Generated Yet
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", maxWidth: "460px", margin: "0 auto 16px" }}>
            Identify state machine subversions, concurrency flaws (TOCTOU), coupon stacking, multi-step transaction bypasses, and actionable pentest reproduction scripts.
          </p>
          {onRunAnalysis && (
            <button onClick={onRunAnalysis} disabled={isRunning} className="primary" style={{ padding: "8px 18px" }}>
              <span>Execute Business Logic Modeling</span>
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: "9%" }}>ID</th>
                <th style={{ width: "23%" }}>Workflow</th>
                <th style={{ width: "30%" }}>Scenario Title</th>
                <th style={{ width: "16%" }}>Abuse Category</th>
                <th style={{ width: "10%" }}>Risk Score</th>
                <th style={{ width: "12%" }}>Reproduction Steps</th>
              </tr>
            </thead>
            <tbody>
              {filteredScenarios.map((scenario) => {
                const isSelected = selectedScenarioId === scenario.id;
                return (
                  <tr
                    key={scenario.id}
                    onClick={() => onSelectScenario(scenario)}
                    className={isSelected ? "selected" : ""}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="mono" style={{ fontWeight: 600, color: "var(--accent-text)" }}>
                      {scenario.id.includes("_") ? scenario.id.split("_")[1] : scenario.id}
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {scenario.workflow}
                    </td>
                    <td style={{ color: "var(--text-primary)" }}>
                      <div style={{ fontWeight: 500 }}>{scenario.title}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "340px" }}>
                        {scenario.businessImpact}
                      </div>
                    </td>
                    <td>
                      <span className={getCategoryBadgeClass(scenario.abuseCategory)}>
                        {scenario.abuseCategory}
                      </span>
                    </td>
                    <td>{getSeverityBadge(scenario.impactScore, scenario.likelihoodScore)}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className="badge badge-info mono" style={{ fontSize: "11px" }}>
                          {scenario.abuseSequence.length} steps
                        </span>
                        {scenario.pentestTestCase && (
                          <span title="Actionable pentest reproduction script available" style={{ color: "var(--severity-low-text)" }}>
                            <Terminal size={14} />
                          </span>
                        )}
                      </div>
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
