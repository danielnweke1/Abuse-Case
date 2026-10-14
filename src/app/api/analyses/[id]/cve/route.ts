import { NextResponse } from "next/server";
import { runCveCorrelation } from "@/lib/cve";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const analysisId = params.id;
    const result = await runCveCorrelation(analysisId);
    return NextResponse.json({
      status: "success",
      findingsCount: result.findingsCount,
      findings: result.findings,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "CVE correlation failed";
    console.error("[API] CVE error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
