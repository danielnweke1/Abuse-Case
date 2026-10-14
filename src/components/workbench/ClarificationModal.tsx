"use client";

import React, { useState } from "react";
import { HelpCircle, Check, FastForward, Info } from "lucide-react";

export interface ClarifyingQuestionItem {
  id: string;
  question: string;
  category: "auth" | "hosting" | "data_sensitivity" | "multi_tenancy" | "integrations";
  suggestedOptions: string[];
  status: "pending" | "answered" | "skipped";
  userAnswer?: string | null;
  recordedAssumption?: string | null;
}

interface ClarificationViewProps {
  questions: ClarifyingQuestionItem[];
  onAnswerQuestion: (questionId: string, answer: string) => Promise<void>;
  onSkipQuestion: (questionId: string) => Promise<void>;
  onProceedToThreats: () => void;
}

export function ClarificationView({
  questions,
  onAnswerQuestion,
  onSkipQuestion,
  onProceedToThreats,
}: ClarificationViewProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const pendingQuestions = questions.filter((q) => q.status === "pending");
  const answeredQuestions = questions.filter((q) => q.status !== "pending");

  const handleSelectOption = (questionId: string, option: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleCustomChange = (questionId: string, val: string) => {
    setCustomInputs((prev) => ({ ...prev, [questionId]: val }));
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: val }));
  };

  const handleSave = async (questionId: string) => {
    const answer = selectedAnswers[questionId] || customInputs[questionId];
    if (!answer || !answer.trim()) return;

    setSubmittingId(questionId);
    try {
      await onAnswerQuestion(questionId, answer.trim());
    } finally {
      setSubmittingId(null);
    }
  };

  const handleSkip = async (questionId: string) => {
    setSubmittingId(questionId);
    try {
      await onSkipQuestion(questionId);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div style={{ maxWidth: "880px", margin: "0 auto", padding: "28px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <HelpCircle size={18} color="var(--severity-medium-text)" />
            <h2 style={{ fontSize: "16px", fontWeight: 700 }}>
              Architecture Clarifications
            </h2>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            {pendingQuestions.length > 0
              ? `${pendingQuestions.length} critical architectural question${pendingQuestions.length > 1 ? "s" : ""} identified. Answering improves threat specificity; skipping records a visible assumption.`
              : "All clarifying questions have been addressed or skipped."}
          </p>
        </div>

        {pendingQuestions.length === 0 && (
          <button onClick={onProceedToThreats} className="primary" style={{ padding: "6px 14px" }}>
            <span>Proceed to STRIDE Analysis</span>
          </button>
        )}
      </div>

      {/* Pending Questions Section */}
      {pendingQuestions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "32px" }}>
          {pendingQuestions.map((q, idx) => {
            const chosen = selectedAnswers[q.id] || "";
            const isSubmitting = submittingId === q.id;

            return (
              <div
                key={q.id}
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="mono" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      Q{idx + 1}
                    </span>
                    <span className="badge badge-info" style={{ textTransform: "capitalize", fontSize: "10px" }}>
                      {q.category.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px" }}>
                  {q.question}
                </div>

                {/* Suggested Options Chips */}
                {q.suggestedOptions && q.suggestedOptions.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                    {q.suggestedOptions.map((opt) => {
                      const isSelected = chosen === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleSelectOption(q.id, opt)}
                          disabled={isSubmitting}
                          style={{
                            fontSize: "12px",
                            padding: "6px 12px",
                            background: isSelected ? "var(--accent-surface)" : "var(--bg-input)",
                            borderColor: isSelected ? "var(--accent-base)" : "var(--border-subtle)",
                            color: isSelected ? "var(--accent-text)" : "var(--text-primary)",
                          }}
                        >
                          {isSelected && <Check size={12} />}
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Custom Answer Input */}
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="Or type custom specification..."
                    value={customInputs[q.id] || (q.suggestedOptions.includes(chosen) ? "" : chosen)}
                    onChange={(e) => handleCustomChange(q.id, e.target.value)}
                    disabled={isSubmitting}
                    style={{ flex: 1, fontSize: "12px", padding: "6px 10px" }}
                  />

                  <button
                    type="button"
                    onClick={() => handleSave(q.id)}
                    disabled={isSubmitting || !chosen.trim()}
                    className="primary"
                    style={{ padding: "6px 12px" }}
                  >
                    <span>Confirm</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSkip(q.id)}
                    disabled={isSubmitting}
                    className="subtle"
                    style={{ padding: "6px 10px" }}
                    title="Skip and adopt standard security assumption"
                  >
                    <FastForward size={13} />
                    <span>Skip</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolved / Skipped Questions Table */}
      {answeredQuestions.length > 0 && (
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "10px", letterSpacing: "0.5px" }}>
            Recorded Architectural Assumptions & Answers
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "25%" }}>Question</th>
                  <th style={{ width: "12%" }}>Status</th>
                  <th style={{ width: "25%" }}>User Answer</th>
                  <th>Recorded Assumption</th>
                </tr>
              </thead>
              <tbody>
                {answeredQuestions.map((q) => (
                  <tr key={q.id}>
                    <td style={{ fontWeight: 500 }}>{q.question}</td>
                    <td>
                      {q.status === "answered" ? (
                        <span className="badge badge-low">Answered</span>
                      ) : (
                        <span className="badge badge-neutral">Skipped</span>
                      )}
                    </td>
                    <td className="mono" style={{ fontSize: "12px" }}>
                      {q.userAnswer || "—"}
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Info size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                        <span>{q.recordedAssumption}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
