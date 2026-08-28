-- Objective 10 — queries backing the executive usage report.
-- Workspace 7474651808472462, run window Aug 2026.

-- (A) Cost by product (list-priced USD) -> cost_by_product.json
WITH u AS (
  SELECT billing_origin_product, sku_name, usage_unit, usage_quantity, usage_end_time
  FROM system.billing.usage
  WHERE workspace_id = '7474651808472462' AND usage_date >= '2026-08-01'
),
p AS (
  SELECT sku_name, usage_unit, price_start_time,
         coalesce(price_end_time, date_add(current_date, 1)) AS end_t,
         try_variant_get(to_variant_object(pricing), '$.effective_list.default', 'decimal(38,18)') AS px
  FROM system.billing.list_prices WHERE currency_code = 'USD'
)
SELECT u.billing_origin_product,
       round(sum(u.usage_quantity), 3)                          AS dbus,
       round(sum(u.usage_quantity * coalesce(p.px, 0)), 2)      AS usd
FROM u LEFT JOIN p
  ON u.sku_name = p.sku_name AND u.usage_unit = p.usage_unit
 AND u.usage_end_time BETWEEN p.price_start_time AND p.end_t
GROUP BY 1 ORDER BY usd DESC;

-- (B) App-agent stream: per-endpoint serving usage -> serving_usage_by_endpoint.json
SELECT se.endpoint_name, se.entity_type, se.task,
       count(*) AS requests,
       sum(u.input_token_count)  AS input_tokens,
       sum(u.output_token_count) AS output_tokens,
       count(DISTINCT u.requester) AS requesters,
       min(u.request_time) AS first_request, max(u.request_time) AS last_request
FROM system.serving.endpoint_usage u
JOIN system.serving.served_entities se ON u.served_entity_id = se.served_entity_id
WHERE u.workspace_id = '7474651808472462' AND u.request_time >= '2026-08-01'
GROUP BY 1, 2, 3 ORDER BY requests DESC;

-- (C) Coding-agent stream: confirm Claude usage is NOT in this workspace
--     (routes through the central Unity AI Gateway instead).
SELECT se.endpoint_name, u.workspace_id, count(*) AS requests
FROM system.serving.endpoint_usage u
JOIN system.serving.served_entities se ON u.served_entity_id = se.served_entity_id
WHERE u.request_time >= '2026-08-01'
  AND u.requester = 'doug.rogers@databricks.com'
  AND lower(se.endpoint_name) LIKE '%claude%'
GROUP BY 1, 2;   -- returns 0 rows for workspace 7474651808472462
