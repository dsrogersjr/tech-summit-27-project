# Submission 2 — evidence map (Build 2 · Assist + Act closed loop)

Hero payment: **PAY-0000202** (TANF · MN · $3,227.73 · signals
`cross_agency_fraud_flag, income_mismatch` · improper exposure $2,582.18). All
live data captured 2026-08-28 against Lakebase `sentenel-tech-summit-27`
(db `sentenel_tech_summit_27`, branch `production`, schema `app`) via profile
`fe-sandbox-tech-summit-27-doug` as `doug.rogers@databricks.com`.

The Assist + Act tools were implemented in
`app/server/agent/caseops.ts` (branch `feat/act-closed-loop-case-action`,
commit `5fe7265`): `find_flag`, `rank_dispositions` (Assist) and
`execute_case_action` (Act — the human-in-the-loop write).

| Required export | File | How it's satisfied | Real/live |
|---|---|---|---|
| Writable Postgres action table (proposed action, approval status + approver, created + committed timestamps) | `writeback_table.json` | The real `app.case_actions` row written via the `execute_case_action` path for PAY-0000202: `proposed_action=hold_for_verification`, `approval_status=approved`, `approver=doug.rogers@databricks.com`, `created_at`/`committed_at` timestamps, append-only `audit_trail`. | ✅ live write |
| Lakebase workflow-state + observability table (trigger events + recorded decisions with timestamps) | `state_table.json` | Exported from the first-class **`app.workflow_state`** view (DDL: `app/server/db/views/workflow_state.sql`), which unions `app.messages` (turns + tool-call observability from the `thinking` JSONB) with `app.case_actions` (recorded decisions + audit trail) into one timestamped stream. 9 rows. | ✅ live view |
| Query backing the live view | `view_query.sql` | The `PAYMENT_SELECT` from `app/server/db/queries/cases.ts` — `payment_position` ⟕ `dispo_recs` ⟕ LATERAL latest `case_actions` → `live_disposition`/`action_status`. The closed-loop read-back. | ✅ from source |
| Returned rows of the live view | `view_result.json` | 10 real rows; PAY-0000202 shows `live_disposition=hold_for_verification`, `action_status=approved`, `approved_by` set — every open payment shows NULLs. Proves the committed decision is reflected on the next read. | ✅ live |
| Assistant interaction log — ≥1 explanation + ≥1 what-if | `assist_log.jsonl` | 2 real live turns from `databricks-gpt-5-4` on PAY-0000202: an **explanation** ("why is PAY-0000202 flagged?" → `find_flag`) and a **what-if** ("what if we release instead of hold?" → `find_flag`+`rank_dispositions`, quoting the 3-option ranking: release net $0 / hold net $1,630 / refer net $2,420.78). Ran against the rewritten payment-integrity prompt. | ✅ live LLM |
| Auto-drafted memo/note/summary | `drafted_sample.md` | The hold-for-verification memo for PAY-0000202 with real numbers; matches the `drafted_request` stored in the committed case_action. | ✅ real |
| Hero question + linked record IDs (decision chain) | `hero_question.txt` | PAY-0000202 → `dispo_recs` rec → `case_actions` (id 37f0ba5e-…) → conversation `0e43ee92-…` → closed-loop view. | ✅ real IDs |
| Git history (`git log --graph --oneline --decorate --all`) — layer-by-layer build on dev off main | `git_history.txt` | Real graph: `main` ← `dev` (submission1 + DAB synced tables) ← `feat/act-closed-loop-case-action` (the Assist+Act implementation `5fe7265`). | ✅ real |

## Cross-tool: reads from and acts across what would otherwise be separate tools

| Evidence | File | How it's satisfied | Real/live |
|---|---|---|---|
| Build construct — one app, multiple tool planes | `cross_tool_evidence.md` | The agent's tools span distinct backends (`ask_data`→Genie/lakehouse, `find_flag`/`rank_dispositions`/`execute_case_action`→Lakebase), and the app's OAuth scopes cover model-serving, Genie, SQL warehouse, Lakebase, and Unity Catalog. Cites `caseops.ts`, `app.yaml`, `databricks.yml`. | ✅ from source |
| Reads across tools (execution) | `cross_tool_flow.jsonl` | One live threaded conversation: a real Genie `ask_data` call (governed-lakehouse analytics) **and** `find_flag`/`rank_dispositions` (Lakebase OLTP) — each `tool_call` tagged `genie` vs `lakebase-read`. `find_flag` surfaced PAY-0000202's recorded disposition. | ✅ live (Genie + Lakebase) |
| Acts across tools | `writeback_table.json` / `assist_log.jsonl` | The `execute_case_action` Lakebase write recorded PAY-0000202's approved disposition; reflected on the next read (`view_result.json`). | ✅ live write |

## Notes
- `assist_log.jsonl` is a real live run against the Databricks Responses API
  (`databricks-gpt-5-4`) — the two turns are the model's actual output, with the
  real `find_flag`/`rank_dispositions` tool calls captured per turn.
- The examiner-approved hold is **48h**, shorter than the model's recommended
  **72h** — a genuine human correction captured at approval time (visible in
  `writeback_table.json` and `drafted_sample.md`).
- Implementation commits on `feat/act-closed-loop-case-action`: `5fe7265`
  (Assist+Act tools), `cde7f0d` (payment-domain system prompt), `3245bfe`
  (action_ranking in sync + `workflow_state` view). All gaps below are resolved.
