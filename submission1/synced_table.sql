SELECT
  payment_id,
  program,
  risk_level,
  state,
  ROUND(payment_amount_usd, 2) AS payment_amount_usd,
  queue_date,
  n_signals,
  signal_list,
  ROUND(improper_payment_exposure_usd, 2) AS improper_payment_exposure_usd,
  recommended_disposition,
  confidence_score
FROM tech_summit_27_sentenel.dev_doug_rogers_sentinel_ipp.gold_queue_scored
ORDER BY improper_payment_exposure_usd DESC
LIMIT 5;
