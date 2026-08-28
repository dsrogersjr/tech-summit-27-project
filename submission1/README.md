# Submission 1 — evidence map

This folder is organized so each rubric row points to a **build construct** (the
code that defines the thing) and, where the row needs it, **execution evidence**
(a committed, populated output proving it ran). Every excerpt is drawn from real
repo files; every query result was captured live and is unedited. Nothing here is
fabricated — where something is not fully live, it is flagged as such.

Live captures were taken 2026-08-28 against Lakebase project
`sentenel-tech-summit-27` (database `sentenel_tech_summit_27`), using CLI profile
**`fe-sandbox-tech-summit-27-doug`**, connected as `doug.rogers@databricks.com`.

---

## Read-me-first: environment topology (affects grading)

The Lakebase project has three Postgres branches:

| Branch | Role | State relevant to this submission |
|---|---|---|
| `production` | default | Synced mirrors live here (`payment_position` = 43 rows). **Now carries the renamed `app.dispo_recs`** (43 rows) after the migration was applied on 2026-08-28. |
| `dev` | dev iteration (off `production`) | Development branch. |
| `dev-app-updates` | throwaway (auto-expiring, off `dev`) | Carries `app.dispo_recs` **plus the BM25 search index** (`dispo_recs_reasoning_bm25`). |

**Note on the search index:** the `disposition_recommendations → dispo_recs` rename
is now applied on `production` (see Agentic development / row 14), but the BM25
**search index** was built on the `dev-app-updates` branch — so for the Lakebase
Search rows (17/18) the grader should connect to `dev-app-updates`. See the open
item at the bottom.

---

## Rubric → evidence

### Lakehouse → Lakebase sync
| # | Row | Status | Evidence |
|---|---|---|---|
| 1 | Lakebase instance defined in code + committed connectivity check | ✅ construct + live | `connectivity_check/lakebase_instance_defined_in_code.md`, `connectivity_check/lakebase_connectivity_check.md` |
| 2 | Governed UC table synced into Lakebase, returns rows | ✅ (already verified) | `synced_table.sql`, `synced_table_result.json` |
| 3 | Operational schema modeled: related tables + keys | ✅ construct + live | `schema/operational_schema_model.md`, `schema/schema_excerpt.ts`, `schema/0000_concerned_killraven.sql`, `schema/0000_snapshot.json` |
| 4 | Separate writable Postgres tables, distinct from read-only synced table | ✅ construct + live exec | `lakebase_sync/writable_tables_execution.md`, `lakebase_sync/writable_tables_result.json` |
| 5 | Reverse Lakehouse Sync → UC Delta | ✅ (already verified) | `reverse_sync`, `reverse_sync_sample.json` |
| 6 | Sync defined as code (DAB/Terraform), not UI-only | ✅ construct + validate (not yet deployed) | `lakebase_sync/sync_as_code.md`, `lakebase_sync/databricks_synced_tables.yml`, `lakebase_sync/bundle_validate_synced_tables.json` |
| 7 | Reverse-synced Delta shows SCD Type 2 + system metadata columns | ✅ (already verified) | `reverse_sync`, `reverse_sync_sample.json` |

### Branching
| # | Row | Status | Evidence |
|---|---|---|---|
| 8 | Dev branch off main named, creation captured in code | ✅ git + Lakebase | `branching/git_branch_creation.txt`, `branch.txt`, `branching/lakebase_branch_creation_code.txt`, `branching/lakebase_branches.json` |
| 9 | Branch's changes committed as versioned artifacts | ✅ | `branching/dev_branch_table_rename.patch` |
| 10 | Main stays clean until promotion (git history) | ✅ (already verified) | `git_history.txt` |
| 11 | Both branch uses: dev iteration + throwaway forecasting branch | ✅ live lifecycle | `branching/forecast_throwaway_branch_lifecycle.txt`, `branching/lakebase_branches.json` |
| 12 | Scale-to-zero so idle branches cost ~nothing | ✅ construct + live | `branching/lakebase_branch_creation_code.txt`, `branching/lakebase_production_endpoint.json`, `branching/lakebase_project.json` |

### Agentic development
| # | Row | Status | Evidence |
|---|---|---|---|
| 13 | Agent's change committed as diff or migration | ✅ | `agentic_dev/agent_change.patch`, `agentic_dev/schema_rename.diff`, `agentic_dev/rename_disposition_table.ts` |
| 14 | Change validated by committed test/query + result | ✅ applied + verified on production | `agentic_dev/validation_query.sql`, `agentic_dev/validation_result.json` (real before→after) |
| 15 | Validated change promoted via merge/PR into main | ✅ (already verified) | `git_history.txt` (merge `6efe430`) |
| 16 | Progressive, layered build in commit history | ✅ | `agentic_dev/commit_history.md` |

### Lakebase Search
| # | Row | Status | Evidence |
|---|---|---|---|
| 17 | Lakebase Search (hybrid vector + full-text) over a text column | ⚠️ full-text live; vector scaffolded — see open items | `lakebase_search/dispo_recs_search_index.sql`, `lakebase_search/live_capture.txt` |
| 18 | Search query returns relevant records for a NL query | ✅ (already verified) | `search_query.txt`, `search_result.json` |

### Domain question
| # | Row | Status | Evidence |
|---|---|---|---|
| 19 | Low-latency query returns the correct answer to a business question | ✅ construct + live (~48 ms) | `domain_question/lakebase_domain_query.sql`, `domain_question/lakebase_signal_breakdown.json`, `domain_question/lakebase_domain_result.txt`, `domain_question/ANSWER.md`, `core_query_result.json` |

Per-section detail lives in each subfolder's `EVIDENCE.md`.

---

## Open items

1. ✅ **Row 14 — resolved.** The rename migration was applied to `production` on
   2026-08-28 (authorized by the user in-session): `app.dispo_recs` now exists (43
   rows) and `app.disposition_recommendations` is gone. `validation_result.json`
   captures the real before→after, and the `dispo_recs` assumption in
   `agent_change/schema_change.md` and `reverse_sync` is now accurate on production.

2. **Row 17 — search is full-text-only by decision, not hybrid.** The BM25 full-text
   index over `app.dispo_recs.reasoning` is live and populated (43/43 rows). The
   vector side is scaffolded (`embedding vector(1536)` column + pgvector 0.8.0) but
   **0/43 rows are populated and there is no vector index** — so this row is a
   partial pass. The owner chose to leave it full-text-only for this submission and
   document it honestly (the finishing DDL to make it truly hybrid is noted in
   `lakebase_search/dispo_recs_search_index.sql`).
