# Databricks notebook source
# MAGIC %md
# MAGIC # Classify raw payment signals
# MAGIC
# MAGIC Batch-classifies the distinct raw parquet fraud flags into a governed
# MAGIC Delta lookup before the declarative pipeline runs. `ai_classify` is kept
# MAGIC out of the materialized views because AI Functions are not supported in
# MAGIC their definitions.

# COMMAND ----------

from __future__ import annotations

import re

dbutils.widgets.text("catalog", "", "Catalog")
dbutils.widgets.text("schema", "", "Schema")

CATALOG = dbutils.widgets.get("catalog")
SCHEMA = dbutils.widgets.get("schema")

_UC_IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
assert _UC_IDENTIFIER.fullmatch(CATALOG), f"Invalid catalog identifier: {CATALOG!r}"
assert _UC_IDENTIFIER.fullmatch(SCHEMA), f"Invalid schema identifier: {SCHEMA!r}"

SOURCE_PATH = f"/Volumes/{CATALOG}/{SCHEMA}/raw_data/payment_fraud_flags"
TARGET_TABLE = f"`{CATALOG}`.`{SCHEMA}`.`payment_signal_classification`"

signals = (
    spark.read.parquet(SOURCE_PATH)
    .selectExpr("signal", "replace(signal, '_', ' ') AS signal_text")
    .where("signal IS NOT NULL")
    .distinct()
)
signals.createOrReplaceTempView("distinct_payment_signals")

# COMMAND ----------

# ai_classify returns a VARIANT with an array of matching labels under
# `response`. Classification remains explanatory; deterministic risk rules stay
# authoritative.
spark.sql(
    f"""
    CREATE OR REPLACE TABLE {TARGET_TABLE}
    USING DELTA
    COMMENT 'AI-classified payment fraud flags; deterministic pipeline risk remains authoritative'
    TBLPROPERTIES (
      'sentinel.ai_function' = 'ai_classify'
    )
    AS
    WITH classified AS (
      SELECT
        signal,
        ai_classify(
          signal_text,
          '{{"fraud": "Identity, deceased-payee, duplicate, or cross-agency fraud indicators",
             "eligibility": "Income, employment, residence, or benefit eligibility mismatches",
             "administrative": "Manual review, workflow, data-quality, or other administrative indicators"}}',
          map(
            'instructions', 'Classify each government improper-payment signal by its primary operational meaning.',
            'multilabel', 'false'
          )
        ) AS classification
      FROM distinct_payment_signals
    )
    SELECT
      signal,
      classification:response[0]::STRING AS signal_category,
      CAST(NULL AS DOUBLE) AS classification_confidence,
      classification:error_message::STRING AS classification_error,
      current_timestamp() AS classified_at
    FROM classified
    """
)

result = spark.table(f"{CATALOG}.{SCHEMA}.payment_signal_classification")
count = result.count()
missing = result.where("signal_category IS NULL").count()
if missing:
    raise RuntimeError(f"ai_classify returned no category for {missing} of {count} signals")

print(f"Classified {count} distinct signals into {TARGET_TABLE}")
result.orderBy("signal").display()

