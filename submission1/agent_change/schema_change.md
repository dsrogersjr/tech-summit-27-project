# Agent schema change — `table-rename` branch

The coding agent renamed the Lakebase/Drizzle mirror table:

`app.disposition_recommendations` → `app.dispo_recs`

Branch: `table-rename` (`7dc9b78`, `0ed6aa6`)

## Schema (`app/server/db/schema.ts`)

```ts
export const dispositionRecommendations = appSchema.table(
  'dispo_recs',
  {
    id: text('id').primaryKey(),
    paymentId: text('payment_id').notNull(),
    // ...
  },
);
```

The TypeScript export stayed `dispositionRecommendations`; only the Postgres table name changed.

## Call sites updated to `dispo_recs`

- `app/server/db/sync.ts`
- `app/server/db/queries/cases.ts`
- `app/server/agent/caseops.ts`
- `app/client/src/shared/types.ts`
- `app/scripts/reset_app_schema.ts`
- `app/APP_WORKSHOP.md`
- `specifications/app/00_OVERVIEW.md`
- `specifications/app/03_DATA_MODEL.md`

## Live Lakebase rename (`app/scripts/rename_disposition_table.ts`)

```sql
ALTER TABLE app.disposition_recommendations RENAME TO dispo_recs;
```
