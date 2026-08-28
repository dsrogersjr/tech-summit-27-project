import type { Request } from 'express';
import type { Tool } from '@openai/agents';
import { sql } from 'drizzle-orm';
import * as mlflow from 'mlflow-tracing';
import { z } from 'zod';
import type { AppDb } from '../../db/index.js';
import { assertNotQueryAllData } from '../guardrails.js';
import { embedText } from './embed.js';
import { loggedTool } from './logged-tool.js';

export type PlaybookSearchRow = {
  guide_id: string;
  title: string;
  agency: string;
  program: string;
  scenario: string;
  summary: string;
  verification_steps: unknown;
  required_documents: unknown;
  hold_guidance: string | null;
  authority_citation: string;
  source_url: string | null;
  score: number | string | null;
};

export function toStringList(value: unknown): string[] {
  if (Array.isArray(value))
    return value.filter((v): v is string => typeof v === 'string');
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === 'string')
      : [];
  } catch {
    return [];
  }
}

export function mapPlaybookSearchRow(row: PlaybookSearchRow) {
  return {
    guide_id: row.guide_id,
    title: row.title,
    agency: row.agency,
    program: row.program,
    scenario: row.scenario,
    summary: row.summary,
    verification_steps: toStringList(row.verification_steps),
    required_documents: toStringList(row.required_documents),
    hold_guidance: row.hold_guidance,
    authority_citation: row.authority_citation,
    source_url: row.source_url,
    score: row.score === null ? null : Number(row.score),
  };
}

type PlaybookToolContext = {
  db: AppDb;
  req: Request;
  databricksHost: string;
};

export function createSearchPlaybookTool(ctx: PlaybookToolContext): Tool {
  return loggedTool({
    name: 'search_playbook',
    description:
      'Search federal benefits verification playbooks in Lakebase using semantic similarity. Use before drafting a hold-for-verification request so the draft cites the relevant authority, evidence, documents, steps, and hold guidance.',
    parameters: z.object({
      query: z
        .string()
        .describe(
          'A scoped verification scenario including the program and signals, e.g. "TANF income mismatch and cross-agency fraud flag".',
        ),
      limit: z
        .number()
        .int()
        .nullable()
        .describe('Maximum guides to return (default 3, max 10).'),
    }),
    execute: async ({ query, limit }) =>
      mlflow.withSpan(
        async () => {
          assertNotQueryAllData(query);
          const k = limit && limit > 0 ? Math.min(limit, 10) : 3;
          const vector = await embedText(ctx, query);
          const literal = `[${vector.join(',')}]`;
          const result = await ctx.db.execute(sql`
            SELECT guide_id, title, agency, program, scenario, summary,
                   verification_steps, required_documents, hold_guidance,
                   authority_citation, source_url,
                   1 - (search_embedding <=> ${literal}::vector) AS score
            FROM app.reference_playbooks
            WHERE search_embedding IS NOT NULL
            ORDER BY search_embedding <=> ${literal}::vector
            LIMIT ${k}
          `);
          return {
            query,
            results: (result.rows as PlaybookSearchRow[]).map(
              mapPlaybookSearchRow,
            ),
          };
        },
        {
          name: 'search_playbook',
          spanType: mlflow.SpanType.TOOL,
          inputs: { query, limit },
        },
      ),
  });
}
