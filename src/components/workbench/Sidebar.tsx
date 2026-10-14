"use client";

import React from "react";
import {
  FileText,
  Layers,
  HelpCircle,
  ShieldAlert,
  GitBranch,
  Bug,
  ClipboardList,
  PlusCircle,
  Clock,
  Trash2,
} from "lucide-react";

export type WorkbenchView =
  | "input"
  | "model"
  | "clarifications"
  | "stride"
  | "business_logic"
  | "cves"
  | "register";

interface SidebarProps {
  currentView: WorkbenchView;
  onSelectView: (view: WorkbenchView) => void;
  pendingQuestionsCount: number;
  componentsCount: number;
  threatsCount: number;
  logicCount: number;
  cvesCount: number;
  registerCount?: number;
  recentAnalyses: Array<{ id: string; title: string; createdAt: number }>;
  activeAnalysisId: string | null;
  onSelectAnalysis: (id: string) => void;
  onDeleteAnalysis?: (id: string) => void;
}

export function Sidebar({
  currentView,
  onSelectView,
  pendingQuestionsCount,
  componentsCount,
  threatsCount,
  logicCount,
  cvesCount,
  registerCount,
  recentAnalyses,
  activeAnalysisId,
  onSelectAnalysis,
  onDeleteAnalysis,
}: SidebarProps) {
  const navItems = [
    {
      id: "model" as WorkbenchView,
      label: "System Model",
      icon: Layers,
      count: componentsCount > 0 ? componentsCount : undefined,
    },
    {
      id: "clarifications" as WorkbenchView,
      label: "Clarifications",
      icon: HelpCircle,
      alertCount: pendingQuestionsCount > 0 ? pendingQuestionsCount : undefined,
    },
    {
      id: "stride" as WorkbenchView,
      label: "STRIDE Threats",
      icon: ShieldAlert,
      count: threatsCount > 0 ? threatsCount : undefined,
    },
    {
      id: "business_logic" as WorkbenchView,
      label: "Business Logic",
      icon: GitBranch,
      count: logicCount > 0 ? logicCount : undefined,
    },
    {
      id: "cves" as WorkbenchView,
      label: "CVE Correlation",
      icon: Bug,
      count: cvesCount > 0 ? cvesCount : undefined,
    },
    {
      id: "register" as WorkbenchView,
      label: "Risk Register",
      icon: ClipboardList,
      count: registerCount && registerCount > 0 ? registerCount : undefined,
    },
  ];

  return (
    <aside
      style={{
        width: "240px",
        minWidth: "240px",
        borderRight: "1px solid var(--border-subtle)",
        background: "var(--bg-sidebar)",
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 49px)",
        overflowY: "auto",
      }}
    >
      {/* Top action: New Analysis */}
      <div style={{ padding: "12px" }}>
        <button
          onClick={() => onSelectView("input")}
          className={currentView === "input" ? "primary" : ""}
          style={{
            width: "100%",
            justifyContent: "flex-start",
            padding: "8px 10px",
            fontSize: "12px",
          }}
        >
          <PlusCircle size={15} />
          <span>New Analysis</span>
        </button>
      </div>

      <div style={{ padding: "0 12px 6px 16px", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        Workbench Sections
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "2px", padding: "0 8px" }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className="subtle"
              style={{
                width: "100%",
                justifyContent: "space-between",
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                background: isActive ? "var(--accent-surface)" : "transparent",
                color: isActive ? "var(--accent-text)" : "var(--text-secondary)",
                fontWeight: isActive ? 600 : 400,
                border: "1px solid transparent",
                borderColor: isActive ? "var(--border-subtle)" : "transparent",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Icon size={14} color={isActive ? "var(--accent-text)" : "var(--text-muted)"} />
                <span>{item.label}</span>
              </div>

              {item.alertCount !== undefined && (
                <span className="badge badge-medium" style={{ fontSize: "10px", padding: "1px 5px" }}>
                  {item.alertCount} open
                </span>
              )}

              {item.count !== undefined && (
                <span className="mono" style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Recent Analyses list */}
      <div style={{ marginTop: "auto", borderTop: "1px solid var(--border-subtle)", padding: "12px 8px" }}>
        <div
          style={{
            padding: "0 8px 8px 8px",
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Clock size={12} />
          <span>Recent Models</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "2px", maxHeight: "160px", overflowY: "auto" }}>
          {recentAnalyses.length === 0 ? (
            <div style={{ padding: "6px 8px", fontSize: "11px", color: "var(--text-muted)" }}>
              No previous analyses
            </div>
          ) : (
            recentAnalyses.map((a) => {
              const isActive = activeAnalysisId === a.id;
              return (
                <div
                  key={a.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderRadius: "var(--radius-xs)",
                    background: isActive ? "var(--bg-surface-elevated)" : "transparent",
                    transition: "background 0.15s ease",
                    padding: "2px 4px",
                    gap: "4px",
                  }}
                >
                  <button
                    onClick={() => onSelectAnalysis(a.id)}
                    className="subtle"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      justifyContent: "flex-start",
                      textAlign: "left",
                      padding: "4px 4px",
                      fontSize: "11px",
                      borderRadius: "var(--radius-xs)",
                      background: "transparent",
                      color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={a.title}
                  >
                    <FileText size={12} style={{ flexShrink: 0, marginRight: "6px" }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.title}
                    </span>
                  </button>

                  {onDeleteAnalysis && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete "${a.title}"?`)) {
                          onDeleteAnalysis(a.id);
                        }
                      }}
                      className="subtle"
                      style={{
                        padding: "4px",
                        background: "transparent",
                        border: "none",
                        color: "var(--text-muted)",
                        borderRadius: "var(--radius-xs)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                        opacity: 0.7,
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "var(--accent-red)";
                        e.currentTarget.style.opacity = "1";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--text-muted)";
                        e.currentTarget.style.opacity = "0.7";
                      }}
                      title={`Delete "${a.title}"`}
                      aria-label={`Delete ${a.title}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}
