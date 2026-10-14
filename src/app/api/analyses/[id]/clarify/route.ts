import { NextResponse } from "next/server";
import { submitClarificationAnswer } from "@/lib/extraction";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { questionId, answer, assumptionFallback } = body;

    if (!questionId) {
      return NextResponse.json(
        { error: "questionId is required" },
        { status: 400 }
      );
    }

    const result = await submitClarificationAnswer(
      questionId,
      answer ?? null,
      assumptionFallback
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to submit clarification";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
