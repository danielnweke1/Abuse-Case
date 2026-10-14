"use client";

import React, { useState, useEffect, useCallback } from "react";
import { WorkbenchHeader } from "@/components/workbench/WorkbenchHeader";
import { Sidebar, type WorkbenchView } from "@/components/workbench/Sidebar";
import { DescriptionForm } from "@/components/input/DescriptionForm";
import { ClarificationView } from "@/components/workbench/ClarificationModal";
import { SystemModelView } from "@/components/workbench/SystemModelView";
import { DfdCanvas } from "@/components/dfd/DfdCanvas";
import { StrideTable, type StrideThreatViewItem } from "@/components/tables/StrideTable";
import { BusinessLogicTable, type BusinessLogicScenarioViewItem } from "@/components/tables/BusinessLogicTable";
import { CveTable } from "@/components/tables/CveTable";
import { RiskRegisterTable, type RiskRegisterViewItem } from "@/components/tables/RiskRegisterTable";
import { InspectorDrawer } from "@/components/workbench/InspectorDrawer";

export default function WorkbenchPage() {
  const [currentView, setCurrentView] = useState<WorkbenchView>("input");
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStrideRunning, setIsStrideRunning] = useState<boolean>(false);
  const [isBusinessLogicRunning, setIsBusinessLogicRunning] = useState<boolean>(false);
  const [isCveRunning, setIsCveRunning] = useState<boolean>(false);
  const [isCalculatingRegister, setIsCalculatingRegister] = useState<boolean>(false);
  const [selectedThreat, setSelectedThreat] = useState<StrideThreatViewItem | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<BusinessLogicScenarioViewItem | null>(null);
  const [activeTabInModel, setActiveTabInModel] = useState<"table" | "dfd">("table");

  // Fetch recent analyses list
  const loadRecentAnalyses = useCallback(async () => {
    try {
      const res = await fetch("/api/analyses");
      if (res.ok) {
        const data = await res.json();
        setRecentAnalyses(data);
      }
    } catch (err) {
      console.error("Failed to load recent analyses:", err);
    }
  }, []);

  useEffect(() => {
    loadRecentAnalyses();
  }, [loadRecentAnalyses]);

  // Load active analysis details
  const loadAnalysis = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/analyses/${id}`);
      if (res.ok) {
        const data = await res.json();
        setAnalysisData(data);
        setActiveAnalysisId(id);

        if (data.clarifyingQuestions?.some((q: any) => q.status === "pending")) {
          setCurrentView("clarifications");
        } else if (data.systemModel && currentView === "input") {
          setCurrentView("model");
        }
      }
    } catch (err) {
      console.error(`Failed to load analysis ${id}:`, err);
    }
  }, [currentView]);

  const handleStartAnalysis = async (description: string, title: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, title }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start analysis");
      }

      await loadRecentAnalyses();
      if (data.id) {
        await loadAnalysis(data.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAnalysis = async (id: string) => {
    try {
      const res = await fetch(`/api/analyses/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (activeAnalysisId === id) {
          setActiveAnalysisId(null);
          setAnalysisData(null);
          setCurrentView("input");
        }
        await loadRecentAnalyses();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to delete project");
      }
    } catch (err) {
      console.error(`Failed to delete analysis ${id}:`, err);
      alert("Failed to delete project");
    }
  };

  const handleRunStride = async () => {
    if (!activeAnalysisId) return;
    setIsStrideRunning(true);
    try {
      const res = await fetch(`/api/analyses/${activeAnalysisId}/stride`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "STRIDE analysis failed");
        return;
      }
      await loadAnalysis(activeAnalysisId);
      setCurrentView("stride");
    } finally {
      setIsStrideRunning(false);
    }
  };

  const handleRunBusinessLogic = async () => {
    if (!activeAnalysisId) return;
    setIsBusinessLogicRunning(true);
    try {
      const res = await fetch(`/api/analyses/${activeAnalysisId}/business-logic`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Business logic analysis failed");
        return;
      }
      await loadAnalysis(activeAnalysisId);
      setCurrentView("business_logic");
    } finally {
      setIsBusinessLogicRunning(false);
    }
  };

  const handleRunCve = async () => {
    if (!activeAnalysisId) return;
    setIsCveRunning(true);
    try {
      const res = await fetch(`/api/analyses/${activeAnalysisId}/cve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "CVE correlation failed");
        return;
      }
      await loadAnalysis(activeAnalysisId);
      setCurrentView("cves");
    } finally {
      setIsCveRunning(false);
    }
  };

  const handleRecalculateRegister = async () => {
    if (!activeAnalysisId) return;
    setIsCalculatingRegister(true);
    try {
      const res = await fetch(`/api/analyses/${activeAnalysisId}/register/calculate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to calculate risk register");
        return;
      }
      await loadAnalysis(activeAnalysisId);
      setCurrentView("register");
    } finally {
      setIsCalculatingRegister(false);
    }
  };

  const handleUpdateRegisterFinding = async (findingId: string, updates: any) => {
    if (!activeAnalysisId) return;
    try {
      const res = await fetch(`/api/analyses/${activeAnalysisId}/register/${findingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        await loadAnalysis(activeAnalysisId);
      }
    } catch (err) {
      console.error("Failed to update finding:", err);
    }
  };

  const handleAnswerQuestion = async (questionId: string, answer: string) => {
    if (!activeAnalysisId) return;
    await fetch(`/api/analyses/${activeAnalysisId}/clarify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, answer }),
    });
    await loadAnalysis(activeAnalysisId);
  };

  const handleSkipQuestion = async (questionId: string) => {
    if (!activeAnalysisId) return;
    await fetch(`/api/analyses/${activeAnalysisId}/clarify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, answer: null }),
    });
    await loadAnalysis(activeAnalysisId);
  };

  const analysis = analysisData?.analysis;
  const systemModel = analysisData?.systemModel;
  const clarifyingQuestions = analysisData?.clarifyingQuestions || [];
  const pendingCount = clarifyingQuestions.filter((q: any) => q.status === "pending").length;
  const strideThreats = analysisData?.strideThreats || [];
  const businessLogicScenarios = analysisData?.businessLogicScenarios || [];
  const cveFindings = analysisData?.cveFindings || [];
  const riskRegister = analysisData?.riskRegister || [];

  const componentsCount =
    (systemModel?.processes?.length || 0) +
    (systemModel?.dataStores?.length || 0) +
    (systemModel?.entities?.length || 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <WorkbenchHeader
        title={analysis?.title || "Abuse Case Workbench"}
        status={analysis?.status || (isLoading ? "extracting" : "idle")}
        stage={analysis?.stage || "idle"}
        tokensUsed={analysis?.totalTokensUsed || 0}
        tokenBudget={analysis?.tokenBudget || 60000}
        modelSnapshot={analysis?.modelSnapshot || "gpt-4o"}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar
          currentView={currentView}
          onSelectView={setCurrentView}
          pendingQuestionsCount={pendingCount}
          componentsCount={componentsCount}
          threatsCount={strideThreats.length}
          logicCount={businessLogicScenarios.length}
          cvesCount={cveFindings.length}
          registerCount={riskRegister.length}
          recentAnalyses={recentAnalyses}
          activeAnalysisId={activeAnalysisId}
          onSelectAnalysis={(id) => loadAnalysis(id)}
          onDeleteAnalysis={handleDeleteAnalysis}
        />

        <main style={{ flex: 1, overflowY: "auto", background: "var(--bg-app)", display: "flex", flexDirection: "column" }}>
          {currentView === "input" && (
            <DescriptionForm onSubmit={handleStartAnalysis} isLoading={isLoading} />
          )}

          {currentView === "clarifications" && (
            <ClarificationView
              questions={clarifyingQuestions}
              onAnswerQuestion={handleAnswerQuestion}
              onSkipQuestion={handleSkipQuestion}
              onProceedToThreats={() => setCurrentView("stride")}
            />
          )}

          {currentView === "model" && systemModel && (
            <div style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => setActiveTabInModel("table")}
                    className={activeTabInModel === "table" ? "primary" : "subtle"}
                    style={{ padding: "6px 12px" }}
                  >
                    <span>Tabular Model</span>
                  </button>
                  <button
                    onClick={() => setActiveTabInModel("dfd")}
                    className={activeTabInModel === "dfd" ? "primary" : "subtle"}
                    style={{ padding: "6px 12px" }}
                  >
                    <span>Data Flow Diagram (DFD)</span>
                  </button>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={handleRunCve}
                    disabled={isCveRunning}
                    className="subtle"
                    style={{ padding: "6px 12px" }}
                  >
                    <span>{isCveRunning ? "Querying CVEs..." : "Query CVEs"}</span>
                  </button>

                  <button
                    onClick={handleRunBusinessLogic}
                    disabled={isBusinessLogicRunning}
                    className="subtle"
                    style={{ padding: "6px 12px" }}
                  >
                    <span>{isBusinessLogicRunning ? "Modeling Logic..." : "Model Business Logic"}</span>
                  </button>

                  <button
                    onClick={handleRunStride}
                    disabled={isStrideRunning}
                    className="subtle"
                    style={{ padding: "6px 12px" }}
                  >
                    <span>{isStrideRunning ? "Analyzing STRIDE..." : "Run STRIDE"}</span>
                  </button>

                  <button
                    onClick={handleRecalculateRegister}
                    disabled={isCalculatingRegister}
                    className="primary"
                    style={{ padding: "6px 14px" }}
                  >
                    <span>{isCalculatingRegister ? "Scoring Risks..." : "Calculate Risk Register"}</span>
                  </button>
                </div>
              </div>

              {activeTabInModel === "table" ? (
                <SystemModelView model={systemModel} />
              ) : (
                <DfdCanvas model={systemModel} />
              )}
            </div>
          )}

          {currentView === "stride" && (
            <div style={{ padding: "24px 20px" }}>
              <div style={{ marginBottom: "16px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                  STRIDE Threat Matrix
                </h2>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  Decomposed threat modeling per trust-boundary-crossing data flow and element group, verified through generate-and-critique passes.
                </p>
              </div>

              <StrideTable
                threats={strideThreats}
                selectedThreatId={selectedThreat?.id || null}
                onSelectThreat={(t) => {
                  setSelectedScenario(null);
                  setSelectedThreat(t);
                }}
                onRunAnalysis={handleRunStride}
                isRunning={isStrideRunning}
              />
            </div>
          )}

          {currentView === "business_logic" && (
            <div style={{ padding: "24px 20px" }}>
              <div style={{ marginBottom: "16px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                  Business Logic & Multi-Step Workflow Abuse Scenarios
                </h2>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  State machine analysis discovering concurrency flaws (TOCTOU), coupon stacking, workflow bypasses, actionable pentest reproduction scripts, and SOC detection signals.
                </p>
              </div>

              <BusinessLogicTable
                scenarios={businessLogicScenarios}
                selectedScenarioId={selectedScenario?.id || null}
                onSelectScenario={(s) => {
                  setSelectedThreat(null);
                  setSelectedScenario(s);
                }}
                onRunAnalysis={handleRunBusinessLogic}
                isRunning={isBusinessLogicRunning}
              />
            </div>
          )}

          {currentView === "cves" && (
            <div style={{ padding: "24px 20px" }}>
              <div style={{ marginBottom: "16px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                  Grounded CVE Vulnerability Correlation
                </h2>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  Real-world vulnerability data queried by CPE from NVD CVE API 2.0 and OSV.dev, enriched with CISA KEV and FIRST EPSS metrics.
                </p>
              </div>

              <CveTable
                cves={cveFindings}
                onRunCorrelation={handleRunCve}
                isRunning={isCveRunning}
              />
            </div>
          )}

          {currentView === "register" && activeAnalysisId && (
            <div style={{ padding: "24px 20px" }}>
              <div style={{ marginBottom: "16px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                  Unified Risk Register & Threat Intelligence
                </h2>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  Normalized risk register synthesizing STRIDE threats, business logic scenarios, and grounded CVE records with deterministic exposure multipliers and full triage lifecycle tracking.
                </p>
              </div>

              <RiskRegisterTable
                analysisId={activeAnalysisId}
                register={riskRegister}
                onRecalculate={handleRecalculateRegister}
                onUpdateFinding={handleUpdateRegisterFinding}
                isCalculating={isCalculatingRegister}
              />
            </div>
          )}
        </main>

        {/* Right Inspector Drawer */}
        {(selectedThreat || selectedScenario) && (
          <InspectorDrawer
            threat={selectedThreat}
            scenario={selectedScenario}
            onClose={() => {
              setSelectedThreat(null);
              setSelectedScenario(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
