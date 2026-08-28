# Operational schema — modeled for the domain (related tables + keys)

**Rubric row:** "The operational schema is modeled for the domain: related tables and keys."

The Lakebase (Postgres) operational schema lives under `app.*` and is modeled in
code with Drizzle ORM, then materialized by a generated DDL migration that runs at
app boot.

## Build constructs (code)

| Artifact | Repo path | What it defines |
|---|---|---|
| Drizzle schema | `app/server/db/schema.ts` | All `app.*` tables, columns, primary keys, foreign keys, and indexes (typed). |
| Generated DDL migration | `app/drizzle/0000_concerned_killraven.sql` | The `CREATE SCHEMA/TABLE/INDEX` + `ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY` statements applied to Postgres. Copied here as `0000_concerned_killraven.sql`. |
| Migration snapshot | `app/drizzle/meta/0000_snapshot.json` | Drizzle's canonical snapshot of the modeled schema. |
| Data-model spec | `specifications/app/03_DATA_MODEL.md` | Prose data model: the three table groups and the sync contract. |

## The domain model — three related groups

The schema comment in `app/server/db/schema.ts:14-39` states the design directly:
**chat state**, **read-only synced mirrors** of the Delta Gold tables, and **one
writable operational table**.

### Keys and relationships (from `schema.ts` / `0000_concerned_killraven.sql`)

| Table | Primary key | Foreign keys / relationships | Notable indexes |
|---|---|---|---|
| `app.conversations` | `id uuid` | — | `conversations_user_idx (user_email, updated_at)`, `conversations_kind_idx (user_email, kind)` |
| `app.messages` | `id uuid` | `conversation_id → conversations.id ON DELETE CASCADE` | unique `messages_convo_pos_uq (conversation_id, position)` |
| `app.feedback` | `id uuid` | `message_id → messages.id ON DELETE CASCADE` | `feedback_message_idx (message_id)` |
| `app.payment_position` | `id text` (= `payment_id`) | keyed by `payment_id` to the queue/mirror grain | `position_payment_idx`, `position_program_idx`, `position_risk_idx` |
| `app.open_queue` | `id text` (= `payment_id`) | one row per flagged payment | `queue_payment_idx (payment_id)` |
| `app.disposition_recommendations` (renamed `dispo_recs` on the dev branch) | `id text` (= `payment_id`) | joined to the queue by `payment_id` | `disposition_payment_idx (payment_id)` |
| `app.case_actions` (**writable**) | `id uuid` | logically keyed to a payment by `payment_id`; the queue LEFT JOINs `payment_position → latest case_actions` | `case_actions_payment_idx (payment_id, signal_type)`, `case_actions_created_idx (created_at)` |

The two enforced foreign keys (`messages → conversations`, `feedback → messages`,
both `ON DELETE CASCADE`) are declared at
`app/drizzle/0000_concerned_killraven.sql:88-89`. The payment-domain tables share
the `payment_id` business key so the queue can join a payment's read-only position
to its latest writable action.

## Verified — schema exists live

`submission1/lakebase_sync/writable_tables_execution.md` shows all seven `app.*`
tables present on the live Lakebase `production` and `dev` branches, confirming the
modeled schema was actually applied.
