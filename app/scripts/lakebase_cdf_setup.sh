#!/usr/bin/env bash
# Prepare and inspect Lakebase Lakehouse Sync (Postgres CDC → Delta).
# Idempotent: REPLICA IDENTITY FULL may be applied repeatedly.
set -euo pipefail

PROJECT_ID="sentenel-tech-summit-27"
BRANCH_ID="production"
DB_NAME="sentenel_tech_summit_27"
SOURCE_SCHEMA="app"
SOURCE_TABLE="case_actions"
DESTINATION="tech_summit_27_sentenel.dev_doug_rogers_sentinel_ipp"
STATUS_ONLY=false
PROFILE="${DATABRICKS_CONFIG_PROFILE:-}"

usage() {
    echo "Usage: $0 [--status-only] [--profile NAME] [--project-id ID] [--branch-id ID] [--db-name NAME]"
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --status-only) STATUS_ONLY=true; shift ;;
        --profile) PROFILE="$2"; shift 2 ;;
        --project-id) PROJECT_ID="$2"; shift 2 ;;
        --branch-id) BRANCH_ID="$2"; shift 2 ;;
        --db-name) DB_NAME="$2"; shift 2 ;;
        -h|--help) usage; exit 0 ;;
        *) echo "Unknown argument: $1" >&2; usage >&2; exit 1 ;;
    esac
done

PROFILE_FLAG=()
[[ -n "$PROFILE" ]] && PROFILE_FLAG=(--profile "$PROFILE")

if ! command -v psql >/dev/null 2>&1 && [[ -x /opt/homebrew/opt/libpq/bin/psql ]]; then
    export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
fi
if ! command -v psql >/dev/null 2>&1; then
    echo "[cdf] BLOCKED: PostgreSQL client 'psql' is not installed or not on PATH." >&2
    echo "[cdf] Install PostgreSQL client tools, then rerun this script." >&2
    exit 3
fi

run_psql() {
    databricks psql \
        --project "$PROJECT_ID" \
        --branch "$BRANCH_ID" \
        --endpoint primary \
        "${PROFILE_FLAG[@]}" \
        -- -d "$DB_NAME" -v ON_ERROR_STOP=1 "$@"
}

echo "[cdf] source:      $PROJECT_ID / $BRANCH_ID / $DB_NAME / $SOURCE_SCHEMA.$SOURCE_TABLE"
echo "[cdf] destination: $DESTINATION"

TABLE_EXISTS="$(run_psql -Atc "SELECT to_regclass('$SOURCE_SCHEMA.$SOURCE_TABLE');")"
if [[ "$TABLE_EXISTS" != "$SOURCE_SCHEMA.$SOURCE_TABLE" ]]; then
    echo "[cdf] BLOCKED: $SOURCE_SCHEMA.$SOURCE_TABLE does not exist yet." >&2
    echo "[cdf] Start/deploy the app so its migrations create the table, then rerun this script." >&2
    exit 2
fi

if ! $STATUS_ONLY; then
    run_psql -c "ALTER TABLE $SOURCE_SCHEMA.$SOURCE_TABLE REPLICA IDENTITY FULL;"
    echo "[cdf] replica identity applied."
fi

run_psql -c "
SELECT
  n.nspname AS table_schema,
  c.relname AS table_name,
  CASE c.relreplident
    WHEN 'd' THEN 'default'
    WHEN 'n' THEN 'nothing'
    WHEN 'f' THEN 'full'
    WHEN 'i' THEN 'index'
  END AS replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.oid = '$SOURCE_SCHEMA.$SOURCE_TABLE'::regclass;"

CDF_METADATA="$(run_psql -Atc "SELECT to_regclass('wal2delta.tables');")"
if [[ "$CDF_METADATA" == "wal2delta.tables" ]]; then
    echo "[cdf] Lakehouse Sync metadata is present:"
    run_psql -c "TABLE wal2delta.tables;"
    exit 0
fi

echo "[cdf] Lakehouse Sync is not configured (wal2delta.tables is absent)."
echo "[cdf] The installed Databricks CLI exposes no Autoscaling Lakehouse Sync/CDF create command,"
echo "[cdf] and no Databricks Python SDK is installed, so creation is not automated here."
echo "[cdf] UI fallback:"
echo "[cdf]   App switcher → Lakebase Postgres → $PROJECT_ID → $BRANCH_ID → Lakebase CDF → Start"
echo "[cdf]   Source database/schema/table: $DB_NAME / $SOURCE_SCHEMA / $SOURCE_TABLE"
echo "[cdf]   Destination catalog/schema:  $DESTINATION"
echo "[cdf] Rerun with --status-only after Start Sync; wal2delta.tables will report the live status."

