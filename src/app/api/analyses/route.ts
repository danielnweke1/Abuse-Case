import { NextResponse } from "next/server";
import { db } from "@/db";
import { runSystemExtraction } from "@/lib/extraction";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { description, title } = body;

    if (!description || typeof description !== "string" || description.trim().length === 0) {
      return NextResponse.json(
        { error: "Application description is required." },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const initialTitle = title?.trim() || "Target Application";
    const now = Date.now();
    const tokenBudget = parseInt(process.env.ANALYSIS_TOKEN_BUDGET || "250000", 10);

    db.analyses.insert({
      id,
      title: initialTitle,
      rawDescription: description.trim(),
      status: "pending",
      stage: "idle",
      stageProgress: JSON.stringify({
        init: { status: "completed", timestamp: now },
      }),
      modelSnapshot: process.env.OPENAI_MODEL || "gpt-4o",
      promptVersion: "v1.0",
      totalTokensUsed: 0,
      promptTokens: 0,
      completionTokens: 0,
      tokenBudget,
      createdAt: now,
      updatedAt: now,
    });

    try {
      const extractionResult = await runSystemExtraction(id);
      return NextResponse.json({
        id,
        status: "success",
        questionsCount: extractionResult.questionsCount,
      });
    } catch (extractError: unknown) {
      const msg = extractError instanceof Error ? extractError.message : String(extractError);
      console.error(`[Analysis] Extraction failed for ${id}:`, msg);

      return NextResponse.json(
        {
          id,
          status: "extraction_error",
          error: msg,
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  try {
    const list = db.analyses.findMany(20);
    return NextResponse.json(list);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load analyses";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
