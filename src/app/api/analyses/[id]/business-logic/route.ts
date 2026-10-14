import { NextResponse } from "next/server";
import { runBusinessLogicAnalysis } from "@/lib/business-logic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const analysisId = params.id;
    const result = await runBusinessLogicAnalysis(analysisId);
    return NextResponse.json({
      status: "success",
      scenariosCount: result.scenariosCount,
      scenarios: result.scenarios,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Business logic analysis failed";
    console.error("[API] Business Logic error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
