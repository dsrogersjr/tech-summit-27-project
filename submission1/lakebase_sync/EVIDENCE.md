# Lakehouse ⇄ Lakebase sync — evidence map

Row-by-row pointers for the grader. All excerpts are drawn from real repo files;
all query output was captured live against Lakebase project `sentenel-tech-summit-27`
on 2026-08-28 (profile `fe-sandbox-tech-summit-27-doug`, connected as
`doug.rogers@databricks.com`).

| # | Rubric row | Build construct (code) | Execution evidence | Where |
|---|---|---|---|---|
| 1 | A Lakebase instance is defined in code, with a committed connectivity check | `app/scripts/lakebase_setup_db.sh` (CLI `postgres create-project/branch/endpoint/database`) + `databricks.yml` `postgres` binding | `get-project` live output + `SELECT version()` connectivity check | `../connectivity_check/lakebase_instance_defined_in_code.md`, `../connectivity_check/lakebase_connectivity_check.md` |
| 2 | A governed UC table is synced into Lakebase and returns rows | `synced_table.sql` | `synced_table_result.json` (already Verified) | `../synced_table.sql`, `../synced_table_result.json` |
| 3 | The operational schema is modeled for the domain: related tables and keys | `app/server/db/schema.ts`, `app/drizzle/0000_concerned_killraven.sql` | 7 `app.*` tables present live | `../schema/operational_schema_model.md`, `../schema/schema_excerpt.ts`, `../schema/0000_concerned_killraven.sql` |
| 4 | Separate writable Postgres tables exist, distinct from the read-only synced table | `app/server/db/schema.ts` (`case_actions` = write-surface vs. synced mirrors) | live `INSERT ... RETURNING` round-trip on `case_actions` + mirror row counts | `writable_tables_execution.md`, `writable_tables_result.json` |
| 5 | Reverse Lakehouse Sync streams writable-Postgres changes into a UC Delta table | — | `reverse_sync_sample.json` (already Verified) | `../reverse_sync`, `../reverse_sync_sample.json` |
| 6 | The sync is defined as code (DAB or Terraform), not UI-only | `databricks.yml` `postgres_synced_tables` (SNAPSHOT Gold→Lakebase) | `bundle validate -t dev` JSON (synced tables **not yet deployed**) | `sync_as_code.md`, `databricks_synced_tables.yml`, `bundle_validate_synced_tables.json`, `sync_ts_excerpt.ts` |
| 7 | Reverse-synced Delta shows SCD Type 2 history + system metadata columns | — | `reverse_sync_sample.json` (already Verified) | `../reverse_sync` |

## Files added by this section

- `lakebase_sync/EVIDENCE.md` (this file)
- `lakebase_sync/sync_as_code.md`, `lakebase_sync/databricks_synced_tables.yml`, `lakebase_sync/bundle_validate_synced_tables.json`, `lakebase_sync/sync_ts_excerpt.ts` — row 6
- `lakebase_sync/writable_tables_execution.md`, `lakebase_sync/writable_tables_result.json` — row 4
- `connectivity_check/lakebase_instance_defined_in_code.md` — row 1
- `schema/operational_schema_model.md`, `schema/schema_excerpt.ts`, `schema/0000_concerned_killraven.sql`, `schema/0000_snapshot.json` — row 3
