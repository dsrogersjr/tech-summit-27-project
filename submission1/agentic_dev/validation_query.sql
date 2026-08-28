-- Validation of the coding agent's change (rename app.disposition_recommendations
-- → app.dispo_recs) against the LIVE Lakebase production branch.
--
-- Instance : sentenel-tech-summit-27  (branch: production, endpoint: primary)
-- Database : sentenel_tech_summit_27  (Postgres 17.11)
-- Run via  : node pg + `databricks postgres generate-database-credential`
--            (psql is not installed in the authoring environment)
-- Result   : submission1/agentic_dev/validation_result.json  (real output)

-- 1. Which table name is live? (the agent's rename target vs the old name)
SELECT to_regclass('app.dispo_recs')::text                 AS new_table,
       to_regclass('app.disposition_recommendations')::text AS old_table;

-- 2. Full table inventory of the operational `app` schema
SELECT table_name
FROM   information_schema.tables
WHERE  table_schema = 'app'
ORDER  BY table_name;

-- The same to_regclass before/after check is embedded as an automated guard in
-- the migration itself (submission1/agentic_dev/rename_disposition_table.ts):
--   • aborts if BOTH names exist, or NEITHER exists
--   • after ALTER, asserts to_regclass('app.dispo_recs') IS NOT NULL or throws
