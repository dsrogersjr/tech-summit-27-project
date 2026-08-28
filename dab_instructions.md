# Deploy — Sentinel: Improper-Payment Prevention

Re-creates the whole demo on any workspace: schema + raw_data volume + SDP
pipeline + AI/BI dashboard + the Payment Integrity App (on Lakebase), plus a
setup job that generates data, classifies raw payment signals into a governed
Delta lookup, runs the pipeline, builds the metric view, and creates the Genie
space.

Prereqs: Databricks CLI **v0.283.0+** (dashboard `dataset_catalog`/`dataset_schema`
rebinding) and PostgreSQL client tools (`psql`) for Lakebase SQL setup/status.
Set your CLI profile (`--profile <name>`) for the target workspace.

```bash
# 1. Lakebase DB (pre-deploy — the CLI can't declare a postgres database)
./app/scripts/lakebase_setup_db.sh \
  --project-id sentenel-tech-summit-27 \
  --branch-id production \
  --db-name sentenel_tech_summit_27

# 2. Create resource shells (schema, volume, pipeline, dashboard, app) + setup job
databricks bundle deploy \
  --var catalog=tech_summit_27_sentenel \
  --var schema=sentinel_ipp

# 3. Run setup (data → AI signal lookup → pipeline → metric view → Genie → grants/export)
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

# 6. After the app migrations have created app.case_actions, prepare CDF and
#    report Lakehouse Sync status (profile may also come from DATABRICKS_CONFIG_PROFILE)
./app/scripts/lakebase_cdf_setup.sh \
  --profile fe-sandbox-tech-summit-27-doug
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

## AI signal categories
`classify_payment_signals` runs after `generate_data` and before `run_pipeline`.
It reads distinct signals from the batch parquet landing path and pins
`ai_classify` to version 2.1. The governed Delta lookup
`payment_signal_classification` contains `fraud`, `eligibility`, or
`administrative` categories plus confidence, rationale, version, and timestamp.

Silver joins this lookup and Gold passes the useful category fields through.
The deterministic signal-strength rules still calculate `risk_level` and remain
the fallback and authority; an absent/erroring AI label never changes risk.

## Lakebase CDF / Lakehouse Sync
The reverse data path is:

`sentenel-tech-summit-27 / production / sentenel_tech_summit_27 / app.case_actions`
→
`tech_summit_27_sentenel.dev_doug_rogers_sentinel_ipp.lb_case_actions_history`.

`lakebase_cdf_setup.sh` is idempotent. It verifies that `app.case_actions`
exists, applies `REPLICA IDENTITY FULL`, reports the table's replica identity,
and reports `wal2delta.tables` when Lakehouse Sync is active. Use
`--status-only` to inspect without issuing the `ALTER TABLE`.

The installed Databricks CLI v1.8.0 has no Autoscaling Lakehouse Sync/CDF
create command, and the local Databricks Python SDK is not installed. Therefore
the script does not invent an unsupported API call. If `wal2delta.tables` is
absent, create the sync in the workspace UI:

1. **Catalog** → **sentenel-tech-summit-27** → **production** →
   **Lakehouse Sync** → **Start Sync**.
2. Select source database `sentenel_tech_summit_27`, schema `app`, table
   `case_actions`.
3. Select destination catalog `tech_summit_27_sentenel`, schema
   `dev_doug_rogers_sentinel_ipp`.
4. Rerun `./app/scripts/lakebase_cdf_setup.sh --status-only` (with the same
   profile) to inspect live status.

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
