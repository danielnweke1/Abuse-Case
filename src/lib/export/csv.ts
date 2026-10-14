import { db } from "@/db";

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportAnalysisToCsv(analysisId: string): string {
  const register = db.riskRegister.findMany(analysisId);

  const headers = [
    "Finding ID",
    "Finding Type",
    "Title",
    "Affected Component / Asset",
    "Base Likelihood",
    "Base Impact",
    "Calculated Score",
    "Effective Score",
    "Severity",
    "Triage Status",
    "User Notes",
    "Scoring Rationale",
  ];

  const rows = register.map((r) => [
    escapeCsv(r.findingRefId),
    escapeCsv(r.findingType),
    escapeCsv(r.title),
    escapeCsv(r.affectedAssetOrComponent),
    escapeCsv(r.baseLikelihood),
    escapeCsv(r.baseImpact),
    escapeCsv(r.calculatedRiskScore),
    escapeCsv(r.userOverrideScore ?? r.calculatedRiskScore),
    escapeCsv(r.userOverrideSeverity ?? r.riskSeverity),
    escapeCsv(r.userStatus),
    escapeCsv(r.userNotes || ""),
    escapeCsv(r.scoringRationale),
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
}
