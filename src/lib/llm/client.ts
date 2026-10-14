import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import fs from "fs";
import path from "path";

// Ensure environment variables from .env.local are loaded into process.env
function loadLocalEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    try {
      const fullPath = path.join(process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        for (const line of content.split("\n")) {
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
          if (match) {
            const key = match[1];
            const value = (match[2] || "").trim().replace(/^["'`]|["'`]$/g, "");
            if (!process.env[key] && value) {
              process.env[key] = value;
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }
}

loadLocalEnv();

export interface LLMCallMetadata {
  promptVersion: string;
  stageName: string;
  modelSnapshot: string;
  temperature?: number;
  seed?: number;
}

export interface LLMCallResult<T> {
  data: T;
  rawText: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  model: string;
  metadata: LLMCallMetadata;
}

export class TokenBudgetExceededError extends Error {
  constructor(public currentTokens: number, public budget: number) {
    super(`Token budget exceeded: used ${currentTokens} of ${budget} max tokens allowed.`);
    this.name = "TokenBudgetExceededError";
  }
}

export class LLMClient {
  private openai: OpenAI | null = null;
  private defaultModel: string = "gpt-4o";

  private getClient(): OpenAI {
    loadLocalEnv();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not configured. Please set OPENAI_API_KEY in your environment or .env.local file."
      );
    }
    if (!this.openai || (this.openai as any).apiKey !== apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
    return this.openai;
  }

  /**
   * Safe execution with structured outputs, strict schema enforcement,
   * retry with backoff, refusal checks, and token usage tracking.
   */
  async generateStructured<T>({
    systemPrompt,
    userPrompt,
    schema,
    schemaName,
    metadata,
    temperature = 0.2,
    seed = 42,
    currentSpentTokens = 0,
    tokenBudget = 250000,
  }: {
    systemPrompt: string;
    userPrompt: string;
    schema: z.ZodType<T>;
    schemaName: string;
    metadata: LLMCallMetadata;
    temperature?: number;
    seed?: number;
    currentSpentTokens?: number;
    tokenBudget?: number;
  }): Promise<LLMCallResult<T>> {
    if (currentSpentTokens >= tokenBudget) {
      throw new TokenBudgetExceededError(currentSpentTokens, tokenBudget);
    }

    const client = this.getClient();
    const model = process.env.OPENAI_MODEL || this.defaultModel;
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
      try {
        const response = await client.beta.chat.completions.parse({
          model,
          temperature,
          seed,
          max_tokens: 8192,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: zodResponseFormat(schema, schemaName),
        });

        const latencyMs = Date.now() - startTime;
        const choice = response.choices[0];

        if (!choice) {
          throw new Error("No completion choice returned by OpenAI model.");
        }

        // Check for model refusal
        if (choice.message.refusal) {
          throw new Error(`Model refused request: ${choice.message.refusal}`);
        }

        if (choice.finish_reason === "length") {
          throw new Error("Model completion output truncated due to max output tokens limit.");
        }

        const parsedData = choice.message.parsed;
        if (!parsedData) {
          throw new Error("OpenAI failed to return structured data in parsed response.");
        }

        // Additional independent runtime validation with Zod
        const validated = schema.parse(parsedData);

        const promptTokens = response.usage?.prompt_tokens ?? 0;
        const completionTokens = response.usage?.completion_tokens ?? 0;
        const totalTokens = response.usage?.total_tokens ?? (promptTokens + completionTokens);

        const totalSpent = currentSpentTokens + totalTokens;
        if (totalSpent > tokenBudget) {
          console.warn(`[LLMClient] Analysis exceeded token budget (${totalSpent} > ${tokenBudget})`);
        }

        return {
          data: validated,
          rawText: choice.message.content || JSON.stringify(parsedData),
          usage: {
            promptTokens,
            completionTokens,
            totalTokens,
          },
          latencyMs,
          model: response.model || model,
          metadata: {
            ...metadata,
            modelSnapshot: response.model || model,
            temperature,
            seed,
          },
        };
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[LLMClient] Attempt ${attempt + 1}/${maxRetries + 1} failed: ${lastError.message}`);

        if (attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }

    throw new Error(
      `OpenAI Structured Generation failed after ${maxRetries + 1} attempts. Last error: ${lastError?.message}`
    );
  }
}

export const llmClient = new LLMClient();
