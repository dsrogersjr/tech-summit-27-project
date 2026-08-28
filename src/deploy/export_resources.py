# Databricks notebook source
"""
Export the resolved Sentinel resource IDs as the job's exit value — FINAL task
of the DAB setup job.

Collects the bundle-resolved IDs (passed via base_parameters) plus the
SDK-created Genie space id (via {{tasks.deploy_genie.values.genie_space_id}})
and emits them as a single JSON via dbutils.notebook.exit().

WHY exit() (not taskValues): finalize_app.sh reads this JSON back through
`databricks jobs get-run-output` → notebook_output.result, then writes the
app's env + redeploys. The exit value IS retrievable post-run; task-values are
not (cleanly) retrievable from outside the job.

This demo has NO ML model, KA, or MAS (the disposition is a pipeline heuristic
and the app's data tool is Genie used directly), so those fields are omitted.

Parameters (base_parameters):
- catalog, schema, app_name, dashboard_id, workspace_usage_dashboard_id,
  pipeline_id, warehouse_id, supervisor_emails
- genie_space_id (from the deploy_genie task value)
"""

# COMMAND ----------

import json
from databricks.sdk import WorkspaceClient

names = [
    "catalog", "schema", "app_name",
    "dashboard_id", "workspace_usage_dashboard_id",
    "pipeline_id", "warehouse_id", "supervisor_emails",
    "genie_space_id",
]
for n in names:
    dbutils.widgets.text(n, "", n)

vals = {n: dbutils.widgets.get(n) for n in names}

# Guard: if task-value substitution didn't fire, the value is the literal
# template string — fail loudly rather than export garbage.
v = vals["genie_space_id"]
if v.startswith("{{") and v.endswith("}}"):
    raise RuntimeError(f"genie_space_id={v!r} — task value substitution didn't fire.")

resources = {
    "catalog":                      vals["catalog"],
    "schema":                       vals["schema"],
    "app_name":                     vals["app_name"],
    "dashboard_id":                 vals["dashboard_id"],
    "workspace_usage_dashboard_id": vals["workspace_usage_dashboard_id"],
    "pipeline_id":                  vals["pipeline_id"],
    "warehouse_id":                 vals["warehouse_id"],
    "genie_space_id":               vals["genie_space_id"],
    "supervisor_emails":             vals["supervisor_emails"],
    "workspace_id":                  str(WorkspaceClient().get_workspace_id()),
    "metric_view_name":             f"{vals['catalog']}.{vals['schema']}.mv_payment_risk",
    "agent_mlflow_experiment_path": f"/Shared/solution_builder/{vals['app_name']}-agent-traces",
}

print("Exporting resources:")
for k, val in resources.items():
    print(f"  {k} = {val}")

# COMMAND ----------

dbutils.notebook.exit(json.dumps(resources))
