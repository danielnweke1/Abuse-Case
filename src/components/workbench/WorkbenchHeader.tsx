"use client";

import React from "react";
import { Shield, Cpu, Zap, Sun, Moon } from "lucide-react";

interface HeaderProps {
  title?: string;
  status?: string;
  stage?: string;
  tokensUsed?: number;
  tokenBudget?: number;
  modelSnapshot?: string;
}

export function WorkbenchHeader({
  title = "Abuse Case",
  status = "idle",
  stage = "idle",
  tokensUsed = 0,
  tokenBudget = 60000,
  modelSnapshot = "gpt-4o",
}: HeaderProps) {
  const [theme, setTheme] = React.useState<"dark" | "light">("dark");

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const tokenPercent = Math.min(100, Math.round((tokensUsed / tokenBudget) * 100));

  const getStatusBadge = () => {
    switch (status) {
      case "extracting":
        return <span className="badge badge-info">Extracting Model</span>;
      case "clarifying":
        return <span className="badge badge-medium">Clarification Required</span>;
      case "analyzing":
        return <span className="badge badge-info">Analyzing Threats</span>;
      case "completed":
        return <span className="badge badge-low">Completed</span>;
      case "failed":
        return <span className="badge badge-critical">Failed</span>;
      default:
        return <span className="badge badge-neutral">Ready</span>;
    }
  };

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 20px",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-surface)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Shield size={18} color="var(--accent-text)" />
          <span style={{ fontWeight: 700, fontSize: "14px", letterSpacing: "-0.2px" }}>
            Abuse Case
          </span>
        </div>
        <span style={{ color: "var(--border-strong)" }}>|</span>
        <span
          style={{
            fontWeight: 600,
            fontSize: "13px",
            color: "var(--text-primary)",
            maxWidth: "340px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </span>
        {getStatusBadge()}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Token Budget Gauge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--bg-input)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            padding: "4px 8px",
            fontSize: "11px",
          }}
        >
          <Zap size={12} color="var(--severity-medium-text)" />
          <span className="mono" style={{ color: "var(--text-secondary)" }}>
            Tokens: <strong style={{ color: "var(--text-primary)" }}>{tokensUsed.toLocaleString()}</strong> /{" "}
            {tokenBudget.toLocaleString()} ({tokenPercent}%)
          </span>
          <div
            style={{
              width: "48px",
              height: "4px",
              background: "var(--border-subtle)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${tokenPercent}%`,
                height: "100%",
                background: tokenPercent > 85 ? "var(--severity-critical-border)" : "var(--accent-base)",
              }}
            />
          </div>
        </div>

        {/* Model Snapshot Info */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "var(--bg-input)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            padding: "4px 8px",
            fontSize: "11px",
          }}
        >
          <Cpu size={12} color="var(--text-muted)" />
          <span className="mono" style={{ color: "var(--text-secondary)" }}>
            Model: <span style={{ color: "var(--text-primary)" }}>{modelSnapshot}</span>
          </span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="subtle"
          style={{ padding: "5px 8px" }}
          title="Toggle Dark/Light Mode"
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </header>
  );
}
