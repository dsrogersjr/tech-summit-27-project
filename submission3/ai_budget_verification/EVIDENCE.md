# Objective 9 — Test guardrails (app) + budgets (all AI resources)

Two-part verification. Both parts were run **live** against workspace
`7474651808472462` (profile `fe-sandbox-tech-summit-27-doug`) on **2026-08-28**.
Queries: `verify_ai_budget.sql`. Raw outputs committed alongside this file.

---

## 9a — Guardrail test for the app  ✅ CONFIRMED

- **Build construct:** `app/server/agent/guardrails.ts` — `queryAllDataGuardrail`
  (`@openai/agents` InputGuardrail) + `assertNotQueryAllData` tool-level check,
  wired into the agent's `inputGuardrails` and into `ask_data` / `search_cases`
  (`app/server/agent/caseops.ts`). See `../guardrails/EVIDENCE.md`.
- **Test:** `app/tests/guardrails.test.ts` — 7 block-cases + 6 allow-cases.
- **Live run** (`guardrail_test_run.txt`): **Test Files 1 passed (1) · Tests 13
  passed (13)**. Broad-dump requests trip the tripwire; entity-scoped requests
  (e.g. "all signals on PAY-0000202") pass — no false positives.

---

## 9b — Budgets work for all AI resources  ✅ TRACKED (attribution scope documented)

**Claim under test:** the AI resources this project stands up — the app agent
(model serving), the AI Gateway, Genie, Lakebase, the App, and the SQL warehouse —
are all governed by / reportable against the `tech_summit_27_sentenel` budget.

### Finding 1 — every AI resource's spend is captured and budget-reportable

`budget_attribution_by_product.json` (from `system.billing.usage`, Aug 2026) shows
**all** AI-resource products emitting usage rows in this workspace:

| Product | DBUs | Records | Budget-reportable |
|---|---|---|---|
| GENIE | 376.27 | 78 | ✅ in `system.billing.usage` |
| LAKEBASE | 50.41 | 440 | ✅ |
| APPS | 8.79 | 18 | ✅ |
| SQL (warehouse) | 6.63 | 6 | ✅ |
| MODEL_SERVING | 1.72 | 8 | ✅ |
| AI_GATEWAY | 0.004 | — | ✅ (gateway usage-tracking line present) |
| INTERACTIVE / JOBS / DLT (serverless compute) | 6.28 | 30 | ✅ |

Because every product lands in `system.billing.usage`, the budget can **monitor and
report** the full AI footprint — this is what the Sentinel Workspace Usage dashboard
and the executive report (`../executive_report/`) read.

### Finding 2 — explicit budget-*policy attribution* covers serverless compute today

The `tech_summit_27_sentenel` policy (`f3f67b92-c3de-3903-b6a2-3f7ee227de07`) is
**attributed** on serverless-compute usage:

| Product | budget_policy_id | DBUs |
|---|---|---|
| INTERACTIVE | `f3f67b92…de07` | 4.78 |
| JOBS | `f3f67b92…de07` | 0.96 |
| DLT | `f3f67b92…de07` | 0.53 |

The AI-specific products (`MODEL_SERVING`, `APPS`, `GENIE`, `LAKEBASE`, `SQL`,
`AI_GATEWAY`) currently carry an **empty `budget_policy_id`** — their usage is fully
tracked but not tagged to a serverless budget policy.

> **Correction to prior evidence.** `model_serving/EVIDENCE.md` stated that a
> `null`/empty `budget_policy_id` *means "the default policy applies."* The live
> data disproves that: `INTERACTIVE` shows **both** policy-tagged rows *and* empty
> rows in the same workspace, so empty means genuinely un-attributed, not
> "default-applied." This file supersedes that claim.

### Finding 3 — extending policy attribution to AI products is an account-admin action

Serverless budget **policies are account-scoped**. From this workspace profile:
- `databricks account budget-policy list` → **`Not Found`** (needs account-admin).
- `databricks serving-endpoints` exposes no post-create budget-attach command; a
  policy can only be pinned at **create** via `--budget-policy-id`
  (`app/scripts/create_governed_llm_endpoint.sh` already supports the flag).

**Remediation to make policy attribution explicit for all AI resources:**
1. In the **account console → Budgets / budget policies**, bind
   `tech_summit_27_sentenel` to the serverless AI products (Model Serving, Apps,
   Genie, Lakebase, SQL) — an account-admin operation.
2. Recreate `sentinel-agent-llm` with `--budget-policy-id f3f67b92-…-de07` so the
   endpoint pins the non-default policy at create (script flag is wired).
3. Re-run `verify_ai_budget.sql` — the AI-product rows should then show the policy id.

## Verdict

- **9a guardrails:** fully confirmed (13/13 live).
- **9b budgets:** all AI-resource spend is **captured and budget-reportable** today
  (that is what powers the exec report). Explicit **policy attribution** covers
  serverless compute now; extending it to the managed AI products is a documented
  account-admin step (above), not achievable from a workspace-scoped profile.

## Files

- `verify_ai_budget.sql` — the three verification queries.
- `budget_attribution_by_product.json` — per-product usage + budget_policy_id (live).
- `guardrail_test_run.txt` — fresh vitest output (13/13).
