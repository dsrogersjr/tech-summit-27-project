# Databricks notebook source
"""
Deploy the Sentinel Payment Integrity Genie Space — DAB setup-job task.

Loads the committed genie_space.json (curated questions + curated SQLs + story
instructions), substitutes the authored catalog/schema for the deployed one,
then creates or updates the space via the SDK. Idempotent: searches by title,
updates if present, creates if not.

═══════════════════════════════════════════════════════════════════════════
GOTCHAS — proven the hard way; do NOT "simplify" these away:
  • list_spaces PAGINATION: w.genie.list_spaces returns a GenieListSpacesResponse
    OBJECT (.spaces list + .next_page_token), NOT a generator. Loop on
    next_page_token or you'll only see the first page and create duplicates.
  • LOAD-FROM-JSON + literal string-replace of the catalog.schema qualifier (it
    appears in table identifiers AND inside SQL bodies, so a JSON-tree walk misses
    the SQL ones).

REQUIRES: databricks-sdk>=0.114.0 (environment_key: sdk_latest).

Parameters (base_parameters):
- catalog, schema, warehouse_id

Outputs (dbutils.jobs.taskValues.set):
- genie_space_id
"""

# COMMAND ----------

SPACE_TITLE = "Sentinel Payment Integrity"
SPACE_DESCRIPTION = (
    "Pre-disbursement improper-payment prevention for the Benefits Agency. A "
    "cross-agency fraud-match feed + eligibility refresh ~3 weeks ago surfaced a "
    "spike of high-risk flagged payments; each point of improper rate prevented "
    "is ~$600M/yr. Ask about queue exposure, per-program risk, and the prescribed "
    "disposition for the live TANF hero payment PAY-0000202."
)

# The catalog.schema baked into the committed genie_space.json (authored against
# solution_builder.sentinel_ipp). Literal-replaced with the deployed catalog.schema.
SRC_QUALIFIER = "solution_builder.sentinel_ipp"

# COMMAND ----------

dbutils.widgets.text("catalog", "", "Catalog")
dbutils.widgets.text("schema",  "", "Schema")
dbutils.widgets.text("warehouse_id", "", "Warehouse ID")

catalog      = dbutils.widgets.get("catalog")
schema       = dbutils.widgets.get("schema")
warehouse_id = dbutils.widgets.get("warehouse_id")

assert catalog and schema and warehouse_id, "catalog + schema + warehouse_id are required"

print(f"Deploying Genie Space: '{SPACE_TITLE}'")
print(f"  catalog.schema: {catalog}.{schema}")
print(f"  warehouse:      {warehouse_id}")

# COMMAND ----------

import json
import os
from databricks.sdk import WorkspaceClient

# genie_space.json lives at the bundle root (this notebook is at
# <root>/src/deploy/deploy_genie.py → three dirnames up = bundle root).
notebook_path = dbutils.notebook.entry_point.getDbutils().notebook().getContext().notebookPath().get()
bundle_root   = os.path.dirname(os.path.dirname(os.path.dirname(notebook_path)))
config_path   = f"/Workspace{bundle_root}/genie_space.json"
print(f"Loading: {config_path}")

with open(config_path) as f:
    serialized = f.read()

DST_QUALIFIER = f"{catalog}.{schema}"
n = serialized.count(SRC_QUALIFIER)
substituted = serialized.replace(SRC_QUALIFIER, DST_QUALIFIER)
print(f"Substituted {n} occurrences of {SRC_QUALIFIER} → {DST_QUALIFIER}")

space_payload = json.loads(substituted)
print(f"data_sources.tables: {len(space_payload['data_sources']['tables'])}")
print(f"sample_questions:    {len(space_payload['config']['sample_questions'])}")
print(f"example_sqls:        {len(space_payload['instructions']['example_question_sqls'])}")

# COMMAND ----------

w = WorkspaceClient()

existing_id = None
page_token = None
while True:
    resp = w.genie.list_spaces(page_size=200, page_token=page_token)
    for sp in (resp.spaces or []):
        if sp.title == SPACE_TITLE:
            existing_id = sp.space_id
            print(f"Found existing space: {existing_id}")
            break
    if existing_id or not getattr(resp, "next_page_token", None):
        break
    page_token = resp.next_page_token

# COMMAND ----------

if existing_id:
    print(f"Updating space {existing_id}…")
    w.genie.update_space(
        space_id=existing_id,
        warehouse_id=warehouse_id,
        serialized_space=substituted,
    )
    space_id = existing_id
else:
    print("Creating new space…")
    created = w.genie.create_space(
        warehouse_id=warehouse_id,
        title=SPACE_TITLE,
        description=SPACE_DESCRIPTION,
        serialized_space=substituted,
    )
    space_id = created.space_id

print(f"Genie space ready: {space_id}")

# COMMAND ----------

dbutils.jobs.taskValues.set(key="genie_space_id", value=space_id)
print(f"task value set: genie_space_id = {space_id}")
