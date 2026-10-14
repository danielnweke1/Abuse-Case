import { db } from "@/db";
import { llmClient } from "../llm/client";
import { ExtractionResultSchema, type ExtractionResult } from "../llm/schemas/extraction";
import { EXTRACTION_SYSTEM_PROMPT, buildExtractionUserPrompt } from "../llm/prompts/v1_extract";
import crypto from "crypto";

export async function runSystemExtraction(analysisId: string): Promise<{
  systemModel: ExtractionResult;
  questionsCount: number;
}> {
  const analysis = db.analyses.findFirst(analysisId);
  if (!analysis) {
    throw new Error(`Analysis with id ${analysisId} not found.`);
  }

  const currentProgress = JSON.parse(analysis.stageProgress || "{}");
  currentProgress.extraction = { status: "running", startedAt: Date.now() };

  db.analyses.update(analysisId, {
    status: "extracting",
    stage: "extraction",
    stageProgress: JSON.stringify(currentProgress),
    updatedAt: Date.now(),
  });

  const result = await llmClient.generateStructured({
    systemPrompt: EXTRACTION_SYSTEM_PROMPT,
    userPrompt: buildExtractionUserPrompt(analysis.rawDescription),
    schema: ExtractionResultSchema,
    schemaName: "ExtractionResult",
    metadata: {
      promptVersion: "v1.0",
      stageName: "extraction",
      modelSnapshot: process.env.OPENAI_MODEL || "gpt-4o",
    },
    currentSpentTokens: analysis.totalTokensUsed,
    tokenBudget: analysis.tokenBudget,
    temperature: 0.15,
  });

  const extracted = result.data;
  const modelId = crypto.randomUUID();

  db.systemModels.insert({
    id: modelId,
    analysisId,
    entities: JSON.stringify(extracted.entities),
    processes: JSON.stringify(extracted.processes),
    dataStores: JSON.stringify(extracted.dataStores),
    dataFlows: JSON.stringify(extracted.dataFlows),
    trustBoundaries: JSON.stringify(extracted.trustBoundaries),
    assets: JSON.stringify(extracted.assets),
    technologies: JSON.stringify(extracted.technologies),
    assumptions: JSON.stringify(extracted.assumptions),
    createdAt: Date.now(),
  });

  const questionsToPersist = extracted.openQuestions.slice(0, 5);
  for (const q of questionsToPersist) {
    db.clarifyingQuestions.insert({
      id: crypto.randomUUID(),
      analysisId,
      question: q.question,
      category: q.category,
      suggestedOptions: JSON.stringify(q.suggestedOptions),
      status: "pending",
      userAnswer: null,
      recordedAssumption: null,
      createdAt: Date.now(),
    });
  }

  const totalTokens = analysis.totalTokensUsed + result.usage.totalTokens;
  const promptTokens = analysis.promptTokens + result.usage.promptTokens;
  const completionTokens = analysis.completionTokens + result.usage.completionTokens;

  currentProgress.extraction = {
    status: "completed",
    completedAt: Date.now(),
    latencyMs: result.latencyMs,
    tokensUsed: result.usage.totalTokens,
  };

  const nextStatus = questionsToPersist.length > 0 ? "clarifying" : "analyzing";

  db.analyses.update(analysisId, {
    title: extracted.systemName || analysis.title,
    status: nextStatus,
    stage: questionsToPersist.length > 0 ? "clarification" : "extraction",
    stageProgress: JSON.stringify(currentProgress),
    totalTokensUsed: totalTokens,
    promptTokens,
    completionTokens,
    modelSnapshot: result.model,
    updatedAt: Date.now(),
  });

  return {
    systemModel: extracted,
    questionsCount: questionsToPersist.length,
  };
}

export async function submitClarificationAnswer(
  questionId: string,
  answer: string | null,
  assumptionFallback?: string
) {
  const q = db.clarifyingQuestions.findFirst(questionId);
  if (!q) {
    throw new Error(`Clarifying question ${questionId} not found.`);
  }

  const isSkipped = answer === null || answer.trim() === "";
  const recordedAssumption = isSkipped
    ? assumptionFallback || `Default assumption adopted: ${q.question} was skipped.`
    : `Clarified by user: ${answer.trim()}`;

  db.clarifyingQuestions.update(questionId, {
    status: isSkipped ? "skipped" : "answered",
    userAnswer: isSkipped ? null : answer?.trim(),
    recordedAssumption,
  });

  const pending = db.clarifyingQuestions.findMany(q.analysisId);
  const stillPending = pending.some((item) => item.status === "pending");

  if (!stillPending) {
    db.analyses.update(q.analysisId, {
      status: "analyzing",
      updatedAt: Date.now(),
    });
  }

  return { questionId, status: isSkipped ? "skipped" : "answered", stillPending };
}
