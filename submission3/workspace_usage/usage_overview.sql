SET ansi_mode = true;

with workspace as (
      SELECT
      account_id,
      workspace_id, 
      workspace_name,
      workspace_url,
      status,
      concat(COALESCE(workspace_name, ''), ' (id: ', workspace_id, ')') AS workspace_full_name
      FROM system.access.workspaces_latest
      WHERE workspace_id = '7474651808472462'
),

-- apply date filter
usage_with_ws_filtered_by_date as (
  select
    case
      when workspace_name is null then concat('id: ', u.workspace_id)
      else workspace_full_name
    end as workspace,
    u.*
  from system.billing.usage as u
  left join workspace
    on u.workspace_id = workspace.workspace_id
  where u.usage_date between :time_range.min and :time_range.max
    AND u.workspace_id = '7474651808472462'
),

-- apply workspace filter
usage_filtered as (
  select
    *,
    CASE WHEN product_features.is_serverless = True THEN 'Serverless' ELSE 'Classic' END AS IsServerless,
    CASE WHEN product_features.is_photon = True THEN 'Photon' ELSE 'Spark' END AS IsPhoton
  from usage_with_ws_filtered_by_date
  where  
  -- Product SKU filter
  (array_contains(:product_category, billing_origin_product) OR array_contains(:product_category,'all'))
  AND   (array_contains(:is_serverless, CASE WHEN product_features.is_serverless = True THEN 'Serverless' ELSE 'Classic' END) OR array_contains(:is_serverless,'all'))
),

parsed_discounts_table AS (
  
  WITH split_data AS (
    SELECT explode(split(regexp_replace(upper(:discounts_by_product), '\\s+', ''), ';')) AS kv_pair
    FROM VALUES(1) AS dummy(x)
  ),
  clean_keys AS (
    SELECT 
      ROW_NUMBER() OVER (ORDER BY kv_pair) AS order_id,
      split(kv_pair, '=')[0] AS product,
      try_cast(split(kv_pair, '=')[1] AS decimal(10,3)) AS discount,
      kv_pair AS combination,
      CASE WHEN contains(kv_pair, '=') THEN 1 ELSE 0 END AS ContainsValuePair
    FROM split_data
  )
  SELECT * FROM clean_keys WHERE ContainsValuePair = 1
),

-- calc list priced usage in USD
prices as (
  select coalesce(price_end_time, date_add(current_date, 1)) as coalesced_price_end_time, 
  sku_name, usage_unit, price_start_time,
  CASE WHEN :price_table = 'system.billing.list_prices' THEN try_variant_get(to_variant_object(pricing), '$.effective_list.default', 'decimal(38,18)')
       WHEN :price_table = 'system.billing.account_prices' THEN try_variant_get(to_variant_object(pricing), '$.default', 'decimal(38,18)')
      END AS unit_px
  from IDENTIFIER(:price_table)
  WHERE
  currency_code = 'USD' 
),

list_priced_usd as (
  select /*+ BROADCAST(p) */
      -- Dynamic Prices Logic
      COALESCE(
        -- When there is a * global discounts, then use that for all
        (1-try_cast(regexp_extract(:discounts_by_product, '\\s*\\*\\s*=\\s*([0-9]*\\.?[0-9]+)', 1) AS decimal(10, 3)))* p.unit_px * u.usage_quantity,
            -- When no account prices enabled, then use overrides first then default pricing
        (1-COALESCE(discounts.discount, 0))* p.unit_px * u.usage_quantity,
        -- When all else fails, use default
        p.unit_px * u.usage_quantity) as usage_usd,
    usage_quantity AS usage_dbus,
    date_trunc('YEAR', usage_date) as usage_year,
    date_trunc('QUARTER', usage_date) as usage_quarter,
    date_trunc('MONTH', usage_date) as usage_month,
    date_trunc('WEEK', usage_date) as usage_week,
    MIN(usage_date) OVER () AS start_time,
    MAX(usage_date) OVER () AS end_time,
    u.*
  from usage_filtered as u
  LEFT JOIN parsed_discounts_table AS discounts ON (discounts.product = u.sku_name OR discounts.product = u.billing_origin_product)
  left join prices as p
     ON u.sku_name=p.sku_name
    and u.usage_unit=p.usage_unit
    and (u.usage_end_time between p.price_start_time and p.coalesced_price_end_time)
),

-- eval time_key param
list_priced_usd_with_time_key as (
  select
    identifier
    (
      case
        when :param_time_key = 'Year' then 'usage_year'
        when :param_time_key = 'Quarter' then 'usage_quarter'
        when :param_time_key = 'Month' then 'usage_month'
        when :param_time_key = 'Week' then 'usage_week'
        when :param_time_key = 'Day' then 'usage_date'
        else 'usage_date'
      end
    )::date as time_key,
    *
  from list_priced_usd
),

list_priced_usd_with_time_and_group_keys as (
  select
    workspace as workspace_norm,
    CASE
      WHEN :param_group_key = 'Product' THEN billing_origin_product
      WHEN :param_group_key = 'SKU' THEN sku_name
      WHEN :param_group_key = 'Photon' THEN IsPhoton
      WHEN :param_group_key = 'Serverless' THEN IsServerless
    END AS group_key,
    *
  from list_priced_usd_with_time_key u
),

clean_results AS (
-- query
select
  time_key, group_key,
   CASE WHEN :usage_toggle = 'Dollars' THEN usage_usd
   WHEN :usage_toggle = 'DBUs' THEN usage_dbus
   ELSE usage_usd
   END AS usage_usd_dynamic,
   usage_usd,
   usage_unit,
   usage_dbus,
    IsServerless,
    workspace_norm,
    'Actuals' AS usage_type,
    CONCAT('per ', CAST(:param_time_key AS STRING)) AS time_period,
    start_time AS start_time_window,
    end_time AS end_time_window,
    CONCAT(CAST(start_time AS STRING), ' to ', CAST(end_time AS STRING)) AS time_window_string
from list_priced_usd_with_time_and_group_keys
)

SELECT * FROM clean_results