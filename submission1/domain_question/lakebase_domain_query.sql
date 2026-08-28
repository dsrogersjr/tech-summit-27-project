-- Low-latency domain question, answered against LAKEBASE (Postgres), not Spark/UC.
--
-- Business question (submission1/core_question.txt):
--   "Dive deeper into TANF and why they have more fraud detection than other organizations."
--
-- This is the low-latency equivalent of submission1/core_query.sql (which runs
-- the same aggregation in Spark against the UC gold table via EXPLODE). Here it
-- runs directly on the Lakebase synced mirror `app.payment_position` — a
-- transactional Postgres read that returns in tens of milliseconds (see
-- lakebase_domain_result.txt for measured latencies).
--
-- `app.payment_position` is the read-only synced mirror of the gold
-- `gold_queue_scored` table (see app/server/db/schema.ts). `signals` is the
-- comma-joined fraud-signal list; `program` is the benefits program.
--
-- Connection: Lakebase instance sentenel-tech-summit-27,
--   database sentenel_tech_summit_27, branch production, schema app.

-- Q1 — Per-program summary: WHY does TANF stand out?
SELECT program,
       COUNT(*)                                              AS flagged_payments,
       SUM(n_signals)                                        AS total_signals,
       ROUND(AVG(n_signals)::numeric, 2)                     AS avg_signals_per_payment,
       ROUND(SUM(improper_payment_exposure_usd)::numeric, 2) AS total_exposure_usd
FROM app.payment_position
GROUP BY program
ORDER BY total_signals DESC;

-- Q2 — Signal-type breakdown per program (low-latency equivalent of the Spark
-- EXPLODE query in core_query.sql). Postgres unnests the comma-joined signal
-- list with string_to_array + LATERAL unnest.
SELECT p.program,
       trim(s.signal)               AS signal,
       COUNT(DISTINCT p.payment_id) AS payment_count
FROM app.payment_position p,
     LATERAL unnest(string_to_array(p.signals, ',')) AS s(signal)
WHERE p.signals IS NOT NULL AND p.signals <> ''
GROUP BY p.program, trim(s.signal)
ORDER BY p.program, payment_count DESC, signal;
