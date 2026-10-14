import { NextResponse } from "next/server";
import { exportAnalysisToMarkdown } from "@/lib/export/markdown";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const analysisId = params.id;
    const mdContent = exportAnalysisToMarkdown(analysisId);
    return new NextResponse(mdContent, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="threat-model-${analysisId.slice(0, 8)}.md"`,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Markdown export failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
