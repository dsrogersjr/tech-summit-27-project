-- Live Operations-queue view — the CLOSED-LOOP read-back.
--
-- This is the query behind the queue in the app. It is the SELECT list from
-- PAYMENT_SELECT in app/server/db/queries/cases.ts (listPayments / getPayment),
-- reduced to the columns the exam-review surfaces show.
--
-- It reads the synced read-only mirror app.payment_position and LEFT JOINs:
--   * app.dispo_recs            → the model's recommended disposition, and
--   * the LATEST app.case_actions row (via LATERAL) → the LIVE disposition +
--     approval status the examiner committed through the Act layer
--     (execute_case_action).
--
-- Because the live_disposition / action_status columns come from the writable
-- case_actions table, an approved decision written by the agent is reflected
-- here on the very next read — closing the loop. The hero payment PAY-0000202
-- shows live_disposition = 'hold_for_verification', action_status = 'approved',
-- approved_by = the examiner; every still-open payment shows NULLs.
--
-- Returned rows: submission2/view_result.json.

SELECT
  p.payment_id,
  p.program,
  p.state,
  ROUND(p.improper_payment_exposure_usd::numeric, 2) AS improper_payment_exposure_usd,
  p.risk_level,
  dr.recommended_disposition,
  la.action_type AS live_disposition,   -- from the writable case_actions table
  la.status      AS action_status,      -- proposed | approved | executed | overridden
  la.approved_by,                       -- OBO-stamped examiner who approved
  la.decided_at
FROM app.payment_position p
LEFT JOIN app.dispo_recs dr
  ON dr.payment_id = p.payment_id
LEFT JOIN LATERAL (
  SELECT a.action_type, a.status, a.approved_by, a.decided_at
  FROM app.case_actions a
  WHERE a.payment_id = p.payment_id
  ORDER BY a.created_at DESC
  LIMIT 1
) la ON true
-- Surface decided cases first, then the highest-exposure open payments.
ORDER BY (la.action_type IS NOT NULL) DESC,
         p.improper_payment_exposure_usd DESC NULLS LAST
LIMIT 10;
