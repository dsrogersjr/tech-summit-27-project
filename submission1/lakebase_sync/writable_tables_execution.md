# Separate writable Postgres tables (distinct from the read-only synced mirror)

**Rubric row:** "Separate writable Postgres tables exist, distinct from the read-only synced table." (was: *Code only*)

## Build construct (code)

`app/server/db/schema.ts` models two distinct groups under `app.*`:

- **Read-only synced mirrors** — `payment_position`, `open_queue`,
  `disposition_recommendations` (renamed `dispo_recs` on the dev branch). The
  comment at `schema.ts:23-28` states these are the Delta Gold tables replicated
  into Lakebase; the app **SELECTs from them and never writes**. They are filled by
  the boot-time sync (`app/server/db/sync.ts` — see `sync_as_code.md`).
- **Writable operational table** — `case_actions` (`schema.ts:211-255`), commented
  as *"the ONLY table the app writes"*: an approved disposition inserts a row here.

## Execution evidence (live, captured 2026-08-28)

Full machine output: `writable_tables_result.json`. Highlights:

1. **All seven `app.*` tables exist** on the live `production` and `dev` branches.

2. **`case_actions` accepts writes** — a real `INSERT ... RETURNING` round-trip
   against `projects/sentenel-tech-summit-27/branches/dev`:

   ```
   INSERT ... RETURNING -> ('b57af781-48ff-43e6-9b15-6f11ba947ec6',
                            'PAY-EVIDENCE-CHECK', 'hold_for_verification',
                            'approved', 'doug.rogers@databricks.com',
                            2026-08-28 13:40:52.123120+00:00)
   row visible inside txn, count -> 1
   after ROLLBACK (evidence row not persisted), count -> 0
   ```
   The write was rolled back so no demo data is polluted — the round-trip is the
   exact write the app's **Act** layer performs on disposition approval.

3. **The synced mirror is sync-populated, not app-written** — `app.payment_position`
   holds **43** rows loaded from Delta by `sync.ts`; `case_actions` is empty on
   `production`/`dev` between demo runs (reset by `wipeMirroredTables`).

4. **Additional proof the writable table has carried real rows:** the committed
   `submission1/reverse_sync_sample.json` captures an actual `case_actions` change
   (PAY-0000214 insert → approval update) that the reverse sync streamed to UC.

### Note on the read-only distinction

In this demo build the mirror tables are ordinary Postgres tables refreshed by the
one-shot boot sync, so "read-only" is the **application/architecture contract**
(the app never issues writes against the mirrors; only `case_actions` is written),
not a Postgres-level grant. `sync.ts:249-261` (`wipeMirroredTables`) and the queries
in `app/server/db/queries/cases.ts` show the app writing only `case_actions` and
reading the mirrors. In production these mirrors become managed Lakebase Synced
Tables, which are read-only at the platform level.
