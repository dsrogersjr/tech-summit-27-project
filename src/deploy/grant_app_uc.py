# Databricks notebook source
"""
Grant the Payment Integrity App's service principal UC privileges — DAB
setup-job task.

The app reads Sentinel's data via SQL warehouse (analytics charts + the
Delta→Lakebase boot sync). Without these grants the app's first /api/config and
the sync crash with:
  INSUFFICIENT_PERMISSIONS: User does not have USE CATALOG on Catalog ...

Granted to the app SP:
  - USE_CATALOG on the catalog
  - USE_SCHEMA + SELECT on the schema (covers gold_*/silver_*/mv_*/raw_* reads)
  - READ_VOLUME on the raw_data volume

This demo ships NO ML model/function (the disposition is a pipeline heuristic),
so there is no EXECUTE-on-function grant. Idempotent — repeated grants no-op.

Parameters:
- catalog, schema, app_name
"""

# COMMAND ----------

# The UC volume the app / sync reads. Sentinel has one: the raw parquet landing zone.
DEMO_VOLUMES = ["raw_data"]

# COMMAND ----------

dbutils.widgets.text("catalog",  "", "Catalog")
dbutils.widgets.text("schema",   "", "Schema")
dbutils.widgets.text("app_name", "", "App name")

catalog  = dbutils.widgets.get("catalog")
schema   = dbutils.widgets.get("schema")
app_name = dbutils.widgets.get("app_name")
assert catalog and schema and app_name

# COMMAND ----------

from databricks.sdk import WorkspaceClient

w = WorkspaceClient()

# Resolve the app SP's client_id (UUID grant target).
app = w.apps.get(name=app_name)
sp_client_id = app.service_principal_client_id
assert sp_client_id, f"App '{app_name}' has no service_principal_client_id"
print(f"App SP: {sp_client_id}")

# COMMAND ----------

grants = [
    f"GRANT USE_CATALOG ON CATALOG {catalog} TO `{sp_client_id}`",
    f"GRANT USE_SCHEMA, SELECT ON SCHEMA {catalog}.{schema} TO `{sp_client_id}`",
]
grants += [
    f"GRANT READ_VOLUME ON VOLUME {catalog}.{schema}.{vol} TO `{sp_client_id}`"
    for vol in DEMO_VOLUMES
]

for stmt in grants:
    print(f"  {stmt}")
    spark.sql(stmt)

print("Grants applied.")
