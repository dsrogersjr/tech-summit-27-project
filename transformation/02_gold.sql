-- Sentinel — Gold layer. Aggregations + the ranked disposition recommendation (heuristic).
-- See specifications/01-lakeflow.md → Silver → Gold.

-- The heart of the demo: one row per OPEN flagged payment with signals, exposure, and recommendation.
CREATE OR REFRESH MATERIALIZED VIEW gold_open_queue AS
WITH scored AS (
  SELECT
    payment_id,
    beneficiary_id,
    program,
    state,
    payment_amount_usd,
    queue_date,
    n_signals,
    signal_list,
    signal_strengths,
    risk_level,
    -- projected $ loss if released and the payment is improper
    ROUND(CASE
      WHEN risk_level = 'high' THEN payment_amount_usd * 0.80
      WHEN risk_level = 'moderate' THEN payment_amount_usd * 0.15
      ELSE payment_amount_usd * 0.02
    END, 2) AS improper_payment_exposure_usd,
    -- did this payment carry a strong signal type?
    CASE WHEN ARRAY_CONTAINS(signal_strengths, 'strong') THEN 1 ELSE 0 END AS has_strong
  FROM silver_payments_flagged
  WHERE queue_date <= DATE '${snapshot_date}'
)
SELECT
  payment_id,
  beneficiary_id,
  program,
  state,
  payment_amount_usd,
  queue_date,
  n_signals,
  signal_list,
  signal_strengths,
  risk_level,
  improper_payment_exposure_usd,
  ROUND(improper_payment_exposure_usd * 0.65, 2) AS projected_recovery_if_investigated_usd,
  has_strong
FROM scored;

-- Historical dispositions + outcomes for model training/validation + heuristic thresholds.
CREATE OR REFRESH MATERIALIZED VIEW gold_case_outcomes AS
SELECT
  case_id,
  n_signals,
  signal_strength_mix,
  amount_usd,
  disposition_chosen,
  was_improper,
  recovery_amount_usd,
  days_to_resolution,
  CASE WHEN was_improper AND recovery_amount_usd > 0 THEN recovery_amount_usd ELSE 0 END AS recovery_outcome
FROM silver_disposition_outcomes;

-- The ranked disposition per open flagged payment — hardcoded heuristic (argmax of net recovery value).
CREATE OR REFRESH MATERIALIZED VIEW gold_disposition_recommendations AS
WITH base AS (
  SELECT
    payment_id,
    program,
    risk_level,
    n_signals,
    signal_list,
    payment_amount_usd,
    improper_payment_exposure_usd,
    projected_recovery_if_investigated_usd,
    has_strong,
    -- simplified citizen delay cost over a 3-day hold (0.5%/day of amount)
    ROUND(payment_amount_usd * 0.005 * 3, 2) AS citizen_delay_cost_usd
  FROM gold_open_queue
)
SELECT
  payment_id,
  program,
  risk_level,
  n_signals,
  signal_list,
  improper_payment_exposure_usd,
  projected_recovery_if_investigated_usd,
  CASE
    WHEN n_signals >= 3 THEN 'refer_to_investigation'
    WHEN n_signals = 2 OR has_strong = 1 THEN 'hold_for_verification'
    ELSE 'release'
  END AS recommended_disposition,
  CASE
    WHEN n_signals >= 2 AND has_strong = 1 THEN 0.95
    WHEN n_signals = 1 THEN 0.70
    ELSE 0.40
  END AS confidence_score,
  citizen_delay_cost_usd,
  CONCAT(
    UPPER(SUBSTRING(risk_level, 1, 1)), SUBSTRING(risk_level, 2),
    '-risk: ', CAST(n_signals AS STRING), ' fraud signal(s) on a $',
    FORMAT_NUMBER(payment_amount_usd, 0), ' ', program, ' payment → estimated $',
    FORMAT_NUMBER(improper_payment_exposure_usd, 0), ' improper exposure, $',
    FORMAT_NUMBER(projected_recovery_if_investigated_usd, 0), ' projected recovery if investigated. ',
    CASE
      WHEN n_signals >= 3 THEN 'Recommend refer-to-investigation: stacked signals justify a full investigation.'
      WHEN n_signals = 2 OR has_strong = 1 THEN CONCAT('Recommend hold-for-verification: verification (~$', FORMAT_NUMBER(citizen_delay_cost_usd, 0), ' delay cost over 3 days) confirms before disbursement. If improper, recovery is preserved pre-disbursement.')
      ELSE 'Recommend release: single weak signal; citizen-delay cost of holding a likely-legitimate payment outweighs the low projected recovery.'
    END
  ) AS reasoning,
  CONCAT(
    'Case memo — Payment ', payment_id, ' (', program, ', $', FORMAT_NUMBER(payment_amount_usd, 0), '): ',
    CAST(n_signals AS STRING), ' fraud signal(s) [', ARRAY_JOIN(signal_list, ', '), ']. ',
    'Risk level ', risk_level, '. Improper exposure $', FORMAT_NUMBER(improper_payment_exposure_usd, 0),
    '. Prescribed disposition: ',
    CASE
      WHEN n_signals >= 3 THEN 'refer to investigation.'
      WHEN n_signals = 2 OR has_strong = 1 THEN 'hold for verification.'
      ELSE 'release.'
    END
  ) AS memo_scaffold
FROM base;

-- Thin join view for the metric view (queue risk + recommendation counts in one grain).
CREATE OR REFRESH MATERIALIZED VIEW gold_queue_scored AS
SELECT
  q.payment_id,
  q.program,
  q.risk_level,
  q.state,
  q.payment_amount_usd,
  q.queue_date,
  q.n_signals,
  q.signal_list,
  q.improper_payment_exposure_usd,
  q.projected_recovery_if_investigated_usd,
  r.recommended_disposition,
  r.confidence_score
FROM gold_open_queue q
JOIN gold_disposition_recommendations r
  ON q.payment_id = r.payment_id;
