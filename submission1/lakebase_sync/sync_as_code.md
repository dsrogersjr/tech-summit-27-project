# The sync is defined as code (not UI-only)

**Rubric row:** "The sync is defined as code (Databricks Asset Bundle or Terraform), not UI-only."

Forward Gold→Lakebase replication is declared on `resources.postgres_synced_tables`
in `databricks.yml` (SNAPSHOT Lakebase Synced Tables). That is the DAB construct
for this row. Boot-time `app/server/db/sync.ts` still maps columns into the Drizzle
`app.*` mirrors; it is **not** a UI click-path.

## 1. DAB — `postgres_synced_tables` (the required construct)

Three SNAPSHOT syncs, PK `payment_id`, targeting Lakebase project
`sentenel-tech-summit-27` / database `sentenel_tech_summit_27` / branch
`production`. Destinations are `*_synced` in schema `sentinel_sync_storage`
(dev-prefixed to `dev_doug_rogers_sentinel_sync_storage`), **not** Drizzle
`app.payment_position` / `open_queue` / `dispo_recs`.

| Resource key | UC source (after `bundle run sentinel_setup`) | Synced table id (storage schema) |
|---|---|---|
| `sync_gold_queue_scored` | `gold_queue_scored` | `gold_queue_scored_synced` |
| `sync_gold_open_queue` | `gold_open_queue` | `gold_open_queue_synced` |
| `sync_gold_disposition_recommendations` | `gold_disposition_recommendations` | `gold_disposition_recommendations_synced` |

Full YAML: `databricks_synced_tables.yml` (excerpt of repo-root `databricks.yml`).
Deploy notes: `dab_instructions.md`.

## 2. Execution evidence — bundle validate (not yet deployed)

`databricks bundle validate -t dev --profile fe-sandbox-tech-summit-27-doug`
accepts the `postgres_synced_tables` resources. Captured JSON:
`bundle_validate_synced_tables.json` (2026-08-28).

**Flag:** this is **validate-only**. `bundle deploy` of the synced tables has not
been run, so the `*_synced` tables are not live in UC/Postgres yet. First deploy
must follow a successful `sentinel_setup` so the gold MVs exist. Snapshot
refreshes after that are on-demand, not continuous.

## 3. Lakebase instance + bindings (still IaC)

| Concern | Code artifact |
|---|---|
| Project / branch / endpoint / database | `app/scripts/lakebase_setup_db.sh` |
| App ⇄ Lakebase `postgres` binding | `databricks.yml` `apps.sentinel_app.resources` |
| App UC grants for Gold reads | job task `grant_app_uc` → `src/deploy/grant_app_uc.py` |

See `../connectivity_check/lakebase_instance_defined_in_code.md`.

## 4. App boot mapper (column reshape, not the DAB sync)

`sync_ts_excerpt.ts` is still the TypeScript one-shot that fills Drizzle mirrors
from Gold via the SQL warehouse. Gold schema (`signal_list`, etc.) does not match
Drizzle (`signals` text), so that mapper remains until the app reads `*_synced`.

## 5. Reverse sync (Lakebase → UC Delta)

Documented in `../reverse_sync` and `../reverse_sync_sample.json`.
