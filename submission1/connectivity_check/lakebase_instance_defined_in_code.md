# Lakebase instance defined in code (+ connectivity check)

**Rubric row:** "A Lakebase instance is defined in code, with a committed connectivity check."

Pairs the **build construct** (code that declares the Lakebase instance) with the
**connectivity check** already committed next to it
(`lakebase_connectivity_check.md`).

## Build construct 1 — `app/scripts/lakebase_setup_db.sh`

Idempotently declares the Lakebase **project → branch → endpoint → database** via
the Databricks CLI (code, re-runnable, versioned — not click-ops). Real excerpts:

```bash
# create the project (Postgres 17)
databricks postgres create-project "$p" \
    --json "{\"spec\":{\"display_name\":\"$p\",\"pg_version\":17}}"

# create the branch
databricks postgres create-branch "projects/$proj" "$BRANCH_ID" \
    --json '{"spec":{"no_expiry":true}}'

# create the primary read-write endpoint (scale-to-zero: min 0.5 CU)
databricks postgres create-endpoint "$branch_path" primary \
    --json '{"spec":{"endpoint_type":"ENDPOINT_TYPE_READ_WRITE","autoscaling_limit_min_cu":0.5,"autoscaling_limit_max_cu":2}}'

# create the database
databricks postgres create-database "$branch_path" \
    --database-id "$DB_ID" \
    --json "{\"spec\":{\"postgres_database\":\"$DB_NAME\",\"role\":\"$owner_role\"}}"
```
(See `app/scripts/lakebase_setup_db.sh:130-170`.)

## Build construct 2 — `databricks.yml` (the DAB) binds the app to that instance

```yaml
variables:
  lakebase_project_id:   { default: "sentenel-tech-summit-27" }
  lakebase_branch_id:    { default: "production" }
  lakebase_database_name:{ default: "sentenel_tech_summit_27" }
  lakebase_database_id:  { default: "db-sentenel-tech-summit-27" }

resources:
  apps:
    sentinel_app:
      resources:
        - name: postgres
          postgres:
            branch:   projects/${var.lakebase_project_id}/branches/${var.lakebase_branch_id}
            database: projects/${var.lakebase_project_id}/branches/${var.lakebase_branch_id}/databases/${var.lakebase_database_id}
            permission: CAN_CONNECT_AND_CREATE
```
(See `databricks.yml`, the `apps.sentinel_app.resources` block.)

## Connectivity check (committed)

`submission1/connectivity_check/lakebase_connectivity_check.md` — a real
`SELECT current_database(), current_user, version()` against instance
`sentenel-tech-summit-27` / database `sentenel_tech_summit_27`, returning
PostgreSQL 17.11 connected as `doug.rogers@databricks.com`.

## Execution proof — the instance is live

`databricks postgres get-project projects/sentenel-tech-summit-27` (captured
2026-08-28, profile `fe-sandbox-tech-summit-27-doug`):

```json
{
  "name": "projects/sentenel-tech-summit-27",
  "project_id": "sentenel-tech-summit-27",
  "create_time": "2026-08-27T19:08:57Z",
  "display_name": "sentenel_tech_summit_27",
  "pg_version": 17,
  "default_endpoint_settings": {
    "autoscaling_limit_max_cu": 4,
    "autoscaling_limit_min_cu": 2,
    "suspend_timeout_duration": "86400s"
  },
  "history_retention_duration": "604800s",
  "compute_last_active_time": "2026-08-28T13:38:41Z"
}
```

Databases in the `production` branch: `databricks-postgres` (system) and
`db-sentenel-tech-summit-27` (the app database), matching the `lakebase_database_id`
declared in `databricks.yml`.
