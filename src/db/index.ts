import { DatabaseSync } from "node:sqlite";
import path from "path";

const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), "abuse-case.db");
export const sqlite = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys for high performance local-first access
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

// Create tables automatically if they don't already exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS analyses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    raw_description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    stage TEXT NOT NULL DEFAULT 'idle',
    stage_progress TEXT NOT NULL DEFAULT '{}',
    model_snapshot TEXT NOT NULL DEFAULT 'gpt-4o',
    prompt_version TEXT NOT NULL DEFAULT 'v1.0',
    total_tokens_used INTEGER NOT NULL DEFAULT 0,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    token_budget INTEGER NOT NULL DEFAULT 60000,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS clarifying_questions (
    id TEXT PRIMARY KEY,
    analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    category TEXT NOT NULL,
    suggested_options TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'pending',
    user_answer TEXT,
    recorded_assumption TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS system_models (
    id TEXT PRIMARY KEY,
    analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    entities TEXT NOT NULL DEFAULT '[]',
    processes TEXT NOT NULL DEFAULT '[]',
    data_stores TEXT NOT NULL DEFAULT '[]',
    data_flows TEXT NOT NULL DEFAULT '[]',
    trust_boundaries TEXT NOT NULL DEFAULT '[]',
    assets TEXT NOT NULL DEFAULT '[]',
    technologies TEXT NOT NULL DEFAULT '[]',
    assumptions TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS stride_threats (
    id TEXT PRIMARY KEY,
    analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    stride_category TEXT NOT NULL,
    affected_element_id TEXT NOT NULL,
    affected_element_type TEXT NOT NULL,
    trust_boundary_id TEXT,
    attacker_precondition TEXT NOT NULL,
    attack_narrative TEXT NOT NULL,
    impact INTEGER NOT NULL,
    impact_rationale TEXT NOT NULL,
    likelihood INTEGER NOT NULL,
    likelihood_rationale TEXT NOT NULL,
    existing_controls TEXT NOT NULL DEFAULT '[]',
    recommended_mitigations TEXT NOT NULL DEFAULT '[]',
    cwe_ids TEXT NOT NULL DEFAULT '[]',
    capec_ids TEXT NOT NULL DEFAULT '[]',
    asvs_ids TEXT NOT NULL DEFAULT '[]',
    mitre_attack_ids TEXT NOT NULL DEFAULT '[]',
    confidence TEXT NOT NULL DEFAULT 'medium',
    basis TEXT NOT NULL DEFAULT 'inferred',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS business_logic_scenarios (
    id TEXT PRIMARY KEY,
    analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    workflow TEXT NOT NULL,
    title TEXT NOT NULL,
    abuse_category TEXT NOT NULL,
    preconditions TEXT NOT NULL DEFAULT '[]',
    abuse_sequence TEXT NOT NULL DEFAULT '[]',
    business_impact TEXT NOT NULL,
    impact_score INTEGER NOT NULL,
    likelihood_score INTEGER NOT NULL,
    detection_signals TEXT NOT NULL DEFAULT '[]',
    mitigations TEXT NOT NULL DEFAULT '[]',
    pentest_test_case TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cve_findings (
    id TEXT PRIMARY KEY,
    analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    component_id TEXT NOT NULL,
    component_name TEXT NOT NULL,
    component_version TEXT,
    cpe TEXT,
    cve_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    contextual_relevance TEXT NOT NULL,
    cvss_score REAL,
    cvss_version TEXT,
    cvss_vector TEXT,
    epss_score REAL,
    epss_percentile REAL,
    is_kev INTEGER NOT NULL DEFAULT 0,
    kev_due_date TEXT,
    status TEXT NOT NULL,
    affected_version_range TEXT,
    fixed_in_version TEXT,
    primary_source TEXT NOT NULL,
    source_url TEXT NOT NULL,
    retrieved_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS risk_register (
    id TEXT PRIMARY KEY,
    analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    finding_type TEXT NOT NULL,
    finding_ref_id TEXT NOT NULL,
    title TEXT NOT NULL,
    affected_asset_or_component TEXT NOT NULL,
    base_likelihood INTEGER NOT NULL,
    base_impact INTEGER NOT NULL,
    calculated_risk_score REAL NOT NULL,
    risk_severity TEXT NOT NULL,
    scoring_rationale TEXT NOT NULL,
    user_override_score REAL,
    user_override_severity TEXT,
    user_status TEXT NOT NULL DEFAULT 'open',
    user_notes TEXT,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS api_cache (
    cache_key TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    data TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

/**
 * Type-safe Database Query Helper Layer
 */
export const db = {
  analyses: {
    findFirst: (id: string) => {
      const stmt = sqlite.prepare("SELECT * FROM analyses WHERE id = ?");
      const row = stmt.get(id) as any;
      if (!row) return null;
      return {
        id: row.id,
        title: row.title,
        rawDescription: row.raw_description,
        status: row.status,
        stage: row.stage,
        stageProgress: row.stage_progress,
        modelSnapshot: row.model_snapshot,
        promptVersion: row.prompt_version,
        totalTokensUsed: Number(row.total_tokens_used),
        promptTokens: Number(row.prompt_tokens),
        completionTokens: Number(row.completion_tokens),
        tokenBudget: Number(row.token_budget),
        createdAt: Number(row.created_at),
        updatedAt: Number(row.updated_at),
      };
    },
    findMany: (limit = 20) => {
      const stmt = sqlite.prepare("SELECT * FROM analyses ORDER BY created_at DESC LIMIT ?");
      const rows = stmt.all(limit) as any[];
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        rawDescription: row.raw_description,
        status: row.status,
        stage: row.stage,
        stageProgress: row.stage_progress,
        modelSnapshot: row.model_snapshot,
        promptVersion: row.prompt_version,
        totalTokensUsed: Number(row.total_tokens_used),
        promptTokens: Number(row.prompt_tokens),
        completionTokens: Number(row.completion_tokens),
        tokenBudget: Number(row.token_budget),
        createdAt: Number(row.created_at),
        updatedAt: Number(row.updated_at),
      }));
    },
    insert: (values: any) => {
      const stmt = sqlite.prepare(`
        INSERT INTO analyses (
          id, title, raw_description, status, stage, stage_progress,
          model_snapshot, prompt_version, total_tokens_used, prompt_tokens,
          completion_tokens, token_budget, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        values.id,
        values.title,
        values.rawDescription,
        values.status,
        values.stage,
        values.stageProgress,
        values.modelSnapshot,
        values.promptVersion,
        values.totalTokensUsed,
        values.promptTokens,
        values.completionTokens,
        values.tokenBudget,
        values.createdAt,
        values.updatedAt
      );
    },
    update: (id: string, values: any) => {
      const fields: string[] = [];
      const params: any[] = [];

      if (values.title !== undefined) { fields.push("title = ?"); params.push(values.title); }
      if (values.status !== undefined) { fields.push("status = ?"); params.push(values.status); }
      if (values.stage !== undefined) { fields.push("stage = ?"); params.push(values.stage); }
      if (values.stageProgress !== undefined) { fields.push("stage_progress = ?"); params.push(values.stageProgress); }
      if (values.modelSnapshot !== undefined) { fields.push("model_snapshot = ?"); params.push(values.modelSnapshot); }
      if (values.totalTokensUsed !== undefined) { fields.push("total_tokens_used = ?"); params.push(values.totalTokensUsed); }
      if (values.promptTokens !== undefined) { fields.push("prompt_tokens = ?"); params.push(values.promptTokens); }
      if (values.completionTokens !== undefined) { fields.push("completion_tokens = ?"); params.push(values.completionTokens); }
      if (values.updatedAt !== undefined) { fields.push("updated_at = ?"); params.push(values.updatedAt); }

      if (fields.length === 0) return;
      params.push(id);
      const sql = `UPDATE analyses SET ${fields.join(", ")} WHERE id = ?`;
      sqlite.prepare(sql).run(...params);
    },
    delete: (id: string) => {
      sqlite.prepare("DELETE FROM risk_register WHERE analysis_id = ?").run(id);
      sqlite.prepare("DELETE FROM cve_findings WHERE analysis_id = ?").run(id);
      sqlite.prepare("DELETE FROM business_logic_scenarios WHERE analysis_id = ?").run(id);
      sqlite.prepare("DELETE FROM stride_threats WHERE analysis_id = ?").run(id);
      sqlite.prepare("DELETE FROM system_models WHERE analysis_id = ?").run(id);
      sqlite.prepare("DELETE FROM clarifying_questions WHERE analysis_id = ?").run(id);
      sqlite.prepare("DELETE FROM analyses WHERE id = ?").run(id);
    },
  },

  clarifyingQuestions: {
    findMany: (analysisId: string) => {
      const stmt = sqlite.prepare("SELECT * FROM clarifying_questions WHERE analysis_id = ? ORDER BY created_at ASC");
      const rows = stmt.all(analysisId) as any[];
      return rows.map((r) => ({
        id: r.id,
        analysisId: r.analysis_id,
        question: r.question,
        category: r.category,
        suggestedOptions: r.suggested_options,
        status: r.status,
        userAnswer: r.user_answer,
        recordedAssumption: r.recorded_assumption,
        createdAt: Number(r.created_at),
      }));
    },
    findFirst: (id: string) => {
      const stmt = sqlite.prepare("SELECT * FROM clarifying_questions WHERE id = ?");
      const r = stmt.get(id) as any;
      if (!r) return null;
      return {
        id: r.id,
        analysisId: r.analysis_id,
        question: r.question,
        category: r.category,
        suggestedOptions: r.suggested_options,
        status: r.status,
        userAnswer: r.user_answer,
        recordedAssumption: r.recorded_assumption,
        createdAt: Number(r.created_at),
      };
    },
    insert: (values: any) => {
      const stmt = sqlite.prepare(`
        INSERT INTO clarifying_questions (
          id, analysis_id, question, category, suggested_options, status,
          user_answer, recorded_assumption, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        values.id,
        values.analysisId,
        values.question,
        values.category,
        values.suggestedOptions,
        values.status,
        values.userAnswer,
        values.recordedAssumption,
        values.createdAt
      );
    },
    update: (id: string, values: any) => {
      const fields: string[] = [];
      const params: any[] = [];
      if (values.status !== undefined) { fields.push("status = ?"); params.push(values.status); }
      if (values.userAnswer !== undefined) { fields.push("user_answer = ?"); params.push(values.userAnswer); }
      if (values.recordedAssumption !== undefined) { fields.push("recorded_assumption = ?"); params.push(values.recordedAssumption); }

      if (fields.length === 0) return;
      params.push(id);
      sqlite.prepare(`UPDATE clarifying_questions SET ${fields.join(", ")} WHERE id = ?`).run(...params);
    },
  },

  systemModels: {
    findFirst: (analysisId: string) => {
      const stmt = sqlite.prepare("SELECT * FROM system_models WHERE analysis_id = ?");
      const r = stmt.get(analysisId) as any;
      if (!r) return null;
      return {
        id: r.id,
        analysisId: r.analysis_id,
        entities: r.entities,
        processes: r.processes,
        dataStores: r.data_stores,
        dataFlows: r.data_flows,
        trustBoundaries: r.trust_boundaries,
        assets: r.assets,
        technologies: r.technologies,
        assumptions: r.assumptions,
        createdAt: Number(r.created_at),
      };
    },
    insert: (values: any) => {
      const stmt = sqlite.prepare(`
        INSERT INTO system_models (
          id, analysis_id, entities, processes, data_stores, data_flows,
          trust_boundaries, assets, technologies, assumptions, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        values.id,
        values.analysisId,
        values.entities,
        values.processes,
        values.dataStores,
        values.dataFlows,
        values.trustBoundaries,
        values.assets,
        values.technologies,
        values.assumptions,
        values.createdAt
      );
    },
  },

  strideThreats: {
    findMany: (analysisId: string) => {
      const stmt = sqlite.prepare("SELECT * FROM stride_threats WHERE analysis_id = ?");
      return (stmt.all(analysisId) as any[]).map((r) => ({
        id: r.id,
        analysisId: r.analysis_id,
        title: r.title,
        strideCategory: r.stride_category,
        affectedElementId: r.affected_element_id,
        affectedElementType: r.affected_element_type,
        trustBoundaryId: r.trust_boundary_id,
        attackerPrecondition: r.attacker_precondition,
        attackNarrative: r.attack_narrative,
        impact: Number(r.impact),
        impactRationale: r.impact_rationale,
        likelihood: Number(r.likelihood),
        likelihoodRationale: r.likelihood_rationale,
        existingControls: r.existing_controls,
        recommendedMitigations: r.recommended_mitigations,
        cweIds: r.cwe_ids,
        capecIds: r.capec_ids,
        asvsIds: r.asvs_ids,
        mitreAttackIds: r.mitre_attack_ids,
        confidence: r.confidence,
        basis: r.basis,
        createdAt: Number(r.created_at),
      }));
    },
    insert: (values: any) => {
      const stmt = sqlite.prepare(`
        INSERT INTO stride_threats (
          id, analysis_id, title, stride_category, affected_element_id,
          affected_element_type, trust_boundary_id, attacker_precondition,
          attack_narrative, impact, impact_rationale, likelihood,
          likelihood_rationale, existing_controls, recommended_mitigations,
          cwe_ids, capec_ids, asvs_ids, mitre_attack_ids, confidence, basis, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        values.id, values.analysisId, values.title, values.strideCategory,
        values.affectedElementId, values.affectedElementType, values.trustBoundaryId,
        values.attackerPrecondition, values.attackNarrative, values.impact,
        values.impactRationale, values.likelihood, values.likelihoodRationale,
        values.existingControls, values.recommendedMitigations, values.cweIds,
        values.capecIds, values.asvsIds, values.mitreAttackIds, values.confidence,
        values.basis, values.createdAt
      );
    },
    deleteByAnalysis: (analysisId: string) => {
      sqlite.prepare("DELETE FROM stride_threats WHERE analysis_id = ?").run(analysisId);
    },
  },

  businessLogicScenarios: {
    findMany: (analysisId: string) => {
      const stmt = sqlite.prepare("SELECT * FROM business_logic_scenarios WHERE analysis_id = ?");
      return (stmt.all(analysisId) as any[]).map((r) => ({
        id: r.id,
        analysisId: r.analysis_id,
        workflow: r.workflow,
        title: r.title,
        abuseCategory: r.abuse_category,
        preconditions: r.preconditions,
        abuseSequence: r.abuse_sequence,
        businessImpact: r.business_impact,
        impactScore: Number(r.impact_score),
        likelihoodScore: Number(r.likelihood_score),
        detectionSignals: r.detection_signals,
        mitigations: r.mitigations,
        pentestTestCase: r.pentest_test_case,
        createdAt: Number(r.created_at),
      }));
    },
    insert: (values: any) => {
      const stmt = sqlite.prepare(`
        INSERT INTO business_logic_scenarios (
          id, analysis_id, workflow, title, abuse_category, preconditions,
          abuse_sequence, business_impact, impact_score, likelihood_score,
          detection_signals, mitigations, pentest_test_case, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        values.id, values.analysisId, values.workflow, values.title, values.abuseCategory,
        values.preconditions, values.abuseSequence, values.businessImpact, values.impactScore,
        values.likelihoodScore, values.detectionSignals, values.mitigations, values.pentestTestCase,
        values.createdAt
      );
    },
    deleteByAnalysis: (analysisId: string) => {
      sqlite.prepare("DELETE FROM business_logic_scenarios WHERE analysis_id = ?").run(analysisId);
    },
  },

  cveFindings: {
    findMany: (analysisId: string) => {
      const stmt = sqlite.prepare("SELECT * FROM cve_findings WHERE analysis_id = ?");
      return (stmt.all(analysisId) as any[]).map((r) => ({
        id: r.id,
        analysisId: r.analysis_id,
        componentId: r.component_id,
        componentName: r.component_name,
        componentVersion: r.component_version,
        cpe: r.cpe,
        cveId: r.cve_id,
        summary: r.summary,
        contextualRelevance: r.contextual_relevance,
        cvssScore: r.cvss_score ? Number(r.cvss_score) : null,
        cvssVersion: r.cvss_version,
        cvssVector: r.cvss_vector,
        epssScore: r.epss_score ? Number(r.epss_score) : null,
        epssPercentile: r.epss_percentile ? Number(r.epss_percentile) : null,
        isKev: Number(r.is_kev),
        kevDueDate: r.kev_due_date,
        status: r.status,
        affectedVersionRange: r.affected_version_range,
        fixedInVersion: r.fixed_in_version,
        primarySource: r.primary_source,
        sourceUrl: r.source_url,
        retrievedAt: Number(r.retrieved_at),
      }));
    },
    insert: (values: any) => {
      const stmt = sqlite.prepare(`
        INSERT INTO cve_findings (
          id, analysis_id, component_id, component_name, component_version,
          cpe, cve_id, summary, contextual_relevance, cvss_score, cvss_version,
          cvss_vector, epss_score, epss_percentile, is_kev, kev_due_date,
          status, affected_version_range, fixed_in_version, primary_source,
          source_url, retrieved_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        values.id,
        values.analysisId,
        values.componentId,
        values.componentName,
        values.componentVersion ?? null,
        values.cpe ?? null,
        values.cveId,
        values.summary,
        values.contextualRelevance,
        values.cvssScore ?? null,
        values.cvssVersion ?? null,
        values.cvssVector ?? null,
        values.epssScore ?? null,
        values.epssPercentile ?? null,
        values.isKev ?? 0,
        values.kevDueDate ?? null,
        values.status,
        values.affectedVersionRange ?? null,
        values.fixedInVersion ?? null,
        values.primarySource,
        values.sourceUrl,
        values.retrievedAt
      );
    },
    deleteByAnalysis: (analysisId: string) => {
      sqlite.prepare("DELETE FROM cve_findings WHERE analysis_id = ?").run(analysisId);
    },
  },

  riskRegister: {
    findMany: (analysisId: string) => {
      const stmt = sqlite.prepare("SELECT * FROM risk_register WHERE analysis_id = ?");
      return (stmt.all(analysisId) as any[]).map((r) => ({
        id: r.id,
        analysisId: r.analysis_id,
        findingType: r.finding_type,
        findingRefId: r.finding_ref_id,
        title: r.title,
        affectedAssetOrComponent: r.affected_asset_or_component,
        baseLikelihood: Number(r.base_likelihood),
        baseImpact: Number(r.base_impact),
        calculatedRiskScore: Number(r.calculated_risk_score),
        riskSeverity: r.risk_severity,
        scoringRationale: r.scoring_rationale,
        userOverrideScore: r.user_override_score ? Number(r.user_override_score) : null,
        userOverrideSeverity: r.user_override_severity,
        userStatus: r.user_status,
        userNotes: r.user_notes,
        updatedAt: Number(r.updated_at),
      }));
    },
    insert: (values: any) => {
      const stmt = sqlite.prepare(`
        INSERT INTO risk_register (
          id, analysis_id, finding_type, finding_ref_id, title,
          affected_asset_or_component, base_likelihood, base_impact,
          calculated_risk_score, risk_severity, scoring_rationale,
          user_override_score, user_override_severity, user_status, user_notes, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        values.id, values.analysisId, values.findingType, values.findingRefId,
        values.title, values.affectedAssetOrComponent, values.baseLikelihood,
        values.baseImpact, values.calculatedRiskScore, values.riskSeverity,
        values.scoringRationale, values.userOverrideScore, values.userOverrideSeverity,
        values.userStatus, values.userNotes, values.updatedAt
      );
    },
    update: (id: string, values: any) => {
      const fields: string[] = [];
      const params: any[] = [];
      if (values.userOverrideScore !== undefined) { fields.push("user_override_score = ?"); params.push(values.userOverrideScore); }
      if (values.userOverrideSeverity !== undefined) { fields.push("user_override_severity = ?"); params.push(values.userOverrideSeverity); }
      if (values.userStatus !== undefined) { fields.push("user_status = ?"); params.push(values.userStatus); }
      if (values.userNotes !== undefined) { fields.push("user_notes = ?"); params.push(values.userNotes); }
      if (values.updatedAt !== undefined) { fields.push("updated_at = ?"); params.push(values.updatedAt); }

      if (fields.length === 0) return;
      params.push(id);
      sqlite.prepare(`UPDATE risk_register SET ${fields.join(", ")} WHERE id = ?`).run(...params);
    },
    deleteByAnalysis: (analysisId: string) => {
      sqlite.prepare("DELETE FROM risk_register WHERE analysis_id = ?").run(analysisId);
    },
    findFirst: (id: string) => {
      const stmt = sqlite.prepare("SELECT * FROM risk_register WHERE id = ?");
      const r = stmt.get(id) as any;
      if (!r) return null;
      return {
        id: r.id,
        analysisId: r.analysis_id,
        findingType: r.finding_type,
        findingRefId: r.finding_ref_id,
        title: r.title,
        affectedAssetOrComponent: r.affected_asset_or_component,
        baseLikelihood: Number(r.base_likelihood),
        baseImpact: Number(r.base_impact),
        calculatedRiskScore: Number(r.calculated_risk_score),
        riskSeverity: r.risk_severity,
        scoringRationale: r.scoring_rationale,
        userOverrideScore: r.user_override_score ? Number(r.user_override_score) : null,
        userOverrideSeverity: r.user_override_severity,
        userStatus: r.user_status,
        userNotes: r.user_notes,
        updatedAt: Number(r.updated_at),
      };
    },
  },

  apiCache: {
    get: (key: string) => {
      const stmt = sqlite.prepare("SELECT * FROM api_cache WHERE cache_key = ? AND expires_at > ?");
      const r = stmt.get(key, Date.now()) as any;
      if (!r) return null;
      return JSON.parse(r.data);
    },
    set: (key: string, source: string, data: any, ttlMs: number) => {
      const now = Date.now();
      const expiresAt = now + ttlMs;
      const json = JSON.stringify(data);
      const stmt = sqlite.prepare(`
        INSERT INTO api_cache (cache_key, source, data, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(cache_key) DO UPDATE SET
          source = excluded.source,
          data = excluded.data,
          expires_at = excluded.expires_at,
          created_at = excluded.created_at
      `);
      stmt.run(key, source, json, expiresAt, now);
    },
  },
};
