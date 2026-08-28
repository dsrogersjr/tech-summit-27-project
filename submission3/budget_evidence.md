# Submission 3 — Budget Policy Evidence

## Budget: `tech_summit_27_sentenel`

| Field | Value |
| --- | --- |
| Budget Policy ID | `f3f67b92-c3de-3903-b6a2-3f7ee227de07` |
| Workspace ID | `7474651808472462` |
| Owner | `doug.rogers@databricks.com` |
| Custom Tags | `databricks-default-policy: true` |
| Region | US East (Ohio) |
| Data Source | `system.billing.usage` |
| Observation Date | 2026-08-28 |

## Usage Summary (August 2026)

| Product | SKU | DBUs | Records |
| --- | --- | --- | --- |
| INTERACTIVE | ENTERPRISE_ALL_PURPOSE_SERVERLESS_COMPUTE_US_EAST_OHIO | 4.7842 | 25 |
| JOBS | ENTERPRISE_JOBS_SERVERLESS_COMPUTE_US_EAST_OHIO | 0.9632 | 3 |
| DLT | ENTERPRISE_JOBS_SERVERLESS_COMPUTE_US_EAST_OHIO | 0.5290 | 2 |
| **Total** | | **6.2764** | **30** |

## DAB Integration Status

Budget policies are **account-level administrative resources** managed via the
Databricks account console or the `databricks account budget-policy` CLI commands.
They are **not a supported Declarative Automation Bundle resource type** and cannot
be declared in `databricks.yml`.

### Why budgets cannot be included in a DAB

1. Budgets are scoped to the **account**, not the workspace — they can span
   multiple workspaces and track aggregate spend.
2. The Budgets API (`/api/2.0/budget-policies`) is an **account-level endpoint**
   requiring account-admin credentials, not workspace-scoped tokens.
3. The [supported DAB resources](https://docs.databricks.com/en/dev-tools/bundles/resources/)
   do not include `budget_policy` or `budget`.

### How the budget relates to this project

The `tech_summit_27_sentenel` budget policy is applied to serverless compute in
this workspace. All interactive notebook sessions, Lakeflow Jobs runs, and SDP
pipeline updates in workspace `7474651808472462` are attributed to this policy
(confirmed via `usage_metadata.budget_policy_id` in `system.billing.usage`).

### Recommended management approach

Since the budget cannot live inside the DAB, it should be managed alongside the
project via one of:

- **Account CLI script**: `databricks account budget-policy get --budget-policy-id f3f67b92-c3de-3903-b6a2-3f7ee227de07`
- **Terraform**: `databricks_budget` resource in the Databricks Terraform provider
- **Documentation** (this file): reference the budget policy ID so the project
  maintains traceability to its cost governance configuration

## Query Used

```sql
SELECT
  usage_metadata.budget_policy_id,
  billing_origin_product,
  sku_name,
  usage_date,
  sum(usage_quantity) as total_dbus,
  count(*) as record_count,
  first(custom_tags) as sample_tags
FROM system.billing.usage
WHERE workspace_id = '7474651808472462'
  AND usage_metadata.budget_policy_id IS NOT NULL
  AND usage_date >= '2026-08-01'
GROUP BY 1, 2, 3, 4
ORDER BY budget_policy_id, usage_date DESC, total_dbus DESC
```

## Supporting File

- `budget_usage.json` — raw query results with per-record detail
