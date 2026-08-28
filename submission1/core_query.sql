SELECT
  program,
  signal,
  COUNT(DISTINCT payment_id) AS payment_count
FROM
  (
    SELECT
      q.program,
      q.payment_id,
      EXPLODE(q.signal_list) AS signal
    FROM
      tech_summit_27_sentenel.dev_doug_rogers_sentinel_ipp.gold_open_queue q
  )
GROUP BY
  program,
  signal
ORDER BY
  program,
  payment_count DESC