# Submission 2 — gaps and implementation plan

Honest list of what is not fully backed by real data yet, with a concrete plan
for each.

## (a) `dispo_recs.action_ranking` is empty — the ranked what-if has no per-option backing

**Observed:** all 43 rows of `app.dispo_recs` have `action_ranking = []`
(0 populated). The scalar fields ARE present and real
(`recommended_disposition`, `recommended_hold_hours`, `predicted_recovery_usd`,
`predicted_cost_usd`, `reasoning`), so `rank_dispositions` returns a real
recommendation and the what-if is computed from the scalars (release ⇒ forgo
$1,678 recovery + accept $2,582 exposure vs. ~$48 hold cost). But the *per-option
ranking* (release / hold / refer, each with cost + predicted recovery + net) that
the UI's ranked-options list and the richest what-if expect is not materialized.

**Plan:**
1. Run the ML/heuristic disposition step (`specifications/03-ml-disposition` /
   the gold `gold_disposition_recommendations` builder) so it emits the full
   `action_ranking` array per payment, not just the scalar recommendation.
2. Re-sync `dispo_recs` (the Gold→Lakebase snapshot) so the populated ranking
   lands in `app.dispo_recs`.
3. Re-capture `rank_dispositions` output for PAY-0000202 with a non-empty ranking
   and refresh `drafted_sample.md` / `assist_log.jsonl` to quote all three options.

## (b) No dedicated workflow-state / observability table

**Observed:** the app has no purpose-built state/observability table. `state_table.json`
is assembled from `app.messages` (conversation turns + tool-call/tool-output
entries in the `thinking` JSONB) and `app.case_actions` (recorded decisions +
`audit_trail`). Agent observability is actually emitted to **MLflow traces**
(the agent wraps every tool in `mlflow.withSpan`), which live in an MLflow
experiment, not a Lakebase table.

**Plan (pick one):**
1. *Formalize the view:* add a SQL view `app.workflow_state` that UNIONs message
   turns + case-action decisions (the exact query used to build `state_table.json`),
   so the observability timeline is a first-class, queryable object.
2. *Or add a real table:* have the chat-stream write a compact `app.agent_events`
   row per trigger/tool-call/decision (event_type, payment_id, tool, ts, trace_id),
   giving a dedicated Lakebase observability table joined to the MLflow trace_id.
   Option 1 is lower-risk and sufficient for the rubric.

## (c) `assist_log.jsonl` needs a live model-serving run

**Observed:** capturing a real explanation + what-if requires running the agent
against the Databricks Responses API (model serving) with an OBO/user token and
the configured Genie space. This is a separate live step from the deterministic
Lakebase exports.

**Plan:**
1. Run the agent (`configureAgentsSdk` + `run` from `caseops.ts`) or drive the
   deployed app for two turns on PAY-0000202: (i) "why is PAY-0000202 flagged?"
   (explanation via `find_flag` + `ask_data`), (ii) "what if we release instead of
   hold?" (what-if via `rank_dispositions`). Log `{request, response, tool_calls}`
   per turn to `assist_log.jsonl`.
2. Requires a valid serving-endpoint bearer token and `GENIE_SPACE_ID`/model set.

## (d) Stale retail language in the agent system prompt

**Observed:** the instructions block in `app/server/agent/caseops.ts` still
describes the tools in the template's original **retail/inventory** domain
("transfer / expedite / substitute", "units", "nearest surplus store",
"markdown-hold on the source surplus", "recaptured $"). The tool *schemas* and the
DB are correct (payment/fraud domain: release / hold_for_verification /
refer_to_investigation), but the prose the model reads is off-domain.

**Plan:** rewrite the Phase 1–3 instructions + SUMMARY FORMAT in `caseops.ts` to
the payment-integrity domain (dispositions, hold hours, improper-payment exposure,
citizen-delay cost) so the model's drafts match the actual tools. Low-risk text
change; would improve the quality of the `assist_log.jsonl` explanation/what-if.
