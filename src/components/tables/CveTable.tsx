"use client";

import React, { useState } from "react";
import { Bug, ExternalLink, ShieldAlert, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export interface CveFindingViewItem {
  id: string;
  componentId: string;
  componentName: string;
  componentVersion?: string | null;
  cpe?: string | null;
  cveId: string;
  summary: string;
  contextualRelevance: string;
  cvssScore?: number | null;
  cvssVersion?: string | null;
  cvssVector?: string | null;
  epssScore?: number | null;
  epssPercentile?: number | null;
  isKev: number;
  kevDueDate?: string | null;
  status: "confirmed_affected" | "potentially_affected" | "version_unknown";
  affectedVersionRange?: string | null;
  fixedInVersion?: string | null;
  primarySource: "NVD" | "OSV";
  sourceUrl: string;
  retrievedAt: number;
}

interface CveTableProps {
  cves: CveFindingViewItem[];
  onRunCorrelation?: () => void;
  isRunning?: boolean;
}

export function CveTable({ cves, onRunCorrelation, isRunning }: CveTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredCves = cves.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      item.cveId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.componentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getCvssBadge = (score?: number | null, version?: string | null) => {
    if (score === null || score === undefined) {
      return <span className="badge badge-neutral">Unscored</span>;
    }
    const label = `${score.toFixed(1)} ${version ? `(v${version})` : ""}`;
    if (score >= 9.0) return <span className="badge badge-critical">{label}</span>;
    if (score >= 7.0) return <span className="badge badge-high">{label}</span>;
    if (score >= 4.0) return <span className="badge badge-medium">{label}</span>;
    return <span className="badge badge-low">{label}</span>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed_affected":
        return <span className="badge badge-critical">Confirmed Affected</span>;
      case "potentially_affected":
        return <span className="badge badge-medium">Potentially Affected</span>;
      case "version_unknown":
      default:
        return <span className="badge badge-neutral">Version Unknown</span>;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Search and Action Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "260px" }}>
          <input
            type="text"
            placeholder="Filter CVEs by ID, component, or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ fontSize: "12px", padding: "6px 10px", width: "100%", maxWidth: "340px" }}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ fontSize: "12px", padding: "6px 10px" }}
          >
            <option value="ALL">All Statuses</option>
            <option value="confirmed_affected">Confirmed Affected</option>
            <option value="potentially_affected">Potentially Affected</option>
            <option value="version_unknown">Version Unknown</option>
          </select>
        </div>

        {onRunCorrelation && (
          <button
            onClick={onRunCorrelation}
            disabled={isRunning}
            className="primary"
            style={{ padding: "6px 14px", fontSize: "12px" }}
          >
            <Bug size={14} />
            <span>{isRunning ? "Querying CVEs..." : cves.length > 0 ? "Refresh CVE Data" : "Query CVE Data"}</span>
          </button>
        )}
      </div>

      {cves.length === 0 ? (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px dashed var(--border-strong)",
            borderRadius: "var(--radius-sm)",
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <Bug size={28} color="var(--accent-text)" style={{ margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>
            No Grounded CVEs Retrieved Yet
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", maxWidth: "480px", margin: "0 auto 16px" }}>
            Query real-world vulnerability data from the NVD CVE API 2.0 and OSV.dev based on the extracted technology inventory. All CVEs are grounded in external catalogs with zero generative hallucination.
          </p>
          {onRunCorrelation && (
            <button onClick={onRunCorrelation} disabled={isRunning} className="primary" style={{ padding: "8px 18px" }}>
              <span>Execute CVE Lookup</span>
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: "16%" }}>Component</th>
                <th style={{ width: "14%" }}>CVE ID</th>
                <th style={{ width: "14%" }}>Status</th>
                <th style={{ width: "12%" }}>CVSS Severity</th>
                <th style={{ width: "10%" }}>EPSS Probability</th>
                <th style={{ width: "12%" }}>CISA KEV</th>
                <th>Contextual Exposure & Summary</th>
              </tr>
            </thead>
            <tbody>
              {filteredCves.map((cve) => (
                <tr key={cve.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{cve.componentName}</div>
                    <div className="mono" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {cve.componentVersion ? `v${cve.componentVersion}` : "version unstated"}
                    </div>
                  </td>
                  <td>
                    <a
                      href={cve.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mono"
                      style={{
                        color: "var(--accent-text)",
                        textDecoration: "none",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span>{cve.cveId}</span>
                      <ExternalLink size={11} />
                    </a>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                      Source: {cve.primarySource}
                    </div>
                  </td>
                  <td>{getStatusBadge(cve.status)}</td>
                  <td>{getCvssBadge(cve.cvssScore, cve.cvssVersion)}</td>
                  <td>
                    {cve.epssScore !== null && cve.epssScore !== undefined ? (
                      <div>
                        <span className="mono" style={{ fontWeight: 600, color: cve.epssScore > 0.1 ? "var(--severity-high-text)" : "var(--text-primary)" }}>
                          {(cve.epssScore * 100).toFixed(1)}%
                        </span>
                        {cve.epssPercentile && (
                          <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                            {Math.round(cve.epssPercentile * 100)}th pct
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="mono" style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  <td>
                    {cve.isKev === 1 ? (
                      <span className="badge badge-critical" title={`Due Date: ${cve.kevDueDate || "N/A"}`}>
                        Active Exploit
                      </span>
                    ) : (
                      <span className="badge badge-neutral" style={{ fontSize: "10px" }}>No KEV</span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 500, marginBottom: "4px" }}>
                      {cve.contextualRelevance}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                      {cve.summary}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", fontSize: "10px", color: "var(--text-muted)" }}>
                      <Clock size={11} />
                      <span>Retrieved: {new Date(cve.retrievedAt).toLocaleDateString()}</span>
                      {cve.fixedInVersion && (
                        <span className="badge badge-low mono" style={{ fontSize: "10px" }}>
                          Fix: v{cve.fixedInVersion}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
