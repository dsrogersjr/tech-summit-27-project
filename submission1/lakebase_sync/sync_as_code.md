# The sync is defined as code (not UI-only)

**Rubric row:** "The sync is defined as code (Databricks Asset Bundle or Terraform), not UI-only."

Every piece of the Lakehouse ↔ Lakebase data movement is declared in versioned
code in this repo — nothing is click-configured in the UI.

## 1. The Lakebase instance + its bindings — Infrastructure-as-Code

| Concern | Code artifact |
|---|---|
| Project / branch / endpoint / database | `app/scripts/lakebase_setup_db.sh` (Databricks CLI `postgres create-*`) |
| App ⇄ Lakebase binding (`postgres` resource, branch + database paths) | `databricks.yml` — the Databricks Asset Bundle (`apps.sentinel_app.resources`) |
| App UC grants for the sync source | `databricks.yml` job task `grant_app_uc` → `src/deploy/grant_app_uc.py` |

See `../connectivity_check/lakebase_instance_defined_in_code.md` for the excerpts.

## 2. Forward sync (UC Delta Gold → Lakebase) — as code

`app/server/db/sync.ts` (`sync_ts_excerpt.ts` here) is the forward
replication, written in TypeScript and versioned in the repo. It pulls the three
read-only Gold mirrors (`payment_position`, `open_queue`,
`disposition_recommendations`) from the governed UC tables via the SQL Statement
Execution API and inserts them into Lakebase at app boot.

Its own header documents the production form:

> *"In production this is Lakebase Synced Tables (managed, continuous
> Delta→Lakebase replication with the same UC governance). For the demo build we
> keep it simple: a manual one-shot sync at boot, code we can show, no extra
> resource."* — `app/server/db/sync.ts:13-16`

Either way the sync is **code**, not a UI-only configuration.

## 3. Reverse sync (Lakebase → UC Delta) — as code

The reverse Lakehouse sync streams `app.case_actions` changes into the UC Delta
table
`tech_summit_27_sentenel.dev_doug_rogers_sentinel_ipp.lb_case_actions_history`
with SCD Type 2 history + Postgres CDC metadata columns. It is documented and
evidenced in `submission1/reverse_sync` and `submission1/reverse_sync_sample.json`
(a real captured change stream for PAY-0000214).

## Why this is not UI-only

`lakebase_setup_db.sh` and `databricks.yml` are the reproducible source of truth —
`dab_instructions.md` shows the 5-command deploy that recreates the whole system
(instance, bindings, sync source) on any workspace from these files.
