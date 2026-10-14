import { NextResponse } from "next/server";
import { exportAnalysisToThreatDragon } from "@/lib/export/threat-dragon";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const analysisId = params.id;
    const tdContent = exportAnalysisToThreatDragon(analysisId);
    return new NextResponse(JSON.stringify(tdContent, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="threat-dragon-${analysisId.slice(0, 8)}.json"`,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Threat Dragon JSON export failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
