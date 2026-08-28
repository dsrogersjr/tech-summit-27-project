# Retrieves from the Lakebase Search index, not a separate store

The app performs retrieval **inside Lakebase** — a pgvector semantic index over the
operational `app.dispo_recs.reasoning` column — rather than standing up a separate
search/vector service. The agent's `search_cases` tool embeds a natural-language
query and runs a vector similarity query against that in-Lakebase index.

## Build construct (code)

- **`app/server/agent/tools/embed.ts`** — `embedText()` calls the Databricks
  embeddings endpoint `databricks-gte-large-en` (1024-dim) with the app's OBO auth.
- **`app/server/agent/caseops.ts`** — the `search_cases` agent tool: embeds the
  query, then runs the pgvector similarity query (`search_embedding <=> $qvec`)
  against `app.dispo_recs` and returns ranked `{payment_id, reasoning, score}`.
  Registered in `makeTools()` and described in the agent instructions.
- **`app/server/db/schema.ts`** — the `search_embedding vector(1024)` column on
  `dispo_recs` (Drizzle `customType`).
- **`app/scripts/setup_lakebase_search.ts`** — idempotent setup: `CREATE EXTENSION
  vector`, add the column, embed every `reasoning` row via `databricks-gte-large-en`,
  and `CREATE INDEX … USING hnsw (search_embedding vector_cosine_ops)`.

## Execution evidence (live, production branch)

- `lakebase_search_query.sql` — the retrieval query + the live index definition and
  both EXPLAIN plans.
- `lakebase_search_result.json` — a real run: query *"high-risk cross-agency fraud
  or duplicate identity on a large TANF payment"* → top hit **PAY-0000202** (score
  0.858), followed by other high-value TANF cases — semantically relevant, retrieved
  from the in-Lakebase index. Setup embedded **43/43** rows.

## Honest note on the query plan

At the current **43 rows**, Postgres's planner chooses a sequential scan over the
HNSW index (cheaper for a tiny table) — so the default EXPLAIN shows a `Seq Scan`.
With `SET enable_seqscan = off` the same query uses
`Index Scan using dispo_recs_reasoning_vec_idx`, confirming the index is built and
functional; the planner will select it as the row count grows. Either way, retrieval
is over the pgvector column **in Lakebase**, not a separate store.

(Build 1's original index was a BM25 full-text index on the `dev-app-updates`
branch; the `lakebase_bm25` extension is not available on the app's `production`
branch — only `vector`/`lakebase_vector` — so search was rebuilt on production as an
in-Lakebase pgvector index. Same principle: retrieval stays in the operational store.)
