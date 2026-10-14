import { NextResponse } from "next/server";
import { db } from "@/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const analysisId = params.id;
    const analysis = db.analyses.findFirst(analysisId);

    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    const modelRecord = db.systemModels.findFirst(analysisId);
    const questions = db.clarifyingQuestions.findMany(analysisId);
    const threats = db.strideThreats.findMany(analysisId);
    const logicScenarios = db.businessLogicScenarios.findMany(analysisId);
    const cves = db.cveFindings.findMany(analysisId);
    const register = db.riskRegister.findMany(analysisId);

    const parsedModel = modelRecord
      ? {
          entities: JSON.parse(modelRecord.entities || "[]"),
          processes: JSON.parse(modelRecord.processes || "[]"),
          dataStores: JSON.parse(modelRecord.dataStores || "[]"),
          dataFlows: JSON.parse(modelRecord.dataFlows || "[]"),
          trustBoundaries: JSON.parse(modelRecord.trustBoundaries || "[]"),
          assets: JSON.parse(modelRecord.assets || "[]"),
          technologies: JSON.parse(modelRecord.technologies || "[]"),
          assumptions: JSON.parse(modelRecord.assumptions || "[]"),
        }
      : null;

    const parsedQuestions = questions.map((q) => ({
      ...q,
      suggestedOptions: JSON.parse(q.suggestedOptions || "[]"),
    }));

    return NextResponse.json({
      analysis: {
        ...analysis,
        stageProgress: JSON.parse(analysis.stageProgress || "{}"),
      },
      systemModel: parsedModel,
      clarifyingQuestions: parsedQuestions,
      strideThreats: threats.map((t) => ({
        ...t,
        id: t.id.includes("_") ? t.id.split("_")[1] : t.id,
        dbId: t.id,
        existingControls: JSON.parse(t.existingControls || "[]"),
        recommendedMitigations: JSON.parse(t.recommendedMitigations || "[]"),
        cweIds: JSON.parse(t.cweIds || "[]"),
        capecIds: JSON.parse(t.capecIds || "[]"),
        asvsIds: JSON.parse(t.asvsIds || "[]"),
        mitreAttackIds: JSON.parse(t.mitreAttackIds || "[]"),
      })),
      businessLogicScenarios: logicScenarios.map((s) => ({
        ...s,
        preconditions: JSON.parse(s.preconditions || "[]"),
        abuseSequence: JSON.parse(s.abuseSequence || "[]"),
        detectionSignals: JSON.parse(s.detectionSignals || "[]"),
        mitigations: JSON.parse(s.mitigations || "[]"),
      })),
      cveFindings: cves,
      riskRegister: register,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to retrieve analysis";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const analysisId = params.id;
    const analysis = db.analyses.findFirst(analysisId);

    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    db.analyses.delete(analysisId);
    return NextResponse.json({ success: true, deletedId: analysisId });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete analysis";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
