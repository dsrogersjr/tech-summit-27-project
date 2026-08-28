-- Objective 9b — verify budget-policy governance across ALL AI resources.
-- Workspace 7474651808472462 (tech_summit_27_sentenel). Run window: Aug 2026.
--
-- What this proves: every AI-resource product surfaces its usage in
-- system.billing.usage, AND shows the budget_policy_id it is attributed to.
-- The tech_summit_27_sentenel policy is f3f67b92-c3de-3903-b6a2-3f7ee227de07.
-- An empty budget_policy_id means the product's usage is NOT tagged to a
-- serverless budget policy (it is still fully tracked/reportable).

SELECT
  billing_origin_product,
  COALESCE(usage_metadata.budget_policy_id, '') AS budget_policy_id,
  count(*)                        AS records,
  round(sum(usage_quantity), 4)   AS dbus,
  max(usage_date)                 AS last_day
FROM system.billing.usage
WHERE workspace_id = '7474651808472462'
  AND usage_date >= '2026-08-01'
GROUP BY 1, 2
ORDER BY billing_origin_product, dbus DESC;

-- Serving-endpoint per-request AI usage (app-agent + embeddings + FM proxy).
-- system.serving.endpoint_usage carries per-request token counts; join to
-- served_entities to resolve the endpoint name/type.
SELECT
  se.endpoint_name, se.entity_type, se.task,
  count(*)                     AS requests,
  sum(u.input_token_count)     AS input_tokens,
  sum(u.output_token_count)    AS output_tokens,
  count(DISTINCT u.requester)  AS requesters,
  min(u.request_time)          AS first_request,
  max(u.request_time)          AS last_request
FROM system.serving.endpoint_usage u
JOIN system.serving.served_entities se
  ON u.served_entity_id = se.served_entity_id
WHERE u.workspace_id = '7474651808472462'
  AND u.request_time >= '2026-08-01'
GROUP BY 1, 2, 3
ORDER BY requests DESC;

-- App-agent governed-endpoint inference capture (proves gateway logging is live).
SELECT count(*) AS rows_logged, min(request_time) AS first_row, max(request_time) AS last_row
FROM tech_summit_27_sentenel.dev_doug_rogers_sentinel_ipp.sentinel_agent_llm_payload;
