-- Lakebase Search retrieval used by the app's `search_cases` agent tool
-- (app/server/agent/caseops.ts + app/server/agent/tools/embed.ts).
--
-- The natural-language query is embedded with databricks-gte-large-en (1024-dim);
-- :qvec is that vector. Retrieval runs IN Lakebase over the pgvector column
-- app.dispo_recs.search_embedding via the HNSW cosine index
-- dispo_recs_reasoning_vec_idx — NOT a separate search store.

SELECT payment_id,
       LEFT(reasoning, 200) AS reasoning,
       1 - (search_embedding <=> :qvec::vector) AS score
FROM app.dispo_recs
WHERE search_embedding IS NOT NULL
ORDER BY search_embedding <=> :qvec::vector
LIMIT 5;

-- Live index (production branch):
--   CREATE INDEX dispo_recs_reasoning_vec_idx ON app.dispo_recs
--     USING hnsw (search_embedding vector_cosine_ops)
--
-- EXPLAIN, default (43 rows):
--   Limit -> Sort -> Seq Scan on dispo_recs (Filter: search_embedding IS NOT NULL)
--   → at only 43 rows Postgres's planner chooses a scan over the HNSW index.
--
-- EXPLAIN, SET enable_seqscan = off (proves the index is used):
--   Limit -> Index Scan using dispo_recs_reasoning_vec_idx on dispo_recs
--            Order By: (search_embedding <=> :qvec::vector)
--   → the HNSW index is functional and chosen once a scan is disallowed / at scale.
