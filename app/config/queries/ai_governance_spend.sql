-- Current-workspace AI governance spend, fixed to a safe 30-day window.
-- The workspace id is supplied by the server from DATABRICKS_WORKSPACE_ID;
-- callers cannot provide SQL, product names, or an unbounded date range.
-- Cost is estimated at USD list price and does not include account discounts.
-- @param workspace_id STRING = 0
WITH product_scope(product) AS (
  SELECT *
  FROM VALUES
    ('MODEL_SERVING'),
    ('AI_GATEWAY'),
    ('APPS'),
    ('GENIE')
),
recent_usage AS (
  SELECT
    billing_origin_product AS product,
    sku_name,
    usage_unit,
    usage_quantity,
    usage_end_time
  FROM system.billing.usage
  WHERE workspace_id = :workspace_id
    AND usage_date BETWEEN date_sub(current_date(), 29) AND current_date()
    AND billing_origin_product IN ('MODEL_SERVING', 'AI_GATEWAY', 'APPS', 'GENIE')
),
usd_list_prices AS (
  SELECT
    sku_name,
    usage_unit,
    price_start_time,
    price_end_time,
    try_variant_get(
      to_variant_object(pricing),
      '$.effective_list.default',
      'decimal(38,18)'
    ) AS unit_price_usd
  FROM system.billing.list_prices
  WHERE currency_code = 'USD'
),
priced_usage AS (
  SELECT
    u.product,
    u.usage_quantity * p.unit_price_usd AS list_price_cost_usd,
    p.unit_price_usd IS NULL AS is_unpriced
  FROM recent_usage u
  LEFT JOIN usd_list_prices p
    ON u.sku_name = p.sku_name
    AND u.usage_unit = p.usage_unit
    AND u.usage_end_time >= p.price_start_time
    AND (p.price_end_time IS NULL OR u.usage_end_time < p.price_end_time)
),
product_rollup AS (
  SELECT
    product,
    CAST(COUNT(*) AS BIGINT) AS usage_records,
    CAST(COUNT_IF(is_unpriced) AS BIGINT) AS unpriced_records,
    CAST(ROUND(SUM(COALESCE(list_price_cost_usd, 0)), 2) AS DECIMAL(18,2))
      AS list_price_cost_usd
  FROM priced_usage
  GROUP BY product
)
SELECT
  scope.product,
  date_sub(current_date(), 29) AS reporting_start,
  current_date() AS reporting_end,
  COALESCE(rollup.list_price_cost_usd, CAST(0 AS DECIMAL(18,2)))
    AS list_price_cost_usd,
  CAST(
    SUM(COALESCE(rollup.list_price_cost_usd, CAST(0 AS DECIMAL(18,2)))) OVER ()
    AS DECIMAL(18,2)
  ) AS total_list_price_cost_usd,
  COALESCE(rollup.usage_records, 0) AS usage_records,
  COALESCE(rollup.unpriced_records, 0) AS unpriced_records
FROM product_scope scope
LEFT JOIN product_rollup rollup
  ON scope.product = rollup.product
ORDER BY list_price_cost_usd DESC, scope.product
