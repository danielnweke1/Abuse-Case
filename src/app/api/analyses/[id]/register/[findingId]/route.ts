import { NextResponse } from "next/server";
import { db } from "@/db";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; findingId: string } }
) {
  try {
    const { id: analysisId, findingId } = params;
    const body = await req.json();

    const finding = db.riskRegister.findFirst(findingId);
    if (!finding) {
      return NextResponse.json({ error: "Risk register entry not found" }, { status: 404 });
    }

    if (finding.analysisId !== analysisId) {
      return NextResponse.json({ error: "Mismatched analysis ID" }, { status: 400 });
    }

    db.riskRegister.update(findingId, {
      userStatus: body.userStatus,
      userOverrideScore: body.userOverrideScore,
      userOverrideSeverity: body.userOverrideSeverity,
      userNotes: body.userNotes,
      updatedAt: Date.now(),
    });

    const updated = db.riskRegister.findFirst(findingId);
    return NextResponse.json({
      status: "success",
      entry: updated,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update risk register finding";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
