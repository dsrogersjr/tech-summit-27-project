# Sentinel Payment Integrity — Workshop Build Guide (for an AI coding agent)

> **Read this if you are an AI agent (Genie Code / Claude Code) implementing the graded gaps.**
> This app began as a **bootstrap** and now ships the full closed loop:
> **(1)** the plumbing (routing, OBO auth, MLflow tracing, SSE streaming, chat dock),
> **(2) Layer 1 — Visualize** (the payment-flag queue reading Lakebase),
> **(3)** the agent loop with `ask_data` (Genie/MAS), **Assist** (`find_flag`,
> `rank_dispositions`), and human-approved **Act** (`execute_case_action`).
> The sections below document the implemented tools, their contracts, and checks.

---

## The story (one paragraph)

The current live hero is **PAY-0000202**: a **$3,227.73 TANF payment in Minnesota** flagged for **`cross_agency_fraud_flag`** + **`income_mismatch`**, with about **$2,582.18 improper-payment exposure**. The current pipeline heuristic recommends **`hold_for_verification` for 72 hours** and predicts about **$1,678 recovery**; Della approved a **48-hour hold**. The queue is prioritized by risk, and the app answers one hero question: **"Why is PAY-0000202 flagged, and should we release it, hold it, or refer it to investigation?"**

The three layers map 1:1 to the enablement build arc: **Visualize (Build-2 Apps)** → **Assist (Build-2 Apps + the ML step)** → **Act (Build-2 Apps)**, all governed by **Unity AI Gateway (Build 3)**.

---

## The data (already generated + validated in `ai_demo_gen.sentinel_benefits`)

The app mirrors these Gold tables into Lakebase Postgres (`app.*`) at boot (see `server/db/sync.ts`). **In Lakebase the synced mirrors are READ-ONLY; the app writes ONLY `app.case_actions`.**

| Lakebase table (`app.*`) | Source Delta table | Read-only? | Key columns |
|---|---|---|---|
| `payment_position` | `gold_queue_scored` | yes (synced) | `id`(=`payment_id:signal_type`), `payment_id`, `payment_amount`, `signal_type`, `signal_name`, `category`, `risk_level`, `improper_payment_exposure_usd`, `flag_risk_score`, `flag_frequency`, `recommended_disposition`, `hold_duration_hours`, `flag_status` (`flagged`/`verified`/`cleared`/`escalated`) |
| `open_queue` | `gold_open_queue` | yes (synced) | `payment_id`, `signal_type`, `improper_payment_exposure_usd`, `risk_level`, `signal_list`, `flag_frequency`, `hold_duration_hours` |
| `dispo_recs` | `gold_disposition_recommendations` | yes (synced) | `payment_id`, `signal_type`, `recommended_disposition`, `recommended_hold_hours`, `predicted_recovery_usd`, `predicted_cost_usd`, `action_ranking` (JSONB: all three options) |
| **`case_actions`** | — (the app's own) | **NO — writable** | `id`(uuid), `payment_id`, `signal_type`, `action_type`, `hold_duration_hours`, `drafted_request`, `predicted_recovery_usd`, `status`, `approved_by`, `reviewed_by_role`, `audit_trail`(jsonb), `created_at`, `decided_at` |

> **`gold_disposition_recommendations` is built and mirrored into `app.dispo_recs`.**
> Its current recommendations are produced by the pipeline's validated heuristic;
> the ML workflow in `specifications/03-ml-disposition.md` remains an optional
> replacement. The sync path still tolerates a temporarily unavailable source so
> the Visualize layer can boot, but the live Assist flow expects recommendation rows.

The Drizzle schema for all of the above is in `server/db/schema.ts`; ready-made query helpers are in `server/db/queries/cases.ts`.

---

## Where the code you edit lives

| Concern | File |
|---|---|
| The agent + its tools | `server/agent/caseops.ts` |
| Lakebase query helpers (read + write) | `server/db/queries/cases.ts` |
| The data-backend `ask_data` tool | already wired in `caseops.ts` (delegates to `server/agent/tools/mas.ts` OR `tools/genie.ts`) |
| The write-refresh cascade (client) | `client/src/lib/events.ts` (`dataMutated`), consumed by `client/src/operations/OperationsView.tsx` |
| Model endpoint / Gateway config | `config/app.json` (`agentModel`) + `app.yaml` (`user_authorization.scopes`) |

**Tool-authoring rules (READ before editing `parameters: z.object(...)` in `caseops.ts`):** the Agents SDK ships each tool schema to the Responses API with `strict: true` — every field must be in `required`, so use `.nullable()`, NEVER `.optional()`. Every field needs `.describe(...)`. Property names stay `snake_case`. Use the `loggedTool` wrapper (imported as `tool`), not the raw SDK `tool`.

---

## Build 1 (Lakebase) — already wired for you

The synced mirrors + the writable `case_actions` table are the Build-1 answer key, already modeled in `server/db/schema.ts` and synced in `server/db/sync.ts`. Your Build-1 workshop task in the workspace is to set up the **real Lakebase Synced Tables** for the three Gold tables and pick your **`ask_data` backend** (a Genie space OR a MAS endpoint):

- Set **ONE** of `GENIE_SPACE_ID` / `MAS_ENDPOINT_NAME` in `.env` (or the DAB). The app registers whichever is set as the `ask_data` tool — no code change needed. The default Sentinel flow uses **Genie** ("ask why PAY-0000202 is flagged").

**Acceptance:** open the app → chat → ask *"Which payments have the highest fraud risk?"* → the Thinking panel shows the `ask_data` investigation and you get a synthesized answer.

---

## Layer 2 — Assist (Build 2): `find_flag` + `rank_dispositions`

**What ships working:** the full agent loop, `ask_data`, and both registered
Assist tools. `find_flag` reads the live flag context and `rank_dispositions`
returns the current recommendation plus all three ranked options from Lakebase.
The query helpers live in `server/db/queries/cases.ts`.

### 2a. `find_flag`

Read the live flagged payment for a payment×signal (or the worst open flag) + its risk metrics.

- **File:** `server/agent/caseops.ts`, the tool named `find_flag` (search for `TODO — BUILD 2`).
- **Signature (already declared):** `find_flag({ payment_id: string | null, signal_type: string | null })`. Both null → return the worst open flag.
- **Lakebase helpers to use** (from `server/db/queries/cases.ts`, imported at the top of `caseops.ts`):
  - `getFlag(ctx.db, paymentId, signalType)` → `Flag | null` — reads `app.open_queue`.
  - `worstFlag(ctx.db)` → `Flag | null` — the worst open flag by `improper_payment_exposure_usd`.
  - `getPosition(ctx.db, \`${paymentId}:${signalType}\`)` → `PositionRow | null` — the live position (payment amount, risk level, flag frequency, exposure).
- **Expected tool output shape** (an object the model reads):
  ```
  {
    payment_id, signal_type, payment_amount, signal_name, category,
    improper_payment_exposure_usd, flag_risk_score, flag_frequency, hold_duration_hours
  }
  ```
  Combine the `Flag` fields with the `PositionRow` fields. If nothing is found, return `{ found: false }` (do not throw). Wrap the body in `mlflow.withSpan(async () => {...}, { name: 'find_flag', spanType: mlflow.SpanType.TOOL, inputs: {...} })` like `ask_data` does.

### 2b. `rank_dispositions`

Read the ranked dispositions — **the demo's governed recommendation moment.**
The live recommendation is currently generated by the pipeline heuristic; the
tool contract also supports recommendations produced by the optional ML path.

- **File:** `server/agent/caseops.ts`, the tool named `rank_dispositions`.
- **Signature (already declared):** `rank_dispositions({ payment_id: string, signal_type: string })`.
- **Lakebase helper to use:** `getDisposition(ctx.db, paymentId, signalType)` → `DispositionRecommendation | null` — reads `app.dispo_recs` (mirrored from `gold_disposition_recommendations`).
- **Expected tool output shape:**
  ```
  {
    payment_id, signal_type,
    recommended_disposition,        // 'hold' | 'approve' | 'escalate' | 'manual_review'
    recommended_hold_hours,         // e.g. 48
    predicted_recovery_usd,         // from ML model
    predicted_cost_usd,             // from ML model
    action_ranking                  // array of all three options with predicted recovery + cost
  }
  ```
  If nothing is found, return `{ found: false }`. The `action_ranking` JSONB field holds all three options — parse + return it. Wrap in `mlflow.withSpan(...)` like `ask_data` does.

---

## Layer 3 — Act (Build 3): `execute_case_action` (the human-in-the-loop write)

**What ships working:** the implemented tool definition and transaction-backed
write path — the single WRITE point in the app.

### The tool's role

When the user approves a disposition ("approve", "yes", etc.), the agent calls this tool **exactly once** with the approved case + the drafted memo. This is a **WRITE to `app.case_actions`** (the only table the app writes), plus an audit trail entry.

- **File:** `server/agent/caseops.ts`, the tool named `execute_case_action` (search for `TODO — BUILD 3`).
- **Signature (already declared):**
  ```typescript
  execute_case_action({
    payment_id: string,
    signal_type: string,
    action_type: 'hold' | 'approve' | 'escalate' | 'manual_review',
    hold_duration_hours: number | null,
    drafted_request: string,
    predicted_recovery_usd: number,
  })
  ```
- **Lakebase helper to use** (from `server/db/queries/cases.ts`, imported at the top of `caseops.ts`):
  - `recordCaseAction(ctx.db, filter, memo, metadata)` — the ready-made write query (you wire it up).
- **What the tool MUST do:**
  1. Insert ONE row into `app.case_actions` with all the disposition details + an audit trail entry (`at`, `by`, `action`, `notes`).
  2. Use `db.transaction(...)` so if the insert fails, the whole tool fails (don't leave partial writes).
  3. Return the inserted `id` + the inserted `status` + a confirmation message for the user.
  4. Wrap in `mlflow.withSpan(...)`.
- **Example audit entry structure:**
  ```json
  {
    "at": "2025-08-24T14:30:00Z",
    "by": "della.okonkwo@benefits.gov",
    "action": "approved",
    "notes": "Held for 48 hours pending manual review per duplicate_identity flag"
  }
  ```
- **Acceptance check:** chat → recommend a case action → approve → the tool records it to `app.case_actions` (you can read the DB to verify) + the Operations drawer's Activity tab shows it + the case status badge updates to reflect the write.

---

## Build 3 (Unity AI Gateway) — already wired for you

The app's `config/app.json` + `app.yaml` scope declarations are ready. Your Build-3 workspace task is to **add Unity AI Gateway policy** controlling which users can call each tool:
- **Everyone** can call `ask_data` (read investigation).
- **Approved reviewers** (role: `program_integrity_reviewer`) can call `find_flag` + `rank_dispositions`.
- **Supervisors** (role: `supervisor`) can call `execute_case_action` (the write).

This is wired in `app.yaml` `user_authorization.scopes`; the app reads it at runtime and enforces it on every tool call.

---

## One more thing: the client side

**You don't touch the React client for Build 1–3.** It's pre-wired to:
- Call the agent SSE endpoint when the user sends a message.
- Stream thinking blocks + tool calls into the Thinking panel.
- Subscribe to `dataMutated` (from `server/lib/events.ts`) so when a case is recorded, the Operations page refreshes.

If you add a tool, it appears in the Thinking panel automatically. If you change a tool's parameters, test in the chat that the model can still call it.

