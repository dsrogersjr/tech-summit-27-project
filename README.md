# Sentinel — Improper-Payment Prevention (Pre-Disbursement)

**The use case, in plain words:** The Benefits Agency pays out ~$60B/year and loses ~6% of it — **~$3.6B/year** — to *improper payments*: money paid to the wrong person, in the wrong amount, or without the documentation to prove it should have been paid at all. Some is honest error; some is organized fraud — stolen or synthetic identities, deceased payees, undisclosed income. Today the agency catches most of it *after* the money is gone, then tries to claw it back — the slow, largely futile **"pay-and-chase"** cycle, where only a fraction is ever recovered.

The signals that would have stopped a bad payment — a duplicate identity, a cross-agency income mismatch, a payee another agency already flagged — usually exist *somewhere* before disbursement. Nobody sees them in the seconds before the payment file goes out. **Sentinel** puts a governed, pre-disbursement view in front of a program-integrity examiner that not only flags a risky payment but **prescribes the disposition — release, hold for verification, or refer to investigation — for the examiner to approve before funds move.** Governed lakehouse data becomes *prevention*, not *recovery*. And because it's government, the AI that assists is **bounded and audited** — spend is capped and per-program-attributable, and every recommendation leaves an evidence trail for the Inspector General and GAO.

---

## The Story

| | |
|---|---|
| **Agency** | Sentinel — a federal Benefits Agency (~$60B annual disbursements, ~2M active beneficiaries, 5 programs) |
| **Hero** | Della Okonkwo, Deputy Commissioner for Program Integrity (non-technical) |
| **Problem** | Improper payments run ~6% of outlays (~$3.6B/yr) and are caught *after* disbursement — "pay-and-chase" recovers only a fraction. A cross-agency fraud-match feed + an eligibility-data refresh landed ~3 weeks ago and surfaced a **spike of high-risk pre-disbursement payments** in the queue |
| **The move** | Della asks *"Payment PAY-0000214 is flagged as likely improper — should we release it, hold it for verification, or refer it to investigation?"* Sentinel ranks the three dispositions by net recovery value (projected recovery vs. citizen-delay cost) and **prescribes hold-for-verification** — she approves before funds go out |
| **Root cause** | New fraud-match signals (duplicate identity, deceased payee, cross-agency flag) + income-eligibility anomalies from the refresh created a wave of high-risk payments concentrated in the last 21 days |
| **Impact** | Every point of improper-payment rate prevented *pre-disbursement* is **~$600M/yr** kept in the program; the flagged queue in view carries millions in improper-payment exposure that "pay-and-chase" would never recover |

---

## Business outcomes to defend

| Outcome | Value | What it means |
|---|---|---|
| **Prevention** | **~$600M/yr per point** of improper-payment rate prevented pre-disbursement | Moving from pay-and-chase recovery to pre-disbursement holds. At ~$60B outlays, one point of the ~6% improper rate is ~$600M — caught *before* the money leaves. |
| **Bounded AI** | **~$500K/yr**, capped and per-program-attributable | In government, an uncapped, unaudited AI assistant is a nonstarter with appropriators and oversight. Unity AI Gateway enforces the spend cap, guardrails, and per-case/per-program cost attribution. |
| **Audit-ready** | Evidence for the **Inspector General & GAO** | Every disposition — the signals, the ranked options, the examiner who approved, the memo — is logged in governed tables + MLflow traces. The recommendation is defensible, not a black box. |
| **Recovery → prevention** | Pay-and-chase → pre-disbursement holds | The signals already exist before disbursement; Sentinel surfaces them in the seconds that matter, so a bad payment is *stopped*, not chased. |

---

## Overview

Della Okonkwo (Deputy Commissioner for Program Integrity) opens her queue console and sees the pre-disbursement payments color-coded: **red** for high-risk improper-payment flags (stacked signals: duplicate identity, deceased, income mismatch, cross-agency fraud match) and **amber** for lower-risk or single-signal flags. She asks about the worst case — *"Payment PAY-0000214 has multiple fraud signals — should we release it, hold it, or investigate?"* — and the assistant investigates over the governed lakehouse, ranks **release / hold-for-verification / refer-to-investigation** by net recovery value, **prescribes hold-for-verification** based on the stacked strong signals and high amount, and drafts a verification request to the flagging agency. She approves; the disposition writes back to Lakebase so the next examiner pull shows the hold — **an improper payment stopped before funds disburse.** Governed data, a governed recommendation, and a bounded, audited AI assistant, end to end.

---

## Key Numbers

| Metric | Value |
|--------|-------|
| Benefits programs | 5 (TANF, SNAP, Child Care, Disability, Veteran's) |
| Annual disbursements (outlays) | ~$60B |
| Active beneficiaries | ~2M |
| Improper-payment rate | ~6% of outlays (~$3.6B/yr) |
| Value of **1 point** of improper rate prevented pre-disbursement | **~$600M/yr** |
| Pre-disbursement queue depth | ~$280M (per-day snapshot) |
| Payments flagged with risk signals | ~180 sampled (thousands / ~$42M at real scale — talk-track) |
| High-risk improper-payment exposure (multiple stacked signals) | ~$0.36M sampled (~$12M+ at real scale — talk-track) |
| Flagged-rate spike | ~5% pre-wave → ~30%+ post-wave (last ~3 weeks) — visible on the trend chart |
| Examiner review capacity | ~50 cases/day per person → prioritization matters |
| Signal types (fraud, eligibility, cross-agency) | ~8 (duplicate ID, deceased, income mismatch, benefit overlap, cross-agency fraud flag, employment mismatch, residence mismatch, manual-review flag) |
| Disposition mix (validated, learnable 3-way) | ~35% release / ~43% hold-for-verification / ~22% refer-to-investigation |
| Assistant AI spend | **Capped, per-program-attributable, ~$500K/yr bounded** |

---

## The demo arc (what the finished solution shows)

1. **See it** — open the Payment Queue app: a prioritized list of pre-disbursement payments, color-coded by risk (red high-risk / amber moderate / blue low-risk), with improper-payment exposure + flagged count + projected-recovery KPIs.
2. **Ask why** — in the chat dock, ask why Payment PAY-0000214 is flagged; the assistant investigates via Genie over the governed lakehouse.
3. **Get the prescription** — the assistant ranks release / hold-for-verification / refer-to-investigation by net recovery value (projected recovery − citizen-delay cost) and prescribes hold-for-verification, with a what-if (what if we release and discover fraud later).
4. **Act** — approve → the disposition + a case memo + verification request write back to Lakebase → the queue and KPIs update live. **The payment is stopped before it disburses.**
5. **Governed & audited AI** — every assistant call runs through Unity AI Gateway (spend cap, guardrails, per-case/per-program logging) and MLflow traces — an evidence trail the IG and GAO can audit.

---

## Products showcased

- **Synthetic data + Lakeflow / SDP** — beneficiaries, claims, the pre-disbursement payment queue, cross-agency fraud flags, and 18 months of disposition outcomes → governed silver/gold tables.
- **Unity Catalog + Metric Views** — one governed definition of payment-risk metrics, so the dashboard, Genie, and app all agree.
- **AI/BI Dashboard + Genie** — the glance-and-drill risk view and the natural-language investigation.
- **Databricks Apps + Lakebase** — the examiner's live queue console with a write-back action loop.
- **Unity AI Gateway** — the bounded, audited assistant (spend cap + per-program attribution + guardrails).

Full per-component detail is in `specifications/`; `resources.json` lists the capabilities and (after build) the created resource IDs.
