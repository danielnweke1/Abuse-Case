"use client";

import React, { useState } from "react";
import { Server, Database, Users, ArrowRightLeft, Shield, Box, CheckCircle2 } from "lucide-react";
import type { ExtractionResult } from "@/lib/llm/schemas/extraction";

interface SystemModelViewProps {
  model: ExtractionResult;
  onSelectComponent?: (comp: any) => void;
}

export function SystemModelView({ model, onSelectComponent }: SystemModelViewProps) {
  const [activeTab, setActiveTab] = useState<"components" | "flows" | "technologies" | "assets" | "assumptions">("components");

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px 20px" }}>
      {/* Overview Banner */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-sm)",
          padding: "16px 20px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
          <div>
            <span className="mono" style={{ fontSize: "11px", color: "var(--text-muted)" }}>SYSTEM MODEL</span>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-primary)" }}>{model.systemName}</h2>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <span className="badge badge-neutral">{model.processes.length} Processes</span>
            <span className="badge badge-neutral">{model.dataStores.length} Stores</span>
            <span className="badge badge-neutral">{model.dataFlows.length} Flows</span>
            <span className="badge badge-info">{model.trustBoundaries.length} Boundaries</span>
          </div>
        </div>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>{model.overview}</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border-subtle)", marginBottom: "16px", gap: "8px" }}>
        {[
          { id: "components", label: "Components & Elements", count: model.processes.length + model.dataStores.length + model.entities.length },
          { id: "flows", label: "Data Flows & Boundaries", count: model.dataFlows.length },
          { id: "technologies", label: "Technology Inventory", count: model.technologies.length },
          { id: "assets", label: "Assets & Data", count: model.assets.length },
          { id: "assumptions", label: "Assumptions", count: model.assumptions.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className="subtle"
            style={{
              borderRadius: "0",
              borderBottom: activeTab === tab.id ? "2px solid var(--accent-base)" : "2px solid transparent",
              color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: activeTab === tab.id ? 600 : 400,
              padding: "8px 12px",
            }}
          >
            <span>{tab.label}</span>
            <span className="mono" style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "4px" }}>
              ({tab.count})
            </span>
          </button>
        ))}
      </div>

      {/* Tab: Components */}
      {activeTab === "components" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Processes */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
              Processes & Services
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "12%" }}>ID</th>
                    <th style={{ width: "24%" }}>Name</th>
                    <th style={{ width: "18%" }}>Technology</th>
                    <th style={{ width: "18%" }}>Trust Domain</th>
                    <th>Function</th>
                  </tr>
                </thead>
                <tbody>
                  {model.processes.map((p) => (
                    <tr key={p.id}>
                      <td className="mono" style={{ color: "var(--accent-text)", fontWeight: 600 }}>{p.id}</td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td className="mono">{p.tech || "—"}</td>
                      <td><span className="badge badge-neutral">{p.trustDomain}</span></td>
                      <td style={{ color: "var(--text-secondary)" }}>{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Data Stores */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
              Data Stores & Storage
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "12%" }}>ID</th>
                    <th style={{ width: "24%" }}>Store Name</th>
                    <th style={{ width: "18%" }}>Technology</th>
                    <th style={{ width: "24%" }}>Data Classes</th>
                    <th>Encrypted at Rest</th>
                  </tr>
                </thead>
                <tbody>
                  {model.dataStores.map((s) => (
                    <tr key={s.id}>
                      <td className="mono" style={{ color: "var(--accent-text)", fontWeight: 600 }}>{s.id}</td>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td className="mono">{s.tech || "—"}</td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {s.dataClasses.map((dc) => (
                            <span key={dc} className="badge badge-info">{dc}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        {s.encryptedAtRest === true && <span className="badge badge-low">Yes</span>}
                        {s.encryptedAtRest === false && <span className="badge badge-critical">No</span>}
                        {s.encryptedAtRest === null && <span className="badge badge-neutral">Unspecified</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* External Entities */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
              External Entities & Users
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "12%" }}>ID</th>
                    <th style={{ width: "24%" }}>Entity Name</th>
                    <th style={{ width: "18%" }}>Type</th>
                    <th style={{ width: "18%" }}>Trust Domain</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {model.entities.map((e) => (
                    <tr key={e.id}>
                      <td className="mono" style={{ color: "var(--accent-text)", fontWeight: 600 }}>{e.id}</td>
                      <td style={{ fontWeight: 600 }}>{e.name}</td>
                      <td><span className="badge badge-neutral">{e.type}</span></td>
                      <td><span className="badge badge-neutral">{e.trustDomain}</span></td>
                      <td style={{ color: "var(--text-secondary)" }}>{e.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Flows & Boundaries */}
      {activeTab === "flows" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
              Identified Trust Boundaries
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
              {model.trustBoundaries.map((b) => (
                <div
                  key={b.id}
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px dashed var(--accent-base)",
                    borderRadius: "var(--radius-sm)",
                    padding: "12px 16px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span className="mono" style={{ color: "var(--accent-text)", fontWeight: 600, fontSize: "11px" }}>
                      {b.id}
                    </span>
                    <span className="badge badge-info">{b.type}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>{b.name}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    Encloses elements: <span className="mono">{b.elementIds.join(", ")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
              Data Flows
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "10%" }}>ID</th>
                    <th style={{ width: "16%" }}>Source</th>
                    <th style={{ width: "16%" }}>Target</th>
                    <th style={{ width: "12%" }}>Protocol</th>
                    <th style={{ width: "22%" }}>Data Transferred</th>
                    <th>Crosses Boundary</th>
                  </tr>
                </thead>
                <tbody>
                  {model.dataFlows.map((f) => (
                    <tr key={f.id}>
                      <td className="mono" style={{ color: "var(--accent-text)", fontWeight: 600 }}>{f.id}</td>
                      <td className="mono">{f.sourceId}</td>
                      <td className="mono">{f.targetId}</td>
                      <td className="mono">{f.protocol || "—"}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{f.dataTransferred}</td>
                      <td>
                        {f.crossesBoundaryId ? (
                          <span className="badge badge-medium">{f.crossesBoundaryId}</span>
                        ) : (
                          <span className="badge badge-neutral">Internal</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Technologies */}
      {activeTab === "technologies" && (
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
            Extracted Technology Inventory (Input to Stage 4 CVE Correlation)
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "25%" }}>Component Name</th>
                  <th style={{ width: "20%" }}>Vendor</th>
                  <th style={{ width: "18%" }}>Detected Version</th>
                  <th style={{ width: "22%" }}>Role in System</th>
                  <th>Extraction Confidence</th>
                </tr>
              </thead>
              <tbody>
                {model.technologies.map((t, idx) => (
                  <tr key={idx}>
                    <td className="mono" style={{ fontWeight: 600, color: "var(--text-primary)" }}>{t.name}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{t.vendor || "—"}</td>
                    <td>
                      {t.version ? (
                        <span className="badge badge-low mono">{t.version}</span>
                      ) : (
                        <span className="badge badge-neutral">Version unstated</span>
                      )}
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>{t.role}</td>
                    <td>
                      <span className={`badge ${t.confidence === "high" ? "badge-low" : t.confidence === "medium" ? "badge-info" : "badge-neutral"}`}>
                        {t.confidence}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Assets */}
      {activeTab === "assets" && (
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
            Critical Assets & Data Classifications
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "12%" }}>Asset ID</th>
                  <th style={{ width: "28%" }}>Name</th>
                  <th style={{ width: "18%" }}>Classification</th>
                  <th>Criticality Justification</th>
                </tr>
              </thead>
              <tbody>
                {model.assets.map((a) => (
                  <tr key={a.id}>
                    <td className="mono" style={{ color: "var(--accent-text)", fontWeight: 600 }}>{a.id}</td>
                    <td style={{ fontWeight: 600 }}>{a.name}</td>
                    <td>
                      <span
                        className={`badge ${
                          a.classification === "restricted"
                            ? "badge-critical"
                            : a.classification === "confidential"
                            ? "badge-high"
                            : a.classification === "internal"
                            ? "badge-medium"
                            : "badge-neutral"
                        }`}
                        style={{ textTransform: "uppercase" }}
                      >
                        {a.classification}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>{a.criticalityReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Assumptions */}
      {activeTab === "assumptions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
            Architectural Assumptions (Visible Gaps)
          </div>
          {model.assumptions.map((assump, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px",
                fontSize: "13px",
              }}
            >
              <CheckCircle2 size={16} color="var(--severity-low-text)" style={{ flexShrink: 0, marginTop: "2px" }} />
              <span style={{ color: "var(--text-primary)" }}>{assump}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
