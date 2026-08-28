/**
 * Custom AI-governance guardrail — block attempts to query ALL data.
 *
 * Sentinel is a least-privilege, case-by-case program-integrity console: an
 * examiner works one flagged payment (or a scoped filter) at a time. A request
 * to pull the WHOLE dataset ("show me all payments", "dump the table",
 * "select * from everything", "every record, no filter") is refused before it
 * ever reaches a data tool (ask_data / search_cases) or the model.
 *
 * Two surfaces:
 *   - `queryAllDataGuardrail` — an @openai/agents InputGuardrail wired into the
 *     agent (trips the run before the model sees a broad-dump request).
 *   - `assertNotQueryAllData` — a hard check callable inside a tool's execute to
 *     reject a broad query argument before hitting Genie / Lakebase.
 */
import type {
  InputGuardrail,
  InputGuardrailFunctionArgs,
  GuardrailFunctionOutput,
} from '@openai/agents';

export type QueryAllDataDetection = {
  blocked: boolean;
  reason?: string;
  matched?: string;
};

// Ordered patterns for broad, UNSCOPED "whole dataset" intent. Each is written
// to fire on dataset-wide dumps but NOT on entity-scoped phrasing such as
// "all signals on PAY-0000202" (which names a specific payment).
const PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /\bselect\s+\*/i, reason: 'unscoped SELECT * (all columns/rows)' },
  { re: /\bselect\s+all\b/i, reason: 'SELECT ALL' },
  {
    re: /\ball\s+(?:the\s+)?(?:data|records|rows|payments|cases|beneficiaries|dispositions|transactions|case_actions|tables)\b/i,
    reason: 'request for all records / the whole dataset',
  },
  {
    re: /\bevery\s+(?:single\s+)?(?:record|row|payment|case|beneficiary|transaction)\b/i,
    reason: 'request for every record',
  },
  {
    re: /\bentire\b[^.?!]{0,40}\b(?:table|database|dataset|queue|db|catalog|schema)\b/i,
    reason: 'request for an entire table/database',
  },
  {
    re: /\bdump\s+(?:the\s+)?(?:entire\s+)?(?:\w+\s+)?(?:data|table|database|db|queue|everything|dataset)\b/i,
    reason: 'data dump',
  },
  {
    re: /\b(?:dump|export|return|give\s+me|show\s+me|list|fetch|pull)\s+(?:me\s+)?everything\b/i,
    reason: 'request to return everything',
  },
  { re: /\bfull\s+export\b/i, reason: 'full export' },
  { re: /\bunrestricted\b/i, reason: 'unrestricted query' },
  {
    re: /\b(?:no|without\s+(?:a\s+)?)\s*(?:filter|filters|where|limit|scope|restriction)\b/i,
    reason: 'query with no filter / limit / scope',
  },
];

/** Deterministic matcher: does the text express intent to query ALL data? */
export function detectQueryAllData(text: string): QueryAllDataDetection {
  const t = text ?? '';
  for (const { re, reason } of PATTERNS) {
    const m = re.exec(t);
    if (m) return { blocked: true, reason, matched: m[0] };
  }
  return { blocked: false };
}

/** Flatten the agent input (string or ModelItem[]) into searchable text. */
function inputToText(input: InputGuardrailFunctionArgs['input']): string {
  if (typeof input === 'string') return input;
  try {
    return input
      .map((item) => {
        const it = item as Record<string, unknown>;
        if (typeof it.content === 'string') return it.content;
        if (Array.isArray(it.content)) {
          return (it.content as Array<Record<string, unknown>>)
            .map((c) => (typeof c.text === 'string' ? c.text : ''))
            .join(' ');
        }
        return typeof it.text === 'string' ? it.text : '';
      })
      .join(' ');
  } catch {
    return '';
  }
}

/**
 * @openai/agents input guardrail. Trips the run (halts before the model) when
 * the user input is a broad "query all data" request.
 */
export const queryAllDataGuardrail: InputGuardrail = {
  name: 'block_query_all_data',
  execute: async ({
    input,
  }: InputGuardrailFunctionArgs): Promise<GuardrailFunctionOutput> => {
    const d = detectQueryAllData(inputToText(input));
    return {
      tripwireTriggered: d.blocked,
      outputInfo: d.blocked
        ? { guardrail: 'query_all_data', matched: d.matched, reason: d.reason }
        : { guardrail: 'query_all_data', ok: true },
    };
  },
};

/**
 * Hard check for use inside a data tool's execute — throws (rejecting the tool
 * call) when the argument is a broad "query all data" request, before any
 * backend (Genie / Lakebase) is hit.
 */
export function assertNotQueryAllData(text: string): void {
  const d = detectQueryAllData(text);
  if (d.blocked) {
    throw new Error(
      `Guardrail: request to query all data was blocked (matched "${d.matched}" — ${d.reason}). ` +
        'Scope the request to a specific payment, program, or filter.',
    );
  }
}
