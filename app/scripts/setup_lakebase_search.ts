// Set up in-Lakebase semantic search over app.dispo_recs.reasoning (pgvector) —
// the "Build 1 Lakebase Search index" the `search_cases` agent tool retrieves
// from. Retrieval stays IN the operational store; no separate search service.
//
// Idempotent: enables the vector extension, adds the search_embedding column,
// embeds every dispo_recs.reasoning row via databricks-gte-large-en, and builds
// the HNSW cosine index. Safe to re-run (only embeds rows still NULL).
//
// Run (production branch):
//   DATABRICKS_CONFIG_PROFILE=fe-sandbox-tech-summit-27-doug \
//   DATABRICKS_HOST=https://fe-sandbox-tech-summit-27-doug.cloud.databricks.com \
//   DATABRICKS_WAREHOUSE_ID=030fbcc970a7476a \
//   PGHOST=<endpoint-host> PGDATABASE=sentenel_tech_summit_27 PGPORT=5432 PGSSLMODE=require \
//   LAKEBASE_ENDPOINT=projects/sentenel-tech-summit-27/branches/production/endpoints/primary \
//   LAKEBASE_BRANCH=projects/sentenel-tech-summit-27/branches/production \
//   LAKEBASE_DATABASE=projects/sentenel-tech-summit-27/branches/production/databases/db-sentenel-tech-summit-27 \
//   npx --no-install tsx scripts/setup_lakebase_search.ts
import type { Request } from 'express';
import { createApp, server, lakebase, analytics } from '@databricks/appkit';
import { embedText } from '../server/agent/tools/embed.js';

await createApp({
  plugins: [server(), lakebase(), analytics({})],
  async onPluginsReady(appkit) {
    const c = await appkit.lakebase.pool.connect();
    // Minimal context for embedText — no forwarded token, so authHeaders falls
    // back to the SDK credential chain (the CLI profile).
    const ctx = {
      req: { headers: {} } as unknown as Request,
      databricksHost: process.env.DATABRICKS_HOST ?? '',
    };
    try {
      console.log('[search-setup] CREATE EXTENSION vector …');
      try {
        await c.query('CREATE EXTENSION IF NOT EXISTS vector');
      } catch (e) {
        console.warn(
          `[search-setup] "vector" not available (${(e as Error).message}); trying "lakebase_vector"`,
        );
        await c.query('CREATE EXTENSION IF NOT EXISTS lakebase_vector');
      }

      console.log('[search-setup] ADD COLUMN app.dispo_recs.search_embedding vector(1024) …');
      await c.query(
        'ALTER TABLE app.dispo_recs ADD COLUMN IF NOT EXISTS search_embedding vector(1024)',
      );

      const rows = (
        await c.query(
          `SELECT payment_id, reasoning
             FROM app.dispo_recs
            WHERE search_embedding IS NULL AND reasoning IS NOT NULL`,
        )
      ).rows as Array<{ payment_id: string; reasoning: string }>;
      console.log(`[search-setup] embedding ${rows.length} rows via databricks-gte-large-en …`);

      let done = 0;
      for (const r of rows) {
        const vec = await embedText(ctx, r.reasoning);
        const lit = `[${vec.join(',')}]`;
        await c.query(
          'UPDATE app.dispo_recs SET search_embedding = $1::vector WHERE payment_id = $2',
          [lit, r.payment_id],
        );
        done++;
        if (done % 10 === 0) console.log(`[search-setup]   ${done}/${rows.length}`);
      }
      console.log(`[search-setup] embedded ${done} rows`);

      console.log('[search-setup] CREATE INDEX dispo_recs_reasoning_vec_idx (hnsw cosine) …');
      await c.query(
        `CREATE INDEX IF NOT EXISTS dispo_recs_reasoning_vec_idx
           ON app.dispo_recs USING hnsw (search_embedding vector_cosine_ops)`,
      );

      const cnt = (
        await c.query(
          `SELECT count(*)::int AS total, count(search_embedding)::int AS embedded
             FROM app.dispo_recs`,
        )
      ).rows[0];
      console.log('[search-setup] done: ' + JSON.stringify(cnt));
      process.exit(0);
    } catch (e) {
      console.error('[search-setup] failed:', e);
      process.exit(1);
    } finally {
      c.release();
    }
  },
});
