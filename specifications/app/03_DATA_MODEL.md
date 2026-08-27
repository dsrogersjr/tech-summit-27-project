# App Specification — Data Model & Lakebase Sync

The app reads from Lakebase (low-latency OLTP) and Delta (warehouse analytics). This page defines the Postgres schema, the sync cadence, and the bootstrap handshake.

## Lakebase schema (5 tables)

All tables live in `{lakebase_branch_name}.public` (the default Postgres schema). Column names and types are **case-sensitive** in Postgres — use lowercase + underscores. **No reserved words as column names** (Postgres reserved words: `order`, `user`, `group`, etc.).

### 1. `payment_position` (read-only, synced from UC Delta `gold_queue_scored`)

**One row per flagged payment** (not per signal — a payment's fraud signals are summarized on its single row). The app's boot-time sync (`server/db/sync.ts`) reads `{catalog}.{schema}.gold_queue_scored` and mirrors it here. `payment_id` is the natural PK, mirrored directly as `id`.

**Columns:**
- `id` (TEXT, PK) — = `payment_id`
- `payment_id` (TEXT)
- `program` (TEXT) — TANF / SNAP / Child Care / Disability / Veteran's
- `state` (TEXT)
- `payment_amount_usd` (DOUBLE)
- `queue_date` (TEXT, ISO date)
- `n_signals` (INT)
- `signals` (TEXT) — comma-joined signal names (from the gold `signal_list` array)
- `risk_level` (TEXT) — high / moderate / low
- `improper_payment_exposure_usd` (DOUBLE)
- `projected_recovery_if_investigated_usd` (DOUBLE)

**Indexes:** `payment_id`, `program`, `risk_level`.

> The examiner's live disposition + status come from the writable `case_actions` table (LEFT JOIN on the latest action per payment), and the recommended disposition from `disposition_recommendations` — NOT stored on this mirror. The queue read (`server/db/queries/cases.ts`) joins all three.

### 2. `open_queue` (read-only, synced from UC Delta `gold_open_queue`)

One row per flagged payment; the flag context the agent's discovery tools read. Synced by `server/db/sync.ts`.

**Columns:**
- `id` (TEXT, PK) — = `payment_id`
- `payment_id` (TEXT)
- `n_signals` (INT)
- `signal_list` (TEXT) — comma-joined signal names
- `risk_level` (TEXT)
- `improper_payment_exposure_usd` (DOUBLE)

**Indexes:** `payment_id`.

### 3. `disposition_recommendations` (read-only, synced from UC Delta `gold_disposition_recommendations`)

One row per flagged payment; the pipeline heuristic's prescribed disposition. Synced by `server/db/sync.ts`. `predicted_recovery_usd` maps from the gold `projected_recovery_if_investigated_usd`; `predicted_cost_usd` from `citizen_delay_cost_usd`.

**Columns:**
- `id` (TEXT, PK) — = `payment_id`
- `payment_id` (TEXT)
- `recommended_disposition` (TEXT) — release / hold_for_verification / refer_to_investigation
- `confidence_score` (DOUBLE) — 0–1
- `recommended_hold_hours` (INT) — 72 for hold-for-verification, else null (heuristic default)
- `predicted_recovery_usd` (DOUBLE)
- `predicted_cost_usd` (DOUBLE) — the citizen-delay cost of a hold
- `action_ranking` (JSONB) — full ranked options; `[]` under the heuristic, populated by the optional ML path (`03-ml-disposition.md`)
- `reasoning` (TEXT) — the memo scaffold
- `scored_at` (TIMESTAMP)

**Indexes:** `payment_id`.

> The demo build syncs the three read-only mirrors above via a one-shot boot-time SELECT (`server/db/sync.ts`) rather than managed Lakebase Synced Tables — same on-screen outcome, fewer moving parts. `raw_payment_fraud_flags` is NOT mirrored; per-payment signals travel denormalized on `payment_position.signals` / `open_queue.signal_list`.

### 4. `reference_playbook` (read-only, app-created, for Lakebase Search)

A small reference table for "evidence docket" + verification-guidance lookups. Created manually (or via a DAS skill) and indexed by Lakebase Search for hybrid text/vector retrieval. The agent's `search_playbooks` tool queries this.

**Columns:**
- `playbook_id` (TEXT, PK)
- `signal_type` (TEXT) — the signal type this guide addresses (e.g., "duplicate_identity", "income_mismatch")
- `agency_name` (TEXT) — the verifying agency (e.g., "Social Security Administration", "IRS")
- `verification_steps` (TEXT) — step-by-step verification process
- `required_evidence` (TEXT) — what documents/data are needed
- `contact_info` (TEXT) — agency contact email/phone
- `typical_resolution_days` (INT)
- `notes` (TEXT) — additional context

**Indexes:** hybrid search index over `signal_type`, `agency_name`, `verification_steps`.

### 5. `case_actions` (read-write, app-created, writable operational store)

The app writes to this table after examiner approval. One row per approved case action.

**Columns:**
- `case_action_id` (UUID, PK) — generated client-side (v4) or server-side
- `payment_id` (TEXT, FK to `payment_position`)
- `disposition_chosen` (TEXT) — release / hold_for_verification / refer_to_investigation
- `examiner_email` (TEXT) — OBO auth (populated by the app from the request context)
- `case_memo` (TEXT) — examiner's narrative
- `verification_request` (TEXT, nullable) — if hold_for_verification: agency + evidence checklist + contact
- `predicted_recovery_usd` (NUMERIC) — the model's prediction at decision time (for audit)
- `created_at` (TIMESTAMP) — server-side now()
- `updated_at` (TIMESTAMP) — server-side now()

**Indexes:** `payment_id` (for drawer activity timeline), `created_at` DESC (for activity feed).

**Constraints:** `payment_id` has a foreign-key constraint to `payment_position.payment_id` (optional, for referential integrity).

## Sync strategy

**Synced tables (read-only):** `payment_position`, `disposition_recommendations`, `payment_fraud_flags` are **Lakebase Synced Tables** — UC Delta tables are continuously replicated to Postgres. Configuration lives in the Lakebase branch spec; the app doesn't manage sync. Sync latency is ~10s (configurable).

**Writable table:** `case_actions` is app-created (not synced). The app writes here; a separate pipeline can read `case_actions` from Lakebase's Postgres and write back to UC Delta as a UC Table if audit trails are needed. For the demo, no write-back — the app's actions are logged to UC via MLflow traces + Unity AI Gateway inference logging.

## Bootstrap flow (on app start)

1. **Check Lakebase connectivity** — resolve `{lakebase_branch}` branch connection URI from environment (`LAKEBASE_BRANCH_URL` or `.env`).
2. **Verify synced tables exist** — query `information_schema.tables` for `payment_position`, `disposition_recommendations`, `payment_fraud_flags`. If absent, fail with a clear error pointing to `README.md` Milestone 2.
3. **Create writable tables if absent** — run migrations to create `case_actions` + `reference_playbook` (idempotent CREATE TABLE IF NOT EXISTS).
4. **Create Lakebase Search index** (optional, if not already present) — index `reference_playbook` for hybrid text/vector search on `signal_type` + `verification_steps`.
5. **Test a read** — `SELECT COUNT(*) FROM payment_position` to confirm connectivity.
6. **Initialize app state** — set `isDataReady = true` so the UI renders the Payment Queue.

## Development setup (local)

For local development (not demo-in-workspace):

**Option A: Mock data (fast)**
- `app/server/db/schema.ts` defines tables.
- `app/server/db/mock.ts` seeds fake `payment_position` + `disposition_recommendations` + `case_actions` in-memory or SQLite.
- `app/.env` sets `USE_MOCK_DB=true`.

**Option B: Real Lakebase branch (recommended for final validation)**
- Create a Lakebase dev branch (e.g., `main/dev-jane`).
- Point `app/.env` `LAKEBASE_BRANCH_URL` to the dev branch.
- Populate the dev branch with synced tables + reference data.
- Run the app locally (Vibe dev mode) — all queries hit the real Postgres.

## Validation

**Before shipping:**
- `SELECT COUNT(*) FROM payment_position` returns >0 (synced data present).
- `SELECT COUNT(*) FROM disposition_recommendations` returns >0.
- `SELECT * FROM case_actions LIMIT 1` works (table exists, even if empty).
- Insert a test `case_actions` row (manual SQL or app action) → read it back → confirm write works.
- `payment_position` + `disposition_recommendations` are readable (read-only constraint enforced at Postgres level via view or role).
- Hero payment `PAY-0000214` exists in `payment_position` with `risk_level = 'high'` and a matching row in `disposition_recommendations`.
