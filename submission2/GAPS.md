# Submission 2 — gaps: resolved

All four gaps from the first submission2 pass have been addressed on branch
`feat/act-closed-loop-case-action`. Kept for provenance.

## (a) `dispo_recs.action_ranking` was empty — RESOLVED

**Was:** all 43 rows of `app.dispo_recs` had `action_ranking = []`; the ranked
what-if had no per-option backing.

**Fix:** `app/server/db/sync.ts` now builds the 3-option `action_ranking`
(release / hold_for_verification / refer_to_investigation) deterministically from
the Gold heuristic's economics — projected recovery, the Gold citizen-delay cost,
and improper exposure — instead of hardcoding `[]` (commit `3245bfe`). The
disposition read was extended with `improper_payment_exposure_usd`. Re-syncing
`dispo_recs` (truncate + `syncFromDelta`, the legitimate Delta→Lakebase path —
`case_actions` is never touched) repopulated all **43/43** rows with a ranking.

**Honest note:** the ranking's net values are *advisory economics*. For a
2-signal case like PAY-0000202 the net-value argmax is `refer_to_investigation`
($2,420.78, recovering the full exposure), but the rule-based
`recommended_disposition` stays `hold_for_verification` — the signal-strength
policy prefers the least-intrusive disposition that still stops disbursement.
The recommendation, not the net-value argmax, is the authority.

## (b) No dedicated workflow-state / observability object — RESOLVED

**Was:** `state_table.json` was assembled ad hoc; no first-class object existed.

**Fix:** added `app/server/db/views/workflow_state.sql` — a
`CREATE OR REPLACE VIEW app.workflow_state` (committed as code, created live on
the production branch) that unions assistant workflow turns (`app.messages` +
tool-call observability from the `thinking` JSONB) with recorded `app.case_actions`
decisions into one timestamped `(event_ts, event_kind, actor, payment_id, detail)`
stream. `state_table.json` is now exported from this view. Deeper per-tool agent
spans remain in MLflow traces; `trace_id` joins the view rows to that backend.

## (c) `assist_log.jsonl` needed a live model run — RESOLVED

**Fix:** ran the agent live against the Databricks Responses API
(`databricks-gpt-5-4`) for two turns on PAY-0000202 — an explanation (`find_flag`)
and a what-if (`find_flag` + `rank_dispositions`, quoting the now-populated
3-option ranking). Both are the model's real output with the real tool calls
captured; no fabrication.

## (d) Stale retail language in the agent system prompt — RESOLVED

**Fix:** rewrote the instructions block in `app/server/agent/caseops.ts`
(commit `cde7f0d`) from the template's retail/inventory domain
("transfer/expedite/substitute", "units", nonexistent `PAY-0000214`/Child Care)
to the payment-integrity domain — correct tool params
(`payment_id, action_type, hold_duration_hours, drafted_request,
predicted_recovery_usd`), the real hero PAY-0000202, and disposition/hold/exposure
language. The `assist_log.jsonl` run above used this rewritten prompt.

## Follow-ups (optional, not blocking)

- The `action_ranking` economics live in the sync layer (app), matching the
  existing pattern where `sync.ts` derives the disposition scalars. If a future
  ML step (`03-ml-disposition`) produces a richer per-option ranking in the Gold
  table, map it through in `sync.ts` in place of the heuristic builder.
- A re-run of the demo "Reset" (`/api/admin/reset`) truncates + re-syncs the
  mirrors and wipes `case_actions`; re-run the `execute_case_action` hero write
  afterward to restore the closed-loop snapshot.
