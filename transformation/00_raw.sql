-- Sentinel — raw passthrough. Publishes the raw parquet datasets (written to the
-- raw_data Volume by data_generation/generate_data.py) as UC materialized views so
-- downstream consumers that read them directly — the Genie space (raw_beneficiaries,
-- raw_payment_fraud_flags) and the app's high-risk signal-frequency query — resolve
-- on any target catalog/schema. Silver reads the same files via read_files().

CREATE OR REFRESH MATERIALIZED VIEW raw_beneficiaries AS
SELECT * FROM read_files('/Volumes/${catalog}/${schema}/raw_data/beneficiaries', format => 'parquet');

CREATE OR REFRESH MATERIALIZED VIEW raw_payment_fraud_flags AS
SELECT * FROM read_files('/Volumes/${catalog}/${schema}/raw_data/payment_fraud_flags', format => 'parquet');

CREATE OR REFRESH MATERIALIZED VIEW raw_payments AS
SELECT * FROM read_files('/Volumes/${catalog}/${schema}/raw_data/payments', format => 'parquet');

CREATE OR REFRESH MATERIALIZED VIEW raw_claims AS
SELECT * FROM read_files('/Volumes/${catalog}/${schema}/raw_data/claims', format => 'parquet');

CREATE OR REFRESH MATERIALIZED VIEW raw_disposition_outcomes AS
SELECT * FROM read_files('/Volumes/${catalog}/${schema}/raw_data/disposition_outcomes', format => 'parquet');
