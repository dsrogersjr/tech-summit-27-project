# App Specification — Overview, Home & Assistant

> **Build-time note.** Read `DEMO_SKILL_DIR/app/app.md` FIRST and follow it end-to-end (rsync template → customize → Lakebase → env → smoke test → deploy). This is **not** a from-scratch build: the template at `DEMO_SKILL_DIR/app/app_template/` is a Node.js + React + Express (`@databricks/appkit`) app with Lakebase, agent streaming, MLflow tracing, OBO auth, chat dock, and scripted demo chain already wired. Rsync it into `PROJECT/app/`, read `TEMPLATE_MAP.md` for what's preserved vs customized, then rewrite domain pieces (home narrative, agent tools, Lakebase schema, analytics SQL, theming) to match this story. On conflict: `app.md` governs *how*, this spec governs *what*.

> **This app is the pre-disbursement PREVENTION surface.** Three implemented layers **Visualize → Assist → Act**: (1) **Lakebase** = the data model in `03_DATA_MODEL.md` (a synced read-only payment queue table + a writable case-actions table); (2) **Databricks Apps** = the examiner console; (3) **Unity AI Gateway** = the assistant's model calls run through the Gateway (**spend cap ~$500K/yr, per-program-attributable inference logging, guardrails**) — so the AI that assists is bounded and audit-ready for the IG/GAO, not open-ended. The hero question is *"PAY-0000202 is a $3,227.73 TANF payment in MN flagged for cross-agency fraud and an income mismatch — should I release it, hold it for verification, or refer it to investigation?"* The current heuristic recommends a 72-hour hold (about $2,582.18 exposure and $1,678 predicted recovery); the examiner approved 48 hours before funds disburse.

## Pitch

AI assistant that **investigates a flagged payment, ranks the best disposition, and executes it** in one conversation — not just answers questions. Della watches every step happen live: the assistant asks Genie why PAY-0000202 is flagged, reads the live Lakebase payment + fraud-signal context, then **looks up the ranked disposition recommendation** (`app.dispo_recs`, mirrored from `gold_disposition_recommendations`, currently built by the SDP pipeline heuristic and optionally replaceable by the ML workflow in `03-ml-disposition.md`). It compares release / hold for verification / refer to investigation, explains the 72-hour hold recommendation for the $3,227.73 TANF payment with ~$2,582.18 exposure and about $1,678 predicted recovery, offers a what-if, drafts the verification request + case memo, and **stops for approval**. Della approves a 48-hour hold → the case action + memo write to Lakebase → the Payment Queue + KPI tiles tick live.

## Databricks capabilities mapped

| Capability | Where it shows |
|-----------|---------------|
| **Lakebase** | The read surface (synced read-only `payment_queue` for low-latency per-payment reads) AND the write surface (writable `case_actions` — the app records approved holds/releases/investigations here). Same UC governance as Delta. |
| **AI/BI Genie** | `ask_data` tool routes the "why is this payment flagged?" investigation to the Genie space; reasoning streams into the Thinking panel. |
| **Disposition recommendation** | The current SDP heuristic populates `gold_disposition_recommendations`, mirrored to `app.dispo_recs`; the app reads those recommendations rather than scoring inline. A UC-registered ML model is an optional replacement using the same output contract. |
| **AI Functions (`ai_classify`)** | Signal classification (fraud/eligibility/administrative) + case-priority scoring in SDP, mirrored on the payment row. The queue is sortable by risk_level. |
| **Unity AI Gateway** | The assistant's model endpoint is registered through the Gateway — spend cap (**~$500K/yr bounded**), content-filter guardrails, every call logged to a UC inference table and attributable **per case and per program** — the audit trail the IG/GAO need. Talk-track surfaced via a small "AI spend (bounded)" panel/link. |
| **MLflow tracing** | Per-turn traces with tool spans. Thumbs up/down → human assessments on traces. |
| **Databricks Apps** | SSO, OBO auth (actions stamped with Della's email), secrets, auto-scaling. |
| **AI/BI Dashboards** | Embedded as an iframe with SSO — the payment-risk dashboard from `04-ai-bi.md`. |

## Pages

| Page | Purpose | Key capability |
|------|---------|---------------|
| **Home** | Narrative landing — story, persona, journey diagram, starter chips, featured action card, activity feed | Config-driven (`config/app.json`) |
| **Payment Queue** | The flagged-payment surface — a prioritized queue list + KPI cards (Improper-payment exposure / Flagged count / Projected recovery / Disposition breakdown), detail drawer with the ranked disposition options + Approve/Override + case memo + activity timeline | **Lakebase** OLTP |
| **Analytics** | Warehouse-backed charts: case history trends (disposition vs. improper outcome), signal-type breakdown, recovery by disposition | **SQL Warehouse** on Delta |
| **Dashboard** | Embedded AI/BI dashboard iframe (from `04-ai-bi.md`) | **AI/BI Dashboards** |

## Assistant

Lives on every page. Two surfaces, one brain:
- **Floating dock** (bottom-right) — persistent conversation per user (`kind='demo_dock'`), survives navigation. Hidden on the full-page chat route.
- **Full-page chat** — for longer conversations or reviewing history.

### The three layers (Visualize / Assist / Act)

This is the enablement arc rendered in the app:
- **Visualize** (Payment Queue page) — the live payment queue makes the important thing obvious at a glance: red high-risk cases (stacked signals + high recovery potential) next to yellow moderate and green low-risk. Reads synced Lakebase payment data.
- **Assist** (the agent) — a chat assistant that explains why a payment is flagged, ranks the best disposition, and offers a what-if. Reads the current heuristic recommendation + the live payment + fraud-signal context.
- **Act** (the write) — after human approval, the app writes the chosen disposition (hold/release/investigate) + case memo + verification request to the writable Lakebase `case_actions` table; the Payment Queue cascades.

### Thinking panel
Top-right floating panel, streams live during agent turns: reasoning steps, the Genie investigation ("querying payment flags", "analyzed improper probability"), tool calls with inputs/results. Persisted on the message as `thinking[]` JSONB → survives reload (collapsed "Reasoning · N tools" toggle).

### Human-in-the-loop
**Read-only queries** — assistant calls Genie / reads Lakebase, synthesizes an answer. No side effects.

**Action chains** — strict 3-phase:
1. **Discover** — read the flagged payment (payment_id, program, amount, n_signals, signal_list), read the fraud-signal context, **look up the ranked disposition recommendation** for this payment (read-only).
2. **Draft + confirm** — present the ranked options (release / hold-for-verification / refer-to-investigation) each with citizen delay cost, improper probability, projected recovery; recommend the top one and explain why; offer a what-if ("what if we hold 5 days instead of 3?"); draft the case memo + verification request → **STOP, wait for approval**.
3. **Execute** (after "yes") — write the approved disposition to `case_actions` (records disposition, case memo, risk_level, predicted recovery, examiner email), append an audit entry — one atomic write.

### Agent tools (Sentinel)

The implemented agent tools chain the visible loop: (1) `ask_data` asks Genie to investigate, (2) `find_flag` reads Lakebase for live payment + signal context, (3) `rank_dispositions` reads the current recommendation and three-option ranking, and (4) `execute_case_action` writes Lakebase atomically after approval.

| Tool | What it does | Phase |
|------|-------------|-------|
| `ask_data` | Delegates to the Genie space — investigates the flagged payment over the governed lakehouse (fraud signals, improper probability from history), streams reasoning to the Thinking panel | Investigation |
| `find_flag` | Queries Lakebase for the open flagged payment by payment ID and optional signal type (or the worst flagged case), returning the live amount, signal, risk, frequency, hold, and exposure context. | Discovery |
| `rank_dispositions` | Queries Lakebase `app.dispo_recs` for the payment and returns the current heuristic's recommended disposition, hold duration, predicted recovery/cost, and all three ranked options. The same contract supports an optional ML-generated recommendation later. | Discovery |
| `execute_case_action` | Bulk/atomic write to Lakebase `app.case_actions`: records the approved disposition (disposition_chosen, payment_id, case_memo, verification_request, predicted_recovery_usd, examiner_email), appends an audit entry. Inputs are a FILTER (`{payment_id, disposition_chosen, memo_text, verification_request?}`) — never a list of IDs. | Execution (requires approval) |

> **Write tools must trigger a visible UI refresh.** `execute_case_action` MUST publish a `dataMutated` event on commit. The Payment Queue page subscribes and refetches: the Improper-payment-exposure KPI ticks down (by the recovered $), the Flagged-count KPI ticks, the affected payment row flips to "hold in progress" or "investigating" and gains a status badge, the queue re-sorts by residual improper exposure, and any open drawer re-fetches its activity timeline. The user must **see** the queue change without reloading — that live cascade is the moment the demo lands.

## Home page

Narrative landing — tells the story in 10s, plays it in 90s.

**Story section:** Persona badge ("Della Okonkwo · Deputy Commissioner for Program Integrity · Sentinel"), headline ("Fraud alert spike: $280M queue at risk"), situation (a cross-agency fraud-match feed + eligibility refresh ~3 weeks ago surfaced a wave of flagged payments — the daily flagged rate jumped from ~5% to ~30%+, improper-payment exposure concentrated in high-risk stacked-signal cases, examiner capacity ~50/day → backlog without smart triage; *Della's director just escalated to the CFO*), goal (identify the worst high-risk cases → get a smart disposition ranking → approve holds/investigations), preview bullets.

**Journey diagram:** 4-beat horizontal strip — See the flagged queue → Payment Queue | Ask why PAY-0000202 is flagged → starts chat | Rank the disposition → current heuristic | Approve the 48-hour hold → action flow.

**Starter chips:** "How much improper-payment exposure are we at risk of?" / "Why is Payment PAY-0000202 flagged?" / "What is the recommended disposition for Payment PAY-0000202?" — each starts a fresh conversation.

**Featured action card:** "Stop PAY-0000202 before disbursement" — one click triggers the full investigate → rank → draft → approve flow.

**Activity feed:** Live tail of agent actions, including the examiner-approved 48-hour `hold_for_verification` for PAY-0000202 and its about $1,678 predicted recovery. Auto-refreshes.

## Scripted demo flow (~3 min)

Assistant supports a scripted chain via `config.assistantScript`. After each response, a "Suggested next" chip appears if trigger keywords are detected in the previous answer.

**Step 1 — "Why is Payment PAY-0000202 flagged, and what are my disposition options?"**
Always available. `ask_data` → Genie investigates `cross_agency_fraud_flag` + `income_mismatch` against a $3,227.73 TANF payment in MN. `find_flag` reads the live context and ~$2,582.18 improper exposure. Thinking panel shows the routing live.

**Step 2 — "Rank the disposition options."**
The agent calls `rank_dispositions`, quotes all three options, and explains that the current heuristic recommends **hold-for-verification for 72 hours**, with about $1,678 predicted recovery. It drafts the verification request + case memo, clearly labels this as a recommendation, and stops for approval.

**Step 3 — "Yes — approve the hold."**
Unlocks when "hold"/"verify"/"approve" is mentioned. Della approves **48 hours**, and `execute_case_action` runs one atomic Lakebase write recording the hold, verification request, memo, approver, and predicted recovery. It emits `dataMutated`; PAY-0000202 and its activity timeline refresh without a reload.

**Performance:** Agent prompt steers toward narrow Genie questions (20–40s). The payment + recommendation lookups are Lakebase reads — sub-second.

All narrative config lives in `config/app.json` — persona, story, starter questions, assistantScript (with triggerAfter keywords), featuredAction, resource IDs. Read it directly.
