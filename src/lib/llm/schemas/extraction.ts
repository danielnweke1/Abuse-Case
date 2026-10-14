import { z } from "zod";

export const EntitySchema = z.object({
  id: z.string().describe("Unique identifier, e.g. ENT-01"),
  name: z.string().describe("Descriptive name of entity"),
  type: z.enum(["user", "admin", "third_party_service", "external_client"]),
  description: z.string().describe("Role and behavior in the system"),
  trustDomain: z.string().describe("Trust boundary domain, e.g. External / Internet"),
});

export const ProcessSchema = z.object({
  id: z.string().describe("Unique identifier, e.g. PROC-01"),
  name: z.string().describe("Process or service name"),
  tech: z.string().nullable().describe("Technology or framework if stated or inferred"),
  trustDomain: z.string().describe("Trust domain where process executes"),
  description: z.string().describe("Primary function of the process"),
});

export const DataStoreSchema = z.object({
  id: z.string().describe("Unique identifier, e.g. STORE-01"),
  name: z.string().describe("Database, cache, bucket, or storage name"),
  tech: z.string().nullable().describe("Storage engine, e.g. PostgreSQL, Redis, S3"),
  dataClasses: z.array(z.string()).describe("Classes of data stored, e.g. PII, Credentials, Financial"),
  encryptedAtRest: z.boolean().nullable().describe("Whether stated as encrypted at rest"),
});

export const DataFlowSchema = z.object({
  id: z.string().describe("Unique identifier, e.g. FLOW-01"),
  sourceId: z.string().describe("Source entity or process ID"),
  targetId: z.string().describe("Destination process or data store ID"),
  protocol: z.string().nullable().describe("Transport protocol, e.g. HTTPS, gRPC, WebSocket"),
  dataTransferred: z.string().describe("Summary of data transmitted across this flow"),
  crossesBoundaryId: z.string().nullable().describe("ID of trust boundary crossed, if any"),
});

export const TrustBoundarySchema = z.object({
  id: z.string().describe("Unique identifier, e.g. BOUNDARY-01"),
  name: z.string().describe("Boundary name, e.g. Public Internet / DMZ Boundary"),
  type: z.enum(["internet_dmz", "dmz_internal", "tenant_isolation", "third_party", "client_server"]),
  elementIds: z.array(z.string()).describe("IDs of components inside or touching this boundary"),
});

export const AssetSchema = z.object({
  id: z.string().describe("Unique identifier, e.g. ASSET-01"),
  name: z.string().describe("Asset name, e.g. Customer Credit Card Records, JWT Signing Keys"),
  classification: z.enum(["public", "internal", "confidential", "restricted"]),
  criticalityReason: z.string().describe("Why this asset is critical to security and business operations"),
});

export const TechnologyItemSchema = z.object({
  name: z.string().describe("Package or technology name, e.g. express, spring-boot, postgresql"),
  vendor: z.string().nullable().describe("Vendor name if applicable, or null"),
  version: z.string().nullable().describe("Explicit version if stated. NEVER INVENT VERSIONS; use null if unstated"),
  role: z.string().describe("Role in stack, e.g. Web Framework, Database, Reverse Proxy"),
  confidence: z.enum(["high", "medium", "low"]).describe("Extraction confidence"),
});

export const ClarifyingQuestionSchema = z.object({
  question: z.string().describe("Concise, targeted question asking for critical missing information"),
  category: z.enum(["auth", "hosting", "data_sensitivity", "multi_tenancy", "integrations"]),
  suggestedOptions: z.array(z.string()).describe("2-4 typical answers the user can choose or customize"),
});

export const ExtractionResultSchema = z.object({
  systemName: z.string().describe("Inferred or stated name of the application"),
  overview: z.string().describe("Concise 2-sentence executive architectural summary"),
  entities: z.array(EntitySchema),
  processes: z.array(ProcessSchema),
  dataStores: z.array(DataStoreSchema),
  dataFlows: z.array(DataFlowSchema),
  trustBoundaries: z.array(TrustBoundarySchema),
  assets: z.array(AssetSchema),
  technologies: z.array(TechnologyItemSchema),
  openQuestions: z.array(ClarifyingQuestionSchema).describe("At most 5 targeted clarifying questions"),
  assumptions: z.array(z.string()).describe("Explicit engineering assumptions made during extraction"),
});

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;
export type ClarifyingQuestion = z.infer<typeof ClarifyingQuestionSchema>;
export type TechnologyItem = z.infer<typeof TechnologyItemSchema>;
