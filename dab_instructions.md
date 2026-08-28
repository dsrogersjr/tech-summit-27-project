# Deploy — Sentinel: Improper-Payment Prevention

Re-creates the whole demo on any workspace: schema + raw_data volume + SDP
pipeline + AI/BI dashboard + the Payment Integrity App (on Lakebase), plus a
setup job that generates data, runs the pipeline, builds the metric view, and
creates the Genie space.

Prereqs: Databricks CLI **v0.283.0+** (dashboard `dataset_catalog`/`dataset_schema`
rebinding). Set your CLI profile (`--profile <name>`) for the target workspace.

```bash
# 1. Lakebase DB (pre-deploy — the CLI can't declare a postgres database)
./app/scripts/lakebase_setup_db.sh --db-name dbgen_sentinel_ipp

# 2. Create resource shells (schema, volume, pipeline, dashboard, app) + setup job
databricks bundle deploy \
  --var catalog=tech_summit_27_sentenel \
  --var schema=sentinel_ipp

# 3. Run the setup job (data → pipeline → metric view → Genie → grant SP → export IDs)
databricks bundle run sentinel_setup \
  --var catalog=tech_summit_27_sentenel \
  --var schema=sentinel_ipp

# 4. Grant the app SP on the Lakebase (Postgres) schemas
./app/scripts/lakebase_grant_app_credential.sh \
  --app-name dbgen-sentinel-ipp \
  --project-id sentenel-tech-summit-27 \
  --db-name sentenel_tech_summit_27

# 5. Harvest resolved IDs → write app.yaml env → deploy the app
./app/scripts/finalize_app.sh
```

After a content change to the app, re-run steps 2 + 5. After a data/resource
change, re-run 2 + 3 + 5. Re-runs are idempotent (the Genie task updates in place).

Gold→Lakebase **synced tables** (`postgres_synced_tables` in `databricks.yml`)
are SNAPSHOT copies of `gold_queue_scored`, `gold_open_queue`, and
`gold_disposition_recommendations`. They land in the `sentinel_sync_storage`
schema as `*_synced` (not the Drizzle `app.*` mirrors). First deploy of those
resources should follow a successful `bundle run sentinel_setup` so the gold
sources exist. Snapshot refreshes after that are on-demand (pipeline / API),
not continuous.

## Notes
- This demo's disposition recommendation is a **pipeline heuristic** (built in the
  SDP gold layer) — there is no ML model, Knowledge Assistant, or Multi-Agent
  Supervisor to deploy. The app's data tool is the Genie space, used directly.
- `dev` target prefixes the schema with `dev_<user>_`; the pipeline + all tasks
  resolve the schema through the schema resource so they agree on the same target.

## Teardown
```bash
databricks bundle destroy --auto-approve
```
Does not drop the Lakebase project/DB, the UC tables/volume, or the Genie space.
