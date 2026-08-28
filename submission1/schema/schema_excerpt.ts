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
    scoredAt: timestamp('scored_at', { withTimezone: true }),
  },
  (t) => [index('disposition_payment_idx').on(t.paymentId)],
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
