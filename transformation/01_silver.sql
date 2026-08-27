-- Sentinel — Silver layer. Reads raw parquet from the raw_data Volume via read_files().
-- No bronze pass-through. See specifications/01-lakeflow.md.

-- Dedup helper: signals attached at (payment, signal) grain → one row per payment.
CREATE OR REFRESH MATERIALIZED VIEW payment_signal_summary AS
SELECT
  payment_id,
  COUNT(*) AS n_signals,
  COLLECT_LIST(signal) AS signal_list,
  ARRAY_AGG(CASE
    WHEN signal IN ('duplicate_identity', 'deceased_payee', 'cross_agency_fraud_flag') THEN 'strong'
    WHEN signal IN ('income_mismatch', 'benefit_overlap', 'employment_mismatch') THEN 'moderate'
    ELSE 'weak'
  END) AS signal_strengths,
  MAX(CASE WHEN signal IN ('duplicate_identity', 'deceased_payee', 'cross_agency_fraud_flag') THEN 1 ELSE 0 END) AS has_strong_signal
FROM read_files('/Volumes/${catalog}/${schema}/raw_data/payment_fraud_flags', format => 'parquet')
GROUP BY payment_id;

-- Per-payment current status, denormalized. Only flagged payments (n_signals >= 1) land here.
CREATE OR REFRESH MATERIALIZED VIEW silver_payments_flagged
CLUSTER BY (queue_date)
AS
SELECT
  p.payment_id,
  p.beneficiary_id,
  p.claim_id,
  b.program,
  b.state,
  p.payment_amount_usd,
  p.queue_date,
  p.payment_status,
  c.claim_type,
  s.n_signals,
  s.signal_list,
  s.signal_strengths,
  CASE
    WHEN s.n_signals >= 2 AND s.has_strong_signal = 1 THEN 'high'
    WHEN s.n_signals >= 1 THEN 'moderate'
    ELSE 'low'
  END AS risk_level
FROM read_files('/Volumes/${catalog}/${schema}/raw_data/payments', format => 'parquet') p
JOIN read_files('/Volumes/${catalog}/${schema}/raw_data/beneficiaries', format => 'parquet') b
  ON p.beneficiary_id = b.beneficiary_id
LEFT JOIN read_files('/Volumes/${catalog}/${schema}/raw_data/claims', format => 'parquet') c
  ON p.claim_id = c.claim_id
JOIN payment_signal_summary s
  ON p.payment_id = s.payment_id;

-- Case outcome history, denormalized. Powers disposition-model training + analytics.
CREATE OR REFRESH MATERIALIZED VIEW silver_disposition_outcomes AS
SELECT
  o.case_id,
  o.beneficiary_id,
  b.program,
  b.state,
  o.case_date,
  o.amount_usd,
  o.n_signals,
  CASE
    WHEN o.n_signals >= 3 THEN 'stacked_strong'
    WHEN o.n_signals = 2 THEN 'mixed'
    WHEN o.n_signals = 1 THEN 'single'
    ELSE 'none'
  END AS signal_strength_mix,
  o.disposition_chosen,
  o.was_improper,
  o.recovery_amount_usd,
  o.days_to_resolution
FROM read_files('/Volumes/${catalog}/${schema}/raw_data/disposition_outcomes', format => 'parquet') o
LEFT JOIN read_files('/Volumes/${catalog}/${schema}/raw_data/beneficiaries', format => 'parquet') b
  ON o.beneficiary_id = b.beneficiary_id;
