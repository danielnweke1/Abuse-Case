import { NextResponse } from "next/server";
import { runStrideAnalysis } from "@/lib/stride";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const analysisId = params.id;
    const result = await runStrideAnalysis(analysisId);
    return NextResponse.json({
      status: "success",
      threatsCount: result.threatsCount,
      threats: result.threats,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "STRIDE analysis failed";
    console.error("[API] STRIDE error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
