import { z } from "zod";

export const CveContextualizationItemSchema = z.object({
  cveId: z.string().describe("Exact matching CVE ID from the provided retrieved input list"),
  contextualRelevance: z.string().describe("1-2 sentences explaining architectural exposure based strictly on the extracted system model"),
});

export const CveContextualizationResultSchema = z.object({
  summaries: z.array(CveContextualizationItemSchema),
});

export type CveContextualizationResult = z.infer<typeof CveContextualizationResultSchema>;
