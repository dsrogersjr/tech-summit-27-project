# Task 4 — Custom guardrail blocking calls that query all data

A least-privilege guardrail: examiners work case-by-case, so any request/tool call
that tries to pull the **whole dataset** ("all payments", "dump the entire table",
"select * from everything", "every record with no filter") is refused before it
reaches the governed lakehouse or the Lakebase index.

## Build construct (code)

- **`app/server/agent/guardrails.ts`** — `detectQueryAllData(text)` (deterministic
  pattern matcher over broad-dump intent), `queryAllDataGuardrail` (an
  `@openai/agents` **InputGuardrail** `block_query_all_data` that trips on a match),
  and `assertNotQueryAllData(text)` (throws `Guardrail: …` for use inside a tool).
- **`app/server/agent/caseops.ts`** — wired in:
  - `new Agent({ …, inputGuardrails: [queryAllDataGuardrail] })` — trips on the user
    input before the model runs.
  - `assertNotQueryAllData(question)` at the top of `ask_data`'s execute (Genie).
  - `assertNotQueryAllData(query)` at the top of `search_cases`'s execute (pgvector).
- Tuned against false positives: entity-scoped phrasings like *"all signals on
  PAY-0000202"* do **not** trip.

## Execution evidence

- `../../app/tests/guardrails.test.ts` — vitest: **13 passed (13)** (7 block, 6 allow).
  Server `tsc -b tsconfig.server.json` → exit 0 after wiring.
- `guardrail_samples.json` — real `detectQueryAllData` output for representative
  inputs: broad-dump requests return `blocked:true` with a reason + matched phrase
  (e.g. "select * from everything" → matched `select *`; "list all beneficiaries" →
  matched `all beneficiaries`); scoped case queries return `blocked:false`.

## Effect at runtime

An input-guardrail trip surfaces as the SDK's guardrail tripwire (the turn is
refused with the guardrail's reason); a tool-level `assertNotQueryAllData` throw is
surfaced by the `loggedTool` wrapper as a tool error the model relays — either way
the broad-data-dump call never executes against the data plane.
