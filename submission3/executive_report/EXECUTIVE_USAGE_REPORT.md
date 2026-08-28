# Sentinel — AI Usage & Governance Report

**For:** Executive team &nbsp;·&nbsp; **Period:** 1–28 Aug 2026 &nbsp;·&nbsp;
**Workspace:** `tech_summit_27_sentenel` (`7474651808472462`) &nbsp;·&nbsp;
**Prepared:** 2026-08-28

All figures are pulled **live** from Databricks system tables (`system.billing.usage`,
`system.billing.list_prices`, `system.serving.endpoint_usage`,
`system.serving.served_entities`). Queries: `queries.sql`. Raw data:
`ai_usage_by_stream.json`, `cost_by_product.json`, `serving_usage_by_endpoint.json`.

---

## 1. Bottom line

- **Total workspace spend this period: ≈ $47.20** (list price) across 11 products.
- **AI is fully governed and observable.** Every AI resource emits usage to the
  system tables and is reportable against the `tech_summit_27_sentenel` budget.
- **Three AI-usage streams are governed through Unity AI Gateway** — the app agent,
  the developer coding agent, and the Slack MCP — so model + tool usage is
  tracked, rate-limited, and attributable.
- **Guardrails are enforced** on the app agent (13/13 automated tests pass); broad
  "query-all-data" requests are refused before they reach data or the model.

## 2. Spend by product (list price, USD)

| Product | USD | DBUs | Note |
|---|---:|---:|---|
| Genie | 14.74 | 376.3 | NL data assistant behind the app |
| Lakebase | 13.10 | 50.4 | Postgres + pgvector case store |
| Apps | 8.35 | 8.8 | Sentinel console runtime |
| Interactive (serverless) | 5.55 | 5.8 | Notebook / dev compute |
| SQL warehouse | 4.64 | 6.6 | Dashboard + Genie + app analytics |
| Jobs (serverless) | 0.43 | 1.0 | Setup / pipeline runs |
| DLT | 0.24 | 0.5 | Gold-layer pipeline |
| **Model Serving** | **0.12** | **1.7** | **App-agent LLM traffic** |
| Storage / Networking / AI Gateway | 0.03 | 0.9 | Overhead |
| **Total** | **≈ 47.20** | | |

AI-specific line items (Model Serving + AI Gateway + the Genie/Lakebase that back the
agent) are a small fraction of spend — the program is inexpensive to run and every
dollar is traceable.

## 3. AI usage by stream

### 3a. App agent — Sentinel Payment Integrity console  ✅ live, in-workspace

Routed through the governed endpoint **`sentinel-agent-llm`** (Unity AI Gateway:
inference table + usage tracking enabled), which proxies `databricks-gpt-5-4`.

| Endpoint | Type | Task | Requests | In tok | Out tok |
|---|---|---|---:|---:|---:|
| `sentinel-agent-llm` | External model | chat | 3 | 60 | 123 |
| `databricks-gpt-5-4` | Foundation model | responses | 25 | 48,906 | 4,213 |
| `databricks-gte-large-en` | Foundation model | embeddings | 45 | 2,882 | — |

Embeddings power the Lakebase semantic case search. **Inference logging is live** —
the governed endpoint's inference table (`…sentinel_agent_llm_payload`) has captured
request/response payloads (async write confirmed).

### 3b. Coding agent — Claude Code via Unity AI Gateway  ✅ governed (central)

Claude Code is onboarded with `ucode` and routed through the Unity AI Gateway
(`/ai-gateway/anthropic`, UC-governed `system.ai.claude-*`). Tokens are minted
per-request — **no secret on disk** — and traffic is rate-limited and tracked by the
gateway. This usage is metered in the **central gateway's** account tables (the
`ai_devtools` gateway), *not* in this workspace's serving tables — confirmed by query
(C): no `claude-*` usage appears under workspace `7474651808472462`. A local
**AI_GATEWAY** billing line (0.004 DBUs) marks the gateway's footprint here.
Config evidence: `../agent_mcp/`.

### 3c. Slack MCP — governed tool access  ✅ governed (central)

`system.ai.slack` MCP registered to Claude Code via `ucode configure mcp`
(`auth: proxy`, read-only Slack tools). MCP calls are gateway-proxied API calls, not
token-metered inference, so they don't appear in `endpoint_usage`; they are governed
through the same Unity AI Gateway. Evidence: `../agent_mcp/`.

## 4. Governance posture

| Control | Status |
|---|---|
| App-agent guardrail (block query-all-data) | ✅ enforced; 13/13 tests pass (`../ai_budget_verification/`) |
| App LLM routed through Unity AI Gateway | ✅ `sentinel-agent-llm`, inference table on |
| Coding agent (Claude Code) governed | ✅ via `ucode` → Unity AI Gateway |
| Slack MCP governed | ✅ gateway-proxied, read-only |
| Serverless-compute budget attribution | ✅ `tech_summit_27_sentenel` on Interactive/Jobs/DLT |
| Budget-policy attribution on managed AI products | ⚠️ tracked but not policy-tagged — account-admin step documented in `../ai_budget_verification/EVIDENCE.md` |

## 5. Recommendation

1. **Pin the budget policy to the managed AI products** (Model Serving, Apps, Genie,
   Lakebase, SQL) from the account console so AI spend is *policy-attributed*, not
   just observable — see remediation in `../ai_budget_verification/EVIDENCE.md`.
2. **Consolidate coding-agent + MCP telemetry** into this report by granting read on
   the central gateway's usage tables, so all three streams show token-level detail
   side-by-side.
3. Continue standing behind the **Sentinel Workspace Usage dashboard**
   (`dashboards.sentinel_workspace_usage`, 6 pages / 27 datasets) as the live drill-down.

---

*Source of truth: Databricks system tables, queried 2026-08-28. Reproduce with
`queries.sql` + `../ai_budget_verification/verify_ai_budget.sql`.*
