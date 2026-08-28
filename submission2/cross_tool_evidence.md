# Cross-tool: the app reads from and acts across what would otherwise be separate tools

Sentinel unifies, in one conversational agent surface, the systems a program-integrity
examiner would otherwise use as **separate tools**:

| Normally a separate tool | In Sentinel | Backend / plane | Read or act |
|---|---|---|---|
| A BI / natural-language analytics tool (Genie, dashboards) | `ask_data` tool → Databricks Genie space | Governed lakehouse (UC/Delta via SQL warehouse) | **read** |
| An operational case-management database/app | `find_flag`, `rank_dispositions` tools → Lakebase | Lakebase Postgres (OLTP mirror) | **read** |
| A reasoning/LLM assistant | the agent loop | Databricks model serving (`databricks-gpt-5-4`, Responses API) | **read/synthesize** |
| A workflow / action system to record a decision | `execute_case_action` tool → Lakebase | Lakebase Postgres (writable `case_actions`) | **act (write)** |

One agent turn can read the governed lakehouse via Genie **and** the operational Lakebase
tables, synthesize with the LLM, and — on human approval — write the decision back, with the
committed decision reflected on the next read (closed loop). That is the "compound" value: no
tool-switching, one governed surface.

## Build construct (code)

- **Tool wiring — `app/server/agent/caseops.ts` `makeTools()`**: registers tools that hit
  distinct backends in the same agent —
  `ask_data` (→ Genie space / MAS, the governed-lakehouse analytics tool; registered when a
  Genie space or MAS endpoint is configured), and `find_flag` / `rank_dispositions` /
  `execute_case_action` (→ Lakebase Postgres). See the tool definitions and
  `const tools: Tool[] = [findShortfall, rankRecoveryMoves, executeRecoveryAction]; if
  (ctx.masEndpointName || ctx.genieSpaceId) tools.unshift(askData);`.
- **`ask_data` → Genie — `app/server/agent/tools/genie.ts`** (`callGenieSpace`): calls the
  Genie REST conversation API (NL → SQL over the lakehouse) — a different tool/plane from the
  Lakebase pool the other tools use.
- **App OAuth scopes span every plane — `app/app.yaml` / `databricks.yml`**:
  `model-serving` (LLM), `genie` / `dashboards.genie` (Genie), `sql` + `sql.statement-execution`
  (SQL warehouse analytics), `postgres` (Lakebase), `catalog.catalogs/schemas/tables:read`
  (Unity Catalog). One app principal authorized across five tool surfaces.
- **`databricks.yml` resources**: the same bundle provisions the SQL warehouse, the AI/BI
  dashboard, the Lakebase `postgres` binding, and (via the setup job) the Genie space — the
  separate tools the app then reads/acts across.
- **Observability across tools — `mlflow.withSpan`**: every tool call (`ask_data`,
  `find_flag`, `rank_dispositions`, `execute_case_action`) is wrapped in an MLflow span, so a
  single trace shows the agent moving across the tools within one turn.

## Execution evidence

**Reads across tools — `cross_tool_flow.jsonl`:** a real live conversation (model
`databricks-gpt-5-4`, Genie space `01f1a25422b61643aad1d45685fa2ad7`, Lakebase `production`)
in which the agent, in one threaded conversation, reads the **governed lakehouse via `ask_data`
(Genie)** *and* the **operational Lakebase via `find_flag` / `rank_dispositions`** — each entry
tags the tool and the backend plane (`genie` vs `lakebase-read`) it hit. `find_flag` also
surfaces PAY-0000202's already-recorded disposition, so the reads span the analytics tool and
the operational tool in one turn.

**Acts — `writeback_table.json` + `assist_log.jsonl`:** the "act" tool is `execute_case_action`
(Lakebase write). The approved hold_for_verification for PAY-0000202 was recorded through it
(see `writeback_table.json`), and the decision is reflected on the next queue read
(`view_result.json` / `view_query.sql`) — the closed loop across tools. (The cross-tool
conversation itself is kept read-only to avoid a duplicate production write; the act is the
committed PAY-0000202 decision.)
