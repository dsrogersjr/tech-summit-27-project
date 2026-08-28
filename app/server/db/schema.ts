import {
  text,
  timestamp,
  uuid,
  integer,
  doublePrecision,
  jsonb,
  pgSchema,
  index,
  uniqueIndex,
  boolean,
  customType,
} from 'drizzle-orm/pg-core';

// pgvector column type for Lakebase Search. Stored as `vector(1024)` (the
// databricks-gte-large-en embedding dimension); driver value is the pgvector
// text literal `[f1,f2,…]`. Populated out-of-band by
// scripts/setup_lakebase_search.ts, not by the Delta sync.
const vector1024 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1024)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
});

/**
 * Lakebase schema, under `app.*` — Sentinel Payment Integrity.
 *
 * Three groups (this is the Build-1 answer key: synced READ-ONLY mirrors +
 * ONE writable operational table):
 *   1. Chat state      (conversations, messages, feedback) — REUSE AS-IS.
 *                      Every use case has chat. The `thinking` + `error`
 *                      jsonb/text columns on `messages` make conversations
 *                      reload-safe with full reasoning trails preserved.
 *   2. Synced mirror   (payment_position, open_queue,
 *                      dispo_recs) — READ-ONLY copies of the
 *                      Gold Delta tables that `db/sync.ts` pulls at boot.
 *                      In production these are Lakebase Synced Tables (the
 *                      manual sync is the demo stand-in). The app SELECTs
 *                      from them for sub-ms per-payment reads; never writes.
 *   3. Write-surface   `case_actions` — the ONLY table the app writes.
 *                      UC synced table is read-only in Postgres, so the
 *                      Act layer records approved dispositions here.
 *                      Append-only `audit_trail` JSONB makes each action
 *                      row a standalone timeline the drawer Activity tab
 *                      renders from one read.
 *
 * Why Lakebase: transactional Postgres semantics sitting next to the
 * lakehouse, with Unity Catalog governance. Lets the app do real
 * transactional writes while the analytics layer still queries Delta.
 */
export const appSchema = pgSchema('app');

// ============================================================================
// Chat state
// ============================================================================

export const conversations = appSchema.table(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userEmail: text('user_email').notNull(),
    title: text('title').notNull(),
    // 'default' for regular chats, 'demo_dock' for the floating dock's
    // persistent conversation (one per user).
    kind: text('kind', { enum: ['default', 'demo_dock'] })
      .notNull()
      .default('default'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('conversations_user_idx').on(t.userEmail, t.updatedAt),
    index('conversations_kind_idx').on(t.userEmail, t.kind),
  ],
);

export const messages = appSchema.table(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
    content: text('content').notNull(),
    position: integer('position').notNull(),
    traceId: text('trace_id'),
    // Captured reasoning steps (tool calls, outputs, intermediate messages)
    // for assistant messages. Shape matches client's ThinkingEvent union.
    thinking: jsonb('thinking').$type<ThinkingEntry[]>().notNull().default([]),
    // If the agent run failed, the error message is persisted here so a
    // page reload still shows what went wrong (instead of an empty bubble).
    error: text('error'),
    // True when the turn was stopped by the user (Stop button or page
    // navigation away from an in-flight stream). The assistant's partial
    // streamed content is still kept in `content` for context; the UI
    // renders a "Canceled by the user" banner below it.
    canceled: boolean('canceled').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Unique on (conversation_id, position) so the `SELECT MAX + 1` race in
    // appendMessage surfaces as a constraint error (caller retries) instead
    // of silently inserting two messages at the same position — which
    // would break the on-reload ordering. Doubles as the lookup index.
    uniqueIndex('messages_convo_pos_uq').on(t.conversationId, t.position),
  ],
);

export const feedback = appSchema.table(
  'feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    userEmail: text('user_email').notNull(),
    value: text('value', { enum: ['up', 'down'] }).notNull(),
    rationale: text('rationale'),
    traceId: text('trace_id'),
    mlflowAssessmentId: text('mlflow_assessment_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('feedback_message_idx').on(t.messageId)],
);

// ============================================================================
// Synced read-only mirror (from Delta — Sentinel Gold tables)
//
// These mirror `gold_queue_scored`, `gold_open_queue`, and
// `gold_disposition_recommendations`. In Build-1 terms they're UC synced
// tables — read-only from the app. `db/sync.ts` pulls them at boot; the
// app SELECTs from them and never writes them.
// ============================================================================

// `gold_queue_scored` — ONE ROW PER FLAGGED PAYMENT (a payment carries a set of
// fraud signals summarized on the row; there is no per-signal grain). The queue
// reads this. `payment_id` is the natural PK; we mirror it directly as `id`.
export const paymentPosition = appSchema.table(
  'payment_position',
  {
    // = payment_id (one row per payment).
    id: text('id').primaryKey(),
    paymentId: text('payment_id').notNull(),
    program: text('program'),
    state: text('state'),
    paymentAmountUsd: doublePrecision('payment_amount_usd'),
    queueDate: text('queue_date'),
    nSignals: integer('n_signals'),
    // Comma-joined fraud-signal names (from gold signal_list array).
    signals: text('signals'),
    riskLevel: text('risk_level'),
    improperPaymentExposureUsd: doublePrecision('improper_payment_exposure_usd'),
    projectedRecoveryIfInvestigatedUsd: doublePrecision(
      'projected_recovery_if_investigated_usd',
    ),
  },
  (t) => [
    index('position_payment_idx').on(t.paymentId),
    index('position_program_idx').on(t.program),
    index('position_risk_idx').on(t.riskLevel),
  ],
);

// `gold_open_queue` — the flagged payment + its risk metrics. One row per
// payment; `payment_id` mirrored directly as `id`.
export const openQueue = appSchema.table(
  'open_queue',
  {
    id: text('id').primaryKey(), // = payment_id
    paymentId: text('payment_id').notNull(),
    nSignals: integer('n_signals'),
    signalList: text('signal_list'),
    riskLevel: text('risk_level'),
    improperPaymentExposureUsd: doublePrecision('improper_payment_exposure_usd'),
  },
  (t) => [index('queue_payment_idx').on(t.paymentId)],
);

// Read-only mirror of the ML model's batch predictions table
// (`{catalog}.{schema}.gold_disposition_recommendations`, written by the ML
// notebook). The app never calls the model directly — the agent's
// `rank_dispositions` tool reads from this table. `actionRanking` (JSONB)
// holds all three disposition options with predicted recovery $ + cost,
// powering the ranked-options list + the arithmetic what-if.
//
// NOTE: the trainee BUILDS this table (it's the ML step of the workshop),
// so sync.ts tolerates it not existing yet — the mirror is simply empty
// until they produce it.
export const dispositionRecommendations = appSchema.table(
  'dispo_recs',
  {
    id: text('id').primaryKey(), // = payment_id (one row per flagged payment)
    paymentId: text('payment_id').notNull(),
    recommendedDisposition: text('recommended_disposition', {
      enum: ['release', 'hold_for_verification', 'refer_to_investigation'],
    }),
    confidenceScore: doublePrecision('confidence_score'),
    // Heuristic-derived hold window (hours). Populated from citizen_delay_cost
    // days in the gold table; null if the model path didn't set it.
    recommendedHoldHours: integer('recommended_hold_hours'),
    predictedRecoveryUsd: doublePrecision('predicted_recovery_usd'),
    predictedCostUsd: doublePrecision('predicted_cost_usd'),
    // All disposition options with predicted recovery $ + cost. The pipeline
    // heuristic doesn't emit a full ranking, so this is [] until the ML path
    // (03-ml-disposition) populates it; the drawer degrades gracefully.
    actionRanking: jsonb('action_ranking').$type<ActionOption[]>().notNull().default([]),
    reasoning: text('reasoning'),
    // Lakebase Search: pgvector embedding of `reasoning`
    // (databricks-gte-large-en, 1024-dim). Populated out-of-band by
    // scripts/setup_lakebase_search.ts (NOT by the Delta sync — stays null
    // there). Powers the `search_cases` tool's in-Lakebase similarity search;
    // indexed by `dispo_recs_reasoning_vec_idx` (HNSW cosine).
    searchEmbedding: vector1024('search_embedding'),
    scoredAt: timestamp('scored_at', { withTimezone: true }),
  },
  (t) => [index('disposition_payment_idx').on(t.paymentId)],
);

// Curated federal benefits verification guidance used by `search_playbook`.
// The setup script owns seed content and the HNSW index; Drizzle declares the
// table so application code and generated migrations retain its full shape.
export const referencePlaybooks = appSchema.table(
  'reference_playbooks',
  {
    guideId: text('guide_id').primaryKey(),
    title: text('title').notNull(),
    agency: text('agency').notNull(),
    program: text('program').notNull(),
    scenario: text('scenario').notNull(),
    summary: text('summary').notNull(),
    verificationSteps: jsonb('verification_steps')
      .$type<string[]>()
      .notNull()
      .default([]),
    requiredDocuments: jsonb('required_documents')
      .$type<string[]>()
      .notNull()
      .default([]),
    holdGuidance: text('hold_guidance'),
    authorityCitation: text('authority_citation').notNull(),
    sourceUrl: text('source_url'),
    content: text('content').notNull(),
    searchEmbedding: vector1024('search_embedding'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('reference_playbooks_program_idx').on(t.program),
    index('reference_playbooks_agency_idx').on(t.agency),
  ],
);

// ============================================================================
// Writable operational table (the app writes here — Build-1 writable table)
//
// `case_actions` is the ONLY table the app writes. An approved disposition
// inserts a row here (action_type + hold_duration + drafted memo + who
// approved). The queue derives a payment's live state by LEFT JOIN-ing
// `payment_position` → its latest `case_actions` row (so "case in progress"
// + the disposition badge come from the writable table, and the read-only
// synced position is never mutated). The append-only `audit_trail` makes
// each row a standalone timeline for the drawer.
// ============================================================================

export const caseActions = appSchema.table(
  'case_actions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    paymentId: text('payment_id').notNull(),
    signalType: text('signal_type').notNull(),
    actionType: text('action_type', {
      enum: ['release', 'hold_for_verification', 'refer_to_investigation'],
    }).notNull(),
    holdDurationHours: integer('hold_duration_hours'),
    // The disposition memo the agent drafted.
    draftedRequest: text('drafted_request'),
    predictedRecoveryUsd: doublePrecision('predicted_recovery_usd'),
    status: text('status', {
      enum: ['proposed', 'approved', 'executed', 'overridden'],
    })
      .notNull()
      .default('approved'),
    // OBO-stamped viewing user's email.
    approvedBy: text('approved_by'),
    reviewedByRole: text('reviewed_by_role'),
    // Append-only audit trail. Each entry: { at, by, action, notes?, tool? }
    auditTrail: jsonb('audit_trail').$type<AuditEntry[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
  },
  (t) => [
    index('case_actions_payment_idx').on(t.paymentId, t.signalType),
    index('case_actions_created_idx').on(t.createdAt),
  ],
);

// ============================================================================
// JSONB entry shapes
// ============================================================================

/** One option in the ML model's ranked disposition list (on
 *  `dispo_recs.action_ranking`). */
export type ActionOption = {
  disposition: 'release' | 'hold_for_verification' | 'refer_to_investigation';
  holdHours: number;
  costUsd: number;
  predictedRecoveryUsd: number;
  predictedNetValueUsd: number;
};

export type AuditEntry = {
  at: string;
  by: string;
  action:
    | 'proposed'
    | 'approved'
    | 'executed'
    | 'overridden'
    | 'note';
  notes?: string;
  tool?: string;
};

export type ThinkingEntry =
  | { kind: 'tool_call'; callId: string; name: string; args: string }
  | { kind: 'tool_output'; callId: string; output: string }
  | { kind: 'intermediate_message'; text: string };
