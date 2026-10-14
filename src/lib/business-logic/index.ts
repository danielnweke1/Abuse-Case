import { db } from "@/db";
import { llmClient } from "../llm/client";
import {
  BusinessLogicBatchResultSchema,
  BusinessLogicCritiqueResultSchema,
  type BusinessLogicScenarioItem,
} from "../llm/schemas/business_logic";
import {
  BUSINESS_LOGIC_SYSTEM_PROMPT,
  buildBusinessLogicUserPrompt,
} from "../llm/prompts/v1_logic";
import {
  BUSINESS_LOGIC_CRITIQUE_SYSTEM_PROMPT,
  buildBusinessLogicCritiqueUserPrompt,
} from "../llm/prompts/v1_logic_critique";

export async function runBusinessLogicAnalysis(analysisId: string): Promise<{
  scenariosCount: number;
  scenarios: BusinessLogicScenarioItem[];
}> {
  const analysis = db.analyses.findFirst(analysisId);
  if (!analysis) {
    throw new Error(`Analysis with id ${analysisId} not found.`);
  }

  const modelRecord = db.systemModels.findFirst(analysisId);
  if (!modelRecord) {
    throw new Error(`System model for analysis ${analysisId} not found. Run Stage 1 extraction first.`);
  }

  const systemModel = {
    entities: JSON.parse(modelRecord.entities || "[]"),
    processes: JSON.parse(modelRecord.processes || "[]"),
    dataStores: JSON.parse(modelRecord.dataStores || "[]"),
    dataFlows: JSON.parse(modelRecord.dataFlows || "[]"),
    trustBoundaries: JSON.parse(modelRecord.trustBoundaries || "[]"),
    assets: JSON.parse(modelRecord.assets || "[]"),
    technologies: JSON.parse(modelRecord.technologies || "[]"),
    assumptions: JSON.parse(modelRecord.assumptions || "[]"),
  };

  const currentProgress = JSON.parse(analysis.stageProgress || "{}");
  currentProgress.business_logic = { status: "running", startedAt: Date.now() };

  db.analyses.update(analysisId, {
    status: "analyzing",
    stage: "business_logic",
    stageProgress: JSON.stringify(currentProgress),
    updatedAt: Date.now(),
  });

  const effectiveTokenBudget = Math.max(analysis.tokenBudget || 0, 250000);
  let runningTokensUsed = analysis.totalTokensUsed;
  let runningPromptTokens = analysis.promptTokens;
  let runningCompletionTokens = analysis.completionTokens;

  // Step 1: Initial Business Logic Scenario Generation
  const generationRes = await llmClient.generateStructured({
    systemPrompt: BUSINESS_LOGIC_SYSTEM_PROMPT,
    userPrompt: buildBusinessLogicUserPrompt({
      systemModel,
      rawDescription: analysis.rawDescription,
    }),
    schema: BusinessLogicBatchResultSchema,
    schemaName: "BusinessLogicBatchResult",
    metadata: {
      promptVersion: "v1.0",
      stageName: "business_logic_generate",
      modelSnapshot: process.env.OPENAI_MODEL || "gpt-4o",
    },
    currentSpentTokens: runningTokensUsed,
    tokenBudget: effectiveTokenBudget,
    temperature: 0.25,
  });

  runningTokensUsed += generationRes.usage.totalTokens;
  runningPromptTokens += generationRes.usage.promptTokens;
  runningCompletionTokens += generationRes.usage.completionTokens;

  const rawCandidates = generationRes.data.scenarios;

  // Step 2: Quality Critique Pass
  let finalizedScenarios: BusinessLogicScenarioItem[] = [];

  try {
    const critiqueRes = await llmClient.generateStructured({
      systemPrompt: BUSINESS_LOGIC_CRITIQUE_SYSTEM_PROMPT,
      userPrompt: buildBusinessLogicCritiqueUserPrompt({
        candidateScenarios: rawCandidates,
        systemModel,
      }),
      schema: BusinessLogicCritiqueResultSchema,
      schemaName: "BusinessLogicCritiqueResult",
      metadata: {
        promptVersion: "v1.0",
        stageName: "business_logic_critique",
        modelSnapshot: process.env.OPENAI_MODEL || "gpt-4o",
      },
      currentSpentTokens: runningTokensUsed,
      tokenBudget: effectiveTokenBudget,
      temperature: 0.15,
    });

    runningTokensUsed += critiqueRes.usage.totalTokens;
    runningPromptTokens += critiqueRes.usage.promptTokens;
    runningCompletionTokens += critiqueRes.usage.completionTokens;

    const critique = critiqueRes.data;
    const removedSet = new Set(critique.removedScenarioIds || []);
    const updateMap = new Map((critique.updatedScenarios || []).map((s) => [s.id, s]));

    const keptCandidates = rawCandidates
      .filter((s) => !removedSet.has(s.id))
      .map((s) => (updateMap.has(s.id) ? updateMap.get(s.id)! : s));

    finalizedScenarios = [...keptCandidates, ...(critique.addedScenarios || [])];
  } catch (critiqueError: unknown) {
    console.warn("[BUSINESS LOGIC] Critique pass error, falling back to candidates:", critiqueError);
    finalizedScenarios = rawCandidates;
  }

  // Step 3: Format IDs and persist to database
  const normalizedScenarios = finalizedScenarios.map((scenario, idx) => {
    const formattedId = `BL-${String(idx + 1).padStart(3, "0")}`;
    const uniqueDbId = `${analysisId.slice(0, 8)}_${formattedId}`;

    return {
      ...scenario,
      id: uniqueDbId,
      displayId: formattedId,
    };
  });

  // Atomically delete old scenarios for this analysis
  db.businessLogicScenarios.deleteByAnalysis(analysisId);

  for (const s of normalizedScenarios) {
    db.businessLogicScenarios.insert({
      id: s.id,
      analysisId,
      workflow: s.workflow,
      title: s.title,
      abuseCategory: s.abuseCategory,
      preconditions: JSON.stringify(s.preconditions || []),
      abuseSequence: JSON.stringify(s.abuseSequence || []),
      businessImpact: s.businessImpact,
      impactScore: s.impactScore,
      likelihoodScore: s.likelihoodScore,
      detectionSignals: JSON.stringify(s.detectionSignals || []),
      mitigations: JSON.stringify(s.mitigations || []),
      pentestTestCase: s.pentestTestCase,
      createdAt: Date.now(),
    });
  }

  currentProgress.business_logic = {
    status: "completed",
    completedAt: Date.now(),
    scenariosIdentified: normalizedScenarios.length,
    tokensUsed: runningTokensUsed - analysis.totalTokensUsed,
  };

  db.analyses.update(analysisId, {
    stageProgress: JSON.stringify(currentProgress),
    totalTokensUsed: runningTokensUsed,
    promptTokens: runningPromptTokens,
    completionTokens: runningCompletionTokens,
    updatedAt: Date.now(),
  });

  return {
    scenariosCount: normalizedScenarios.length,
    scenarios: normalizedScenarios,
  };
}
