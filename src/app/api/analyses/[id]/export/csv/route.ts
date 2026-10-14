import { NextResponse } from "next/server";
import { exportAnalysisToCsv } from "@/lib/export/csv";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const analysisId = params.id;
    const csvContent = exportAnalysisToCsv(analysisId);
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="risk-register-${analysisId.slice(0, 8)}.csv"`,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "CSV export failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
