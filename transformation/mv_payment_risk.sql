CREATE OR REPLACE VIEW solution_builder.sentinel_ipp.mv_payment_risk
WITH METRICS
LANGUAGE YAML
AS $$
version: 1.1
source: solution_builder.sentinel_ipp.gold_queue_scored
comment: "Sentinel governed pre-disbursement payment-risk metrics. Dashboard tiles, Genie, and the app all read these measures."
dimensions:
  - name: program
    expr: program
  - name: risk_level
    expr: risk_level
  - name: recommended_disposition
    expr: recommended_disposition
measures:
  - name: payment_count
    expr: COUNT(1)
  - name: total_queue_value_usd
    expr: SUM(payment_amount_usd)
  - name: flagged_payment_count
    expr: COUNT(1)
  - name: improper_payment_exposure_usd
    expr: SUM(improper_payment_exposure_usd)
  - name: projected_recovery_if_investigated_usd
    expr: SUM(projected_recovery_if_investigated_usd)
  - name: avg_payment_amount_usd
    expr: AVG(payment_amount_usd)
  - name: avg_n_signals
    expr: AVG(n_signals)
  - name: high_confidence_count
    expr: SUM(CASE WHEN confidence_score >= 0.85 THEN 1 ELSE 0 END)
  - name: release_recommended_count
    expr: SUM(CASE WHEN recommended_disposition = 'release' THEN 1 ELSE 0 END)
  - name: hold_recommended_count
    expr: SUM(CASE WHEN recommended_disposition = 'hold_for_verification' THEN 1 ELSE 0 END)
  - name: investigate_recommended_count
    expr: SUM(CASE WHEN recommended_disposition = 'refer_to_investigation' THEN 1 ELSE 0 END)
$$;
