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
| **Task 6** — onboard the coding agent with Unity AI Gateway | `agent_mcp/EVIDENCE.md`, `agent_mcp/ucode_status.txt`, `agent_mcp/claude_ucode_settings.json` | `ucode configure --agent claude` routes Claude Code through `…/ai-gateway/anthropic` (UC-governed models `system.ai.claude-*`); token minted per-request via `apiKeyHelper` (no secret on disk). |
| **Task 7** — onboard the Slack MCP + add to the coding agent | `agent_mcp/EVIDENCE.md`, `agent_mcp/mcp_servers.json`, `agent_mcp/claude_mcp_list.txt`, `agent_mcp/slack_mcp_tools.json` | `ucode configure mcp --services system.ai.slack` registers the gateway MCP for Claude Code (`✔ Connected`, `auth: proxy`, read-only Slack tools). |
| **Task 8** — use the Slack MCP to search guardrails-solution instructions | `agent_mcp/EVIDENCE.md`, `agent_mcp/slack_guardrails_search.md` | Live `slack_search_public_and_private` through the gateway MCP; verbatim results incl. AI Gateway V2 guardrail templates, the `Service Policy → Custom guardrail → LLM-as-a-judge` steps, and custom-code guardrail endpoints. |
| Budget — `tech_summit_27_sentenel` AI-spend governance | `budget_evidence.md`, `budget_usage.json` | The budget policy governing/attributing serverless + AI spend, with its attributed usage from `system.billing.usage`. |

Per-section detail lives in each subfolder's `EVIDENCE.md`.

## Notes
- Tasks 6–8 (`agent_mcp/`) extend governance from the *app's* LLM to the *developer's* coding
  agent: `ucode` routes Claude Code through the same Unity AI Gateway and registers the
  UC-governed `system.ai.slack` MCP — so coding-agent model + MCP usage is tracked, rate-limited,
  and budget-attributed just like the app. No tokens are stored on disk (per-request minting).
- The governed endpoint's external model authenticates to the underlying FM with a
  **service-principal OBO token** (app SP `dbgen-sentinel-ipp`, granted `CAN_USE` on
  tokens) stored as `secrets/sentinel/agent_llm_token` — never embedded; 7-day
  lifetime (production should use a longer-lived SP credential).
- Inference-table payloads are written **asynchronously** — re-check with the query
  in `model_serving/EVIDENCE.md` a few minutes after traffic.
