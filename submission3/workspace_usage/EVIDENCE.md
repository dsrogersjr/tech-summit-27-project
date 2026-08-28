# Sentinel Workspace Usage dashboard

The workspace usage Lakeview dashboard declared as DAB resource
`dashboards.sentinel_workspace_usage`. Evidence is taken only from that
resource: `databricks.yml` + `sentinel_workspace_usage.lvdash.json`.

| Piece | File | What it is |
|---|---|---|
| Build construct — DAB | `databricks_yml_excerpt.yml` | Resource key, display name, file path, warehouse binding, `sync.include` |
| Build construct — dashboard definition | repo-root `sentinel_workspace_usage.lvdash.json` (not copied here; ~495 KB) | Full Lakeview JSON: 6 pages, 27 datasets |
| Inventory extracted from that JSON | `dashboard_inventory.json` | Page names + dataset names/sizes |
| Core dataset SQL from that JSON | `usage_overview.sql` | `usage_overview` queryLines as shipped in the dashboard |

## What the dashboard is

Pages (from the JSON `pages[].displayName`):

1. Usage Overview
2. Usage Overview - Top N
3. Usage Analysis - Tag Matching
4. Usage Analysis - Top Objects
5. README
6. Global Filters

The `usage_overview` dataset reads `system.billing.usage` (and
`system.access.workspaces_latest` / list prices) with the workspace id
hardcoded in the dashboard SQL as `7474651808472462`. Parameterized
`:time_range`, `:product_category`, `:price_table`, etc. live in that same
dataset — they are dashboard filters, not a separate query.

Added on `feat/ai-governance` in commit `fb3b79b`
(`feat: add Sentinel Workspace Usage dashboard to bundle`).
