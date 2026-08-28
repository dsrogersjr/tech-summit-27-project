# Lakebase Search — evidence map

Section: **Lakebase Search**. Text column indexed: `app.dispo_recs.reasoning`
(the examiner-facing disposition *reasoning* narrative — the operational data).

## Row → evidence

| Row | Rubric item | Status now | Evidence |
|-----|-------------|-----------|----------|
| 17 | Lakebase Search (hybrid vector + full-text) enabled over a text column | **Build construct + execution now present** | `dispo_recs_search_index.sql` (the enabling DDL) + `live_capture.txt` sections [1]–[4] (extensions, columns, index access methods, populated rows) |
| 18 | A search query returns relevant records for a NL query | Already Verified; reinforced | `../search_query.txt`, `../search_result.json`, and `live_capture.txt` [5] (fresh re-run returns the same top-3 ids) |

## What is actually enabled (honest, from live capture)

The search index is **not committed in the repo** — a repo grep for
`bm25|to_tsvector|vector|embedding|hnsw` finds nothing in code. It was created
out-of-band on the Lakebase branch. `dispo_recs_search_index.sql` reconstructs it
from the live database so it is reproducible as code; `live_capture.txt` is the
raw psql proof it transcribes.

- **Full-text (BM25): LIVE and populated.** `reasoning_tsv` is a STORED generated
  column `to_tsvector('english', COALESCE(reasoning,''))`, indexed by
  `dispo_recs_reasoning_bm25 USING lakebase_bm25 (reasoning_tsv)`. All 43/43 rows
  are indexed; the NL query in `../search_query.txt` runs against it.
- **Vector (semantic): SCAFFOLDED, not yet live.** pgvector 0.8.0 is installed and
  an `embedding vector(1536)` column exists, but **0 of 43 rows are populated and
  there is no vector index** (no hnsw/ivfflat). The DDL to finish it is noted in
  `dispo_recs_search_index.sql`.

**Hybrid vs full-text — the truth:** the *scaffolding* for hybrid (vector column +
pgvector + BM25 index) is in place, but only the **full-text/BM25 modality is
functional today**. Do not read this as a fully-live hybrid index.

## ⚠️ Flags for the grader / owner

- The search index lives on the Lakebase branch **`dev-app-updates`**, not on
  `production` (which still has the pre-rename `app.disposition_recommendations`
  with only btree indexes) and not on the `dev` branch. If the grader connects to
  `production`, the index will appear absent.
- Captured live via profile `fe-sandbox-tech-summit-27-doug` on 2026-08-28.
