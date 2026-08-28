-- ============================================================================
-- Lakebase Search build construct — hybrid (full-text + vector) scaffolding
-- over the operational text column app.dispo_recs.reasoning
-- ============================================================================
-- Provenance: this DDL is RECONSTRUCTED FROM THE LIVE DATABASE (it is not
-- committed anywhere else in the repo — the index was created out-of-band on
-- the Lakebase branch, so this file makes it reproducible / "as code").
--
--   Lakebase project : sentenel-tech-summit-27
--   Branch           : dev-app-updates   (NOT production / dev — see EVIDENCE.md)
--   Database         : sentenel_tech_summit_27
--   Schema.table     : app.dispo_recs
--   Captured (UTC)   : 2026-08-28T13:40:40Z
--
-- Verified against pg_index / pg_attribute / pg_extension — see live_capture.txt
-- for the raw psql output this was transcribed from.
-- ============================================================================

-- 1) Vector modality — pgvector extension (installed on the branch: vector 0.8.0)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) FULL-TEXT modality (LIVE + POPULATED): a STORED generated tsvector column
--    derived from the operational text column `reasoning`, then a BM25 index
--    over it using Lakebase's `lakebase_bm25` access method.
ALTER TABLE app.dispo_recs
  ADD COLUMN reasoning_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english'::regconfig, COALESCE(reasoning, ''::text))) STORED;

CREATE INDEX dispo_recs_reasoning_bm25
  ON app.dispo_recs USING lakebase_bm25 (reasoning_tsv);

-- 3) VECTOR modality (SCAFFOLDED, NOT YET LIVE): a 1536-dim embedding column
--    exists for the semantic half of hybrid search. As captured, it is
--    UNPOPULATED (0 of 43 rows) and has NO vector index (no hnsw/ivfflat) yet.
ALTER TABLE app.dispo_recs ADD COLUMN embedding vector(1536);
-- TODO to make hybrid search fully live:
--   UPDATE app.dispo_recs SET embedding = <embed(reasoning)>;   -- populate
--   CREATE INDEX dispo_recs_embedding_hnsw
--     ON app.dispo_recs USING hnsw (embedding vector_cosine_ops);

-- ----------------------------------------------------------------------------
-- Query pattern (full-text / BM25) — see ../search_query.txt, ../search_result.json:
--   SELECT id, reasoning,
--          reasoning_tsv <@> to_bm25query(
--            to_tsvector('english', 'moderate'),
--            'app.dispo_recs_reasoning_bm25'::regclass) AS score
--   FROM app.dispo_recs ORDER BY score LIMIT 10;
-- ----------------------------------------------------------------------------
