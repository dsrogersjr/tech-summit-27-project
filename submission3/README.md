# Submission 3 — Governing AI

Evidence for the AI-governance work on branch `feat/ai-governance` (off `dev`).
Same convention as submission1/2: each item points to a **build construct** (the
code that defines it) and, where needed, **execution evidence** (a committed,
populated output proving it ran). Real/live; anything not fully live is flagged.

## Exports

| Area | File(s) | How it's satisfied |
|---|---|---|
| Workspace usage dashboard (DAB + Lakeview JSON) | `workspace_usage/EVIDENCE.md` | `dashboards.sentinel_workspace_usage` in `databricks.yml` ships `sentinel_workspace_usage.lvdash.json`. |
| **Task 3** — programmatically create the LLM model service + inference table | `model_serving/EVIDENCE.md`, `model_serving/endpoint.json` | `sentinel-agent-llm` (external-model chat proxy of `databricks-gpt-5-4`) created via `app/scripts/create_governed_llm_endpoint.sh`; AI Gateway inference table (`…sentinel_agent_llm_payload`) + usage tracking enabled; endpoint READY; proxy verified with a live query. |
| **Task 4** — custom guardrail blocking calls that query all data | `guardrails/EVIDENCE.md`, `guardrails/guardrail_samples.json` | `app/server/agent/guardrails.ts` (`queryAllDataGuardrail` input guardrail + `assertNotQueryAllData`) wired into the agent (`inputGuardrails` + `ask_data`/`search_cases`); vitest 13/13; real block/allow samples. |
| **Task 5** — route the app's LLM requests through Unity/AI Gateway | `model_serving/EVIDENCE.md` | Agent switched to chat-completions (`setOpenAIAPI` in `caseops.ts`) against `sentinel-agent-llm`; `app/config/app.json` `agentModel`; `databricks.yml` app `serving_endpoint` binding + `app.yaml` `SERVING_ENDPOINT`; app SP granted `CAN_QUERY`. |

Per-section detail lives in each subfolder's `EVIDENCE.md`.

## Notes
- The governed endpoint's external model authenticates to the underlying FM with a
  **service-principal OBO token** (app SP `dbgen-sentinel-ipp`, granted `CAN_USE` on
  tokens) stored as `secrets/sentinel/agent_llm_token` — never embedded; 7-day
  lifetime (production should use a longer-lived SP credential).
- Inference-table payloads are written **asynchronously** — re-check with the query
  in `model_serving/EVIDENCE.md` a few minutes after traffic.
