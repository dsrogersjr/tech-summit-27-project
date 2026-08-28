/**
 * The case-ops action-taking agent — the DEMO'S DEFINING PIECE, and the
 * WORKSHOP'S main graded surface.
 *
 * Built on `@openai/agents` (OpenAI Agents SDK) pointed at Databricks'
 * Responses API. Tools capture `db` + `userEmail` via closure so every
 * action is attributed to the viewing user (OBO).
 *
 * ════════════════════════════════════════════════════════════════════════
 * WHAT SHIPS WORKING vs WHAT THE TRAINEE BUILDS  (see APP_WORKSHOP.md)
 * ════════════════════════════════════════════════════════════════════════
 * SHIPS WORKING:
 *   - The full agent loop (Responses API wiring, streaming, MLflow spans).
 *   - `ask_data` — the investigation tool. Config-driven MAS-OR-Genie:
 *     uses the MAS endpoint if `masEndpointName` is set, else the Genie
 *     space if `genieSpaceId` is set. This is the trainee's Build-1 choice
 *     (they wire ONE backend); the app registers whichever is configured.
 *
 * IMPLEMENTED (Build 2 + Build 3 — the Assist + Act layers):
 *   - `find_flag`         → Build 2 (Assist): read the live flag
 *   - `rank_dispositions` → Build 2 (Assist): read the ML recommendation
 *   - `execute_case_action`→ Build 3 (Act):   the human-in-the-loop write
 *   - `search_cases`      → Lakebase Search: in-Lakebase pgvector semantic
 *                           retrieval over dispo_recs.reasoning (not a
 *                           separate store)
 *
 * The three-phase chain (Discover → Draft+confirm → Execute) is described in
 * the instructions below and now runs end to end: find_flag + rank_dispositions
 * read from the synced mirrors, and execute_case_action writes the approved
 * disposition to app.case_actions so the queue reflects it on the next read.
 *
 * KEEP `configureAgentsSdk()` as-is — it handles the Databricks Responses API
 * wiring, the `Connection: close` stale-socket workaround, and the 64-char
 * `input[*].id` strip.
 */
import type { Request } from 'express';
import OpenAI from 'openai';
import {
  Agent,
  run,
  setDefaultOpenAIClient,
  setTracingDisabled,
} from '@openai/agents';
import type { Tool } from '@openai/agents';
import { loggedTool as tool } from './tools/logged-tool.js';
import * as mlflow from 'mlflow-tracing';
import { z } from 'zod';
import { authHeaders } from '../lib/auth.js';
import type { AppDb } from '../db/index.js';
import { sql } from 'drizzle-orm';
import { caseActions, type AuditEntry } from '../db/schema.js';
import {
  getOpenFlag,
  worstFlag,
  getPayment,
  getRecommendation,
} from '../db/queries/index.js';
import { embedText } from './tools/embed.js';
// The data-backend helpers. Both are config-driven and share the same
// DataCallResult shape + ToolProgressEvent stream, so the `ask_data` tool
// below can delegate to EITHER without the UI caring which powers it. This
// preserves the template's MAS-OR-Genie flexibility exactly.
import { callMasEndpoint } from './tools/mas.js';
import { callGenieSpace } from './tools/genie.js';
export type { ToolProgressEvent } from './tools/types.js';

/** Captured detail of the last failing call to the model serving endpoint. */
export type ModelErrorDetail = {
  status: number;
  url: string;
  bodyText: string;
  code?: string;
  message?: string;
};

export type AgentContext = {
  db: AppDb;
  userEmail: string;
  req: Request;
  /** MAS serving-endpoint name the `ask_data` tool talks to WHEN SET. Set in
   * `config/app.json` as `masEndpointName` (env `MAS_ENDPOINT_NAME`). Leave
   * empty to use Genie instead. This is the trainee's Build-1 backend choice
   * — the app registers whichever of MAS/Genie is configured. */
  masEndpointName: string;
  /** Genie space id the `ask_data` tool talks to WHEN `masEndpointName` is
   * empty. Set as `genieSpaceId` (env `GENIE_SPACE_ID`). */
  genieSpaceId: string;
  databricksHost: string;
  model: string;
  /** Called by long-running tools to surface progress to the UI. */
  onToolProgress?: (ev: import('./tools/types.js').ToolProgressEvent) => void;
  /** Mutated by the OpenAI fetch shim on any non-2xx. */
  modelError?: { current: ModelErrorDetail | null };
};

// ────────────────────────────────────────────────────────────────────────────
// Adding / editing tools — READ THIS before touching `parameters: z.object(...)`.
//
// The Agents SDK ships every tool's zod schema to the Responses API with
// `strict: true`. Strict mode requires EVERY property in `required`. So use
// `.nullable()`, NOT `.optional()`:
//   ❌  reason: z.string().optional()   // breaks with strict:true (masked 502)
//   ✅  reason: z.string().nullable()   // field required, value may be null
// Every field needs a `.describe(...)`. Keep property names snake_case.
// Use the `loggedTool` wrapper (imported as `tool`), not the raw SDK `tool`.
// ────────────────────────────────────────────────────────────────────────────
function makeTools(ctx: AgentContext): Tool[] {
  // ── ask_data — SHIPS WORKING. Config-driven MAS-OR-Genie. ─────────────────
  // Delegates to the MAS endpoint if one is configured, else the Genie space.
  // Both helpers return {answer, trace_id} and stream progress via
  // ctx.onToolProgress → the Thinking panel. Registered ONLY when a backend
  // is configured (otherwise the tool would 404 confusingly).
  const askData = tool({
    name: 'ask_data',
    description:
      'Investigate the governed lakehouse with a natural-language question — the tool generates SQL / retrieves knowledge and returns a synthesized answer. Use for any "why" / "what happened" / investigative question about store positions, sell-through, shortfalls, or surplus. Prefer ONE narrow, well-formed question over many small ones.',
    parameters: z.object({
      question: z
        .string()
        .describe(
          'A clear, focused English question about the data. Narrow questions finish in 20–40s; broad multi-part questions take longer.',
        ),
    }),
    execute: async ({ question }) =>
      mlflow.withSpan(
        async () =>
          ctx.masEndpointName
            ? callMasEndpoint(ctx, ctx.masEndpointName, question)
            : callGenieSpace(ctx, ctx.genieSpaceId, question),
        {
          name: 'ask_data',
          spanType: mlflow.SpanType.TOOL,
          inputs: { question },
        },
      ),
  });

  // ── find_flag — Build 2 · Assist. IMPLEMENTED. ───────────────────────
  // Reads the open flag for a payment (or the worst open one) from Lakebase
  // app.open_queue via getOpenFlag/worstFlag, then enriches with the synced
  // position (getPayment) for program/amount/projected-recovery + any live
  // disposition. Read-only. See APP_WORKSHOP.md → "Layer 2 — Assist".
  const findShortfall = tool({
    name: 'find_flag',
    description:
      'Read the live flag for a payment (or the worst open flagged payment) from Lakebase: the fraud/eligibility signals on it, the signal count, risk level, and improper-payment exposure. Read-only.',
    parameters: z.object({
      payment_id: z
        .string()
        .nullable()
        .describe('Payment id, e.g. PAY-0000214. Null → return the worst open flagged payment.'),
    }),
    execute: async ({ payment_id }) =>
      mlflow.withSpan(
        async () => {
          const flag = payment_id
            ? await getOpenFlag(ctx.db, payment_id)
            : await worstFlag(ctx.db);
          if (!flag) {
            throw new Error(
              payment_id
                ? `No open flag found for ${payment_id}.`
                : 'No open flagged payments in the queue.',
            );
          }
          // Enrich with the synced position (program / amount / projected
          // recovery + any disposition already recorded) so the model can draft.
          const position = await getPayment(ctx.db, flag.paymentId);
          return {
            payment_id: flag.paymentId,
            program: position?.program ?? null,
            state: position?.state ?? null,
            payment_amount_usd: position?.paymentAmountUsd ?? null,
            n_signals: flag.nSignals,
            signals: flag.signalList,
            risk_level: flag.riskLevel,
            improper_payment_exposure_usd: flag.improperPaymentExposureUsd,
            projected_recovery_if_investigated_usd:
              position?.projectedRecoveryIfInvestigatedUsd ?? null,
            live_disposition: position?.liveDisposition ?? null,
            action_status: position?.actionStatus ?? null,
          };
        },
        {
          name: 'find_flag',
          spanType: mlflow.SpanType.TOOL,
          inputs: { payment_id },
        },
      ),
  });

  // ── rank_dispositions — Build 2 · Assist. IMPLEMENTED. ──────────────────
  // Reads app.dispo_recs for {payment_id} via getRecommendation and returns the
  // recommended_disposition, predicted_recovery_usd, predicted_cost_usd, and the
  // full action_ranking (all three dispositions with predicted recovery $ + net $
  // + cost) — the "ML in the loop" moment. The agent quotes these in the draft and
  // computes the what-if arithmetically from action_ranking. Read-only.
  // See APP_WORKSHOP.md → "Layer 2 — Assist".
  const rankRecoveryMoves = tool({
    name: 'rank_dispositions',
    description:
      "Read the model's ranked dispositions for a payment from Lakebase app.dispo_recs: the recommended disposition, its predicted recovery $ + net value, and the full ranking of all three options (release / hold_for_verification / refer_to_investigation) with each option's hold hours, cost, predicted recovery $ and net $. Read-only. Quote these in the draft; do the what-if (recovery vs. citizen-delay cost) arithmetically from the ranking.",
    parameters: z.object({
      payment_id: z.string().describe('Payment id, e.g. PAY-0000214.'),
    }),
    execute: async ({ payment_id }) =>
      mlflow.withSpan(
        async () => {
          const rec = await getRecommendation(ctx.db, payment_id);
          if (!rec) {
            throw new Error(
              `No disposition recommendation found for ${payment_id}.`,
            );
          }
          return {
            payment_id: rec.paymentId,
            recommended_disposition: rec.recommendedDisposition,
            recommended_hold_hours: rec.recommendedHoldHours,
            predicted_recovery_usd: rec.predictedRecoveryUsd,
            predicted_cost_usd: rec.predictedCostUsd,
            action_ranking: rec.actionRanking,
          };
        },
        {
          name: 'rank_dispositions',
          spanType: mlflow.SpanType.TOOL,
          inputs: { payment_id },
        },
      ),
  });

  // ── execute_case_action — Build 3 · Act. IMPLEMENTED (human-in-the-loop). ─
  // Reached ONLY after the examiner explicitly approved in chat (Phase 3). Writes
  // the approved disposition to Lakebase app.case_actions (action_type,
  // hold_duration_hours, the drafted memo text, predicted_recovery_usd,
  // status='approved', approved_by=ctx.userEmail, an appended audit entry) inside
  // db.transaction(...). On the next read the queue derives the payment's live
  // state from the payment_position ⟕ latest-case_actions join (client refetches
  // on turn completion), closing the loop. See APP_WORKSHOP.md → "Layer 3 — Act".
  const executeRecoveryAction = tool({
    name: 'execute_case_action',
    description:
      "WRITE (requires prior examiner approval): record the approved disposition to Lakebase app.case_actions — action_type (release / hold_for_verification / refer_to_investigation), hold duration, the drafted memo, predicted recovery $ — and append an audit entry. Inputs are a FILTER + the drafted memo text, never a list of ids. Use ONLY after the examiner says yes.",
    parameters: z.object({
      payment_id: z.string().describe('The payment being dispositioned, e.g. PAY-0000214.'),
      action_type: z
        .enum(['release', 'hold_for_verification', 'refer_to_investigation'])
        .describe('The approved disposition.'),
      hold_duration_hours: z
        .number()
        .int()
        .nullable()
        .describe('For a hold: how long to hold the payment (hours), e.g. 48. Null otherwise.'),
      drafted_request: z
        .string()
        .describe('The case memo / investigation referral the agent drafted.'),
      predicted_recovery_usd: z
        .number()
        .describe('Predicted recovery for this disposition (from rank_dispositions).'),
    }),
    execute: async ({
      payment_id,
      action_type,
      hold_duration_hours,
      drafted_request,
      predicted_recovery_usd,
    }) =>
      mlflow.withSpan(
        async () => {
          // Human-in-the-loop WRITE. Reached only after the examiner approved
          // in chat (Phase 3). Wrapped in a transaction; the payment's live
          // state is derived on the NEXT read via the payment_position ⟕
          // latest-case_actions join, so the queue reflects this decision.
          const recorded = await ctx.db.transaction(async (tx) => {
            // Validate this is a real flagged payment and derive its
            // representative signal (case_actions.signal_type is NOT NULL;
            // reads key on payment_id).
            const posRes = await tx.execute(sql`
              SELECT signals
              FROM app.payment_position
              WHERE payment_id = ${payment_id}
              LIMIT 1
            `);
            const posRow = posRes.rows[0] as
              | { signals: string | null }
              | undefined;
            if (!posRow) {
              throw new Error(
                `No flagged payment ${payment_id} in the queue — cannot record a disposition.`,
              );
            }
            const signalType =
              (posRow.signals ?? '').split(',')[0]?.trim() || 'unspecified';

            const now = new Date();
            const audit: AuditEntry = {
              at: now.toISOString(),
              by: ctx.userEmail,
              action: 'approved',
              notes: `Examiner-approved ${action_type}${
                hold_duration_hours ? ` — hold ${hold_duration_hours}h` : ''
              }.`,
              tool: 'execute_case_action',
            };

            const [row] = await tx
              .insert(caseActions)
              .values({
                paymentId: payment_id,
                signalType,
                actionType: action_type,
                holdDurationHours: hold_duration_hours,
                draftedRequest: drafted_request,
                predictedRecoveryUsd: predicted_recovery_usd,
                status: 'approved',
                approvedBy: ctx.userEmail,
                reviewedByRole: 'examiner',
                auditTrail: [audit],
                decidedAt: now,
              })
              .returning({
                id: caseActions.id,
                paymentId: caseActions.paymentId,
                signalType: caseActions.signalType,
                actionType: caseActions.actionType,
                holdDurationHours: caseActions.holdDurationHours,
                predictedRecoveryUsd: caseActions.predictedRecoveryUsd,
                status: caseActions.status,
                approvedBy: caseActions.approvedBy,
                createdAt: caseActions.createdAt,
                decidedAt: caseActions.decidedAt,
              });
            return row;
          });

          return {
            recorded: true,
            case_action_id: recorded.id,
            payment_id: recorded.paymentId,
            signal_type: recorded.signalType,
            action_type: recorded.actionType,
            hold_duration_hours: recorded.holdDurationHours,
            predicted_recovery_usd: recorded.predictedRecoveryUsd,
            status: recorded.status,
            approved_by: recorded.approvedBy,
            created_at: recorded.createdAt,
            decided_at: recorded.decidedAt,
          };
        },
        {
          name: 'execute_case_action',
          spanType: mlflow.SpanType.TOOL,
          inputs: {
            payment_id,
            action_type,
            hold_duration_hours,
            predicted_recovery_usd,
          },
        },
      ),
  });

  // ── search_cases — Build 1 Lakebase Search (pgvector). IMPLEMENTED. ──────
  // Semantic retrieval over app.dispo_recs.reasoning using the IN-LAKEBASE
  // pgvector index (`dispo_recs_reasoning_vec_idx`, HNSW cosine). Retrieval
  // happens in the operational store — NOT a separate search service. Embeds
  // the query via databricks-gte-large-en, then ranks by cosine similarity.
  const searchCases = tool({
    name: 'search_cases',
    description:
      'Semantic search over the flagged-payment disposition reasoning using the Lakebase pgvector index (retrieval happens in Lakebase, not a separate store). Use to find flagged payments whose reasoning is similar to a described situation, e.g. "deceased payee with an income mismatch" or "single weak signal, likely legitimate".',
    parameters: z.object({
      query: z
        .string()
        .describe('A natural-language description of the kind of case to find.'),
      limit: z
        .number()
        .int()
        .nullable()
        .describe('Max results to return (default 5, max 25).'),
    }),
    execute: async ({ query, limit }) =>
      mlflow.withSpan(
        async () => {
          const k = limit && limit > 0 ? Math.min(limit, 25) : 5;
          const vec = await embedText(ctx, query);
          // vec is model-generated numbers (not user text); bind as a pgvector
          // literal and cast — the search runs against the Lakebase index.
          const lit = `[${vec.join(',')}]`;
          const res = await ctx.db.execute(sql`
            SELECT payment_id,
                   LEFT(reasoning, 300) AS reasoning,
                   1 - (search_embedding <=> ${lit}::vector) AS score
            FROM app.dispo_recs
            WHERE search_embedding IS NOT NULL
            ORDER BY search_embedding <=> ${lit}::vector
            LIMIT ${k}
          `);
          const rows = res.rows as Array<{
            payment_id: string;
            reasoning: string | null;
            score: number | string | null;
          }>;
          return {
            query,
            results: rows.map((r) => ({
              payment_id: r.payment_id,
              reasoning: r.reasoning,
              score: r.score === null ? null : Number(r.score),
            })),
          };
        },
        {
          name: 'search_cases',
          spanType: mlflow.SpanType.TOOL,
          inputs: { query, limit },
        },
      ),
  });

  // find_flag / rank_dispositions / execute_case_action / search_cases read
  // and act on Lakebase; ask_data (registered only when a Genie/MAS backend is
  // configured) reads the governed lakehouse. All spanned by MLflow.
  const tools: Tool[] = [
    findShortfall,
    rankRecoveryMoves,
    executeRecoveryAction,
    searchCases,
  ];
  if (ctx.masEndpointName || ctx.genieSpaceId) {
    tools.unshift(askData);
  }
  return tools;
}

export async function configureAgentsSdk(ctx: AgentContext): Promise<void> {
  const headers = await authHeaders(ctx.req);
  const bearer = headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
  // Custom fetch: fresh TCP connection per call (avoids the stale-socket 502
  // after a long ask_data hop) + strip the >64-char `input[*].id` the SDK
  // echoes back on round 2 (Databricks' Responses API rejects long ids and
  // the streaming gateway masks the 400 as a bare 502). See git history.
  const client = new OpenAI({
    apiKey: bearer,
    baseURL: `${ctx.databricksHost}/serving-endpoints`,
    maxRetries: 4,
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      headers.set('Connection', 'close');
      let body = init?.body;
      if (typeof body === 'string' && body.startsWith('{')) {
        try {
          const parsed = JSON.parse(body) as {
            input?: Array<Record<string, unknown>>;
            messages?: Array<Record<string, unknown>>;
          };
          if (Array.isArray(parsed.input)) {
            for (const item of parsed.input) {
              const id = item.id;
              if (typeof id === 'string' && id.length > 64) {
                delete item.id;
              }
            }
          }
          if (Array.isArray(parsed.messages)) {
            for (const m of parsed.messages) {
              const content = (m as { content?: unknown }).content;
              if (Array.isArray(content)) {
                for (const part of content as Array<Record<string, unknown>>) {
                  if (part && typeof part === 'object') {
                    delete part.annotations;
                  }
                }
              }
            }
          }
          body = JSON.stringify(parsed);
        } catch {
          /* not JSON — pass through */
        }
      }
      const url =
        typeof input === 'string'
          ? input
          : (input as URL | Request).toString?.() ?? String(input);
      console.debug(
        `[openai-shim] → ${url}\n  request_body: ${typeof body === 'string' ? body.slice(0, 2000) : '(non-string)'}`,
      );
      const tShim = Date.now();
      let resp: Response;
      try {
        resp = await fetch(input as Parameters<typeof fetch>[0], {
          ...init,
          headers,
          body,
          keepalive: false,
        });
      } catch (e) {
        console.error('[openai-shim] fetch threw', { url, error: e });
        throw e;
      }
      console.debug(
        `[openai-shim] ← ${resp.status} ${resp.statusText} from ${url} in ${Date.now() - tShim}ms (content-type: ${resp.headers.get('content-type') ?? '?'})`,
      );
      if (!resp.ok) {
        try {
          const text = await resp.clone().text();
          let code: string | undefined;
          let message: string | undefined;
          try {
            const parsed = JSON.parse(text) as { error_code?: string; message?: string };
            code = parsed.error_code;
            message = parsed.message;
          } catch {
            /* body wasn't JSON — keep raw text */
          }
          if (ctx.modelError) {
            ctx.modelError.current = {
              status: resp.status,
              url,
              bodyText: text,
              code,
              message,
            };
          }
          console.error(
            `[openai-shim] ${resp.status} from ${url}\n  request_body: ${typeof body === 'string' ? body.slice(0, 4000) : '(non-string)'}\n  response_body: ${text.slice(0, 4000)}`,
          );
        } catch (e) {
          console.error('[openai-shim] failed to clone error response', e);
        }
      }
      return resp;
    },
  });
  setDefaultOpenAIClient(client);
  // Responses API (the SDK's default — we leave setOpenAIAPI alone).
  // Keep `agentModel` on `databricks-gpt-5-4` or a newer Responses-capable
  // GPT (needs `openai/v1/responses`). Claude/non-Responses models 400.
  setTracingDisabled(true); // disable OpenAI's tracing backend; we use MLflow
}

export function buildAgent(ctx: AgentContext): Agent {
  return new Agent({
    name: 'CaseOps',
    model: ctx.model,
    modelSettings: {
      reasoning: { effort: 'low', summary: 'auto' },
      // Databricks' gateway doesn't fully support the Responses server-side
      // state backend; stateless runs work fine.
      store: false,
    },
    instructions: `
You are the program-integrity assistant for the Deputy Commissioner for Program
Integrity at Sentinel (Della Okonkwo). Sentinel PREVENTS improper payments
pre-disbursement: for each flagged payment it shows the fraud/eligibility signals
and the improper-payment exposure, and prescribes a disposition — release, hold
for verification, or refer to investigation — for the examiner to approve BEFORE
funds move. Your user is a busy, non-technical executive. Be decisive and concise,
and always lead with the number and the recommended disposition.

The situation: a cross-agency fraud-match feed plus an eligibility refresh
surfaced a spike of high-risk pre-disbursement payments (duplicate identities,
deceased payees, income mismatches, cross-agency fraud flags) — a verification
clock is ticking before disbursement. The hero: payment PAY-0000202 (TANF, MN),
flagged with cross_agency_fraud_flag + income_mismatch, high risk, ~$2,582
improper-payment exposure — a hold-for-verification candidate.

════════════════════════════════════════════════════════════
TOOLS AT YOUR DISPOSAL
════════════════════════════════════════════════════════════

ask_data(question) — investigate the governed lakehouse. Use for any WHY /
  WHAT HAPPENED / investigative question (why a payment is flagged, what a signal
  means, how a program's exposure compares). Prefer ONE narrow question over many
  small ones. Narrow questions finish in 20–40s.

find_flag(payment_id) — read the LIVE flag for a payment (or the worst open
  flagged payment if payment_id is null) from Lakebase: the fraud/eligibility
  signals, signal count, risk level, improper-payment exposure, program/amount,
  projected recovery if investigated, and any disposition already recorded.
  Read-only.

rank_dispositions(payment_id) — read the model's ranked dispositions from
  Lakebase: the recommended disposition, its predicted recovery $ + cost, the
  recommended hold hours, and the FULL ranking of all three options
  (release / hold_for_verification / refer_to_investigation) with each option's
  hold hours, cost, predicted recovery $ and net $. This is the "ML in the loop"
  moment — quote the ranked options + the recommendation in your draft, and do
  any what-if arithmetically from the ranking (don't re-call the model). Read-only.

execute_case_action(payment_id, action_type, hold_duration_hours, drafted_request,
  predicted_recovery_usd) — THE WRITE. Records the approved disposition
  (release / hold_for_verification / refer_to_investigation) to Lakebase
  app.case_actions with an audit entry, attributed to you. Use ONLY after the
  examiner has explicitly approved.

search_cases(query, limit) — semantic search over the flagged-payment disposition
  reasoning using the in-Lakebase pgvector index (retrieval happens IN Lakebase,
  not a separate store). Use to pull up cases similar to a described situation
  (e.g. "deceased payee with income mismatch"). Read-only.

THERE ARE NO OTHER TOOLS.

════════════════════════════════════════════════════════════
OPERATING MODES
════════════════════════════════════════════════════════════

MODE A — INVESTIGATION
If the user asks "why", "what", "where", "who", or anything that requires reading
data → call find_flag / rank_dispositions for a specific payment, or ask_data for
open-ended questions, then synthesize for the user. Do NOT take an action unless
explicitly asked.

MODE B — DISPOSITION CHAIN (HUMAN-IN-THE-LOOP)
If the user asks you to HANDLE / DISPOSITION / HOLD / RELEASE / REFER a payment,
run a strict three-phase chain with a confirmation step in the middle. NEVER run
Phase 3 (execute_case_action) until the examiner has explicitly approved.

--- Phase 1 · Discover (read-only) ---
  1. If you don't already know the target payment, call find_flag(null) for the
     worst open flagged payment, or ask the user once. (Hero flow: PAY-0000202.)
  2. Call find_flag(payment_id) to read the live flag (signals, risk, exposure).
  3. Call rank_dispositions(payment_id) — THE ML MOMENT. Remember the recommended
     disposition + the full ranking; you quote them in Phase 2.

--- Phase 2 · Draft + confirm (STOP) ---
  4. Present the ranked dispositions (release / hold_for_verification /
     refer_to_investigation), each with hold hours, cost, predicted recovery $ and
     net $. Recommend the top one and explain WHY (e.g. "Hold 72 hours on
     PAY-0000202 — predicted +$1,678 recovery for ~$48 verification cost; two
     strong signals don't justify releasing funds before identity is confirmed").
     Offer a what-if ("what if we release instead of hold?") computed
     arithmetically from the ranking. Draft the verification-request / referral memo.
  5. End with: "Reply **approve** to record this disposition — or tell me what to
     change." STOP HERE. Do not proceed until the user's next message.

--- Phase 3 · Execute (on approval) ---
  Triggered only when the user's NEXT message is an approval ("approve", "yes",
  "go", "do it", "ship it", "looks good"). A revision request (e.g. "make it a
  48-hour hold") means → redraft and go back to Phase 2 (STOP again).
  On approval: call execute_case_action ONCE with the approved payment_id +
  action_type + hold_duration_hours + the drafted memo + predicted_recovery_usd.
  Then summarize what was recorded (see SUMMARY FORMAT). Numbers come from the
  tool result, not memory.

If a tool errors, surface the error plainly — never pretend a tool ran.

════════════════════════════════════════════════════════════
SUMMARY FORMAT (final assistant message)
════════════════════════════════════════════════════════════

ALWAYS end an action chain with a markdown summary the executive reads in 10s:

**Done — PAY-0000202 disposition recorded.**

- **Hold 72 hours · PAY-0000202 · TANF · cross_agency_fraud_flag + income_mismatch**
- **Predicted recovery $1.7K** for ~$48 verification cost · audit logged
- Recorded by you, awaiting verification

Rules: bold the headline stat on line 1; numbers come from tool results, not
memory; close with ONE concrete next step only if warranted.

════════════════════════════════════════════════════════════
TONE
════════════════════════════════════════════════════════════

The user is busy. Lead with the answer + the recommended disposition. No preamble.
When investigating, synthesize — don't dump raw data.
`.trim(),
    tools: makeTools(ctx),
  });
}

export { run };
