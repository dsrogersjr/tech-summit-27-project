/**
 * Text embedding via the Databricks Foundation Model embeddings endpoint
 * (`databricks-gte-large-en`, 1024-dim). Used by the `search_cases` tool and by
 * `scripts/setup_lakebase_search.ts` to embed text for pgvector similarity
 * search inside Lakebase (retrieval stays in the operational store — no separate
 * search service).
 */
import { authHeaders } from '../../lib/auth.js';
import type { DataToolContext } from './types.js';

/** The FM embeddings endpoint + its output dimensionality. */
export const EMBED_ENDPOINT = 'databricks-gte-large-en';
export const EMBED_DIM = 1024;

type EmbeddingResponse = {
  data?: Array<{ embedding?: number[] }>;
};

/**
 * Embed a single string into a 1024-float vector via the FM embeddings API
 * (`POST /serving-endpoints/databricks-gte-large-en/invocations` with
 * `{ input: [text] }`, response `{ data: [{ embedding: [...] }] }`).
 * Auth is the same OBO/SDK chain the other tools use (`authHeaders`).
 */
export async function embedText(
  ctx: Pick<DataToolContext, 'req' | 'databricksHost'>,
  text: string,
): Promise<number[]> {
  const headers = await authHeaders(ctx.req);
  headers.set('Content-Type', 'application/json');
  const url = `${ctx.databricksHost}/serving-endpoints/${EMBED_ENDPOINT}/invocations`;
  const resp = await fetch(url, {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({ input: [text] }),
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(
      `embeddings endpoint ${EMBED_ENDPOINT} HTTP ${resp.status}: ${t.slice(0, 300)}`,
    );
  }
  const json = (await resp.json()) as EmbeddingResponse;
  const vec = json.data?.[0]?.embedding;
  if (!Array.isArray(vec) || vec.length === 0) {
    throw new Error(`embeddings endpoint ${EMBED_ENDPOINT} returned no vector`);
  }
  return vec;
}
