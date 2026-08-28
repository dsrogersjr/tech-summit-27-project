# Case memo — PAY-0000202 (auto-drafted)

**To:** Flagging agency — identity verification
**From:** Sentinel Program Integrity assistant
**Examiner:** doug.rogers@databricks.com
**Payment:** PAY-0000202 · TANF · MN · $3,227.73 · pre-disbursement
**Recommended disposition:** Hold for verification
**Status:** Approved (examiner recorded a 48-hour hold)

## Why this payment is flagged

Two strong signals stacked on a single high-value TANF payment:

- `cross_agency_fraud_flag`
- `income_mismatch`

Risk level **high**; improper-payment exposure **$2,582.18** on a $3,227.73
payment (2 signals). Releasing now would disburse funds before the cross-agency
match and the income discrepancy can be confirmed.

## Model recommendation and what-if

Ranked dispositions from `app.dispo_recs.action_ranking` (payment PAY-0000202):

| Disposition | Hold hours | Cost | Predicted recovery | Net value |
|---|---|---|---|---|
| Release | 0 | $0.00 | $0.00 | $0.00 |
| **Hold for verification (recommended)** | 72 | $48.42 | $1,678.42 | **$1,630.00** |
| Refer to investigation | 240 (~10 days) | $161.40 | $2,582.18 | $2,420.78 |

Note the nuance: **refer to investigation** shows the highest gross net value
($2,420.78) because it recovers the full improper exposure — but the recommended
disposition is **hold for verification**. The signal-strength policy (2 fraud
signals) prefers the least-intrusive disposition that still stops disbursement;
the ranking's net values are advisory economics, not the policy authority.

**What-if (release vs. hold):** releasing avoids the ~$48 delay cost but forgoes
the $1,678 projected recovery and accepts the $2,582 exposure. Holding trades ~$48
of delay for that recovery — a ~35x return on the delay cost. The model
recommends **hold for verification** (72h); rationale on file:

> High-risk: 2 fraud signal(s) on a $3,228 TANF payment → estimated $2,582
> improper exposure, $1,678 projected recovery if investigated. Recommend
> hold-for-verification: verification (~$48 delay cost over 3 days) confirms
> before disbursement. If improper, recovery is preserved pre-disbursement.

## Verification request (draft)

> Hold PAY-0000202 48h for identity verification. Two strong signals
> (cross_agency_fraud_flag, income_mismatch) on a high-exposure TANF payment;
> confirm identity and the cross-agency match before disbursement.

## Examiner decision

The examiner **approved a hold for verification**, shortening the hold from the
model's recommended **72 hours** to **48 hours** — a human correction captured at
approval time. Recorded to the writable table `app.case_actions`:

- `case_action_id` = 37f0ba5e-d5f6-4dac-971e-21a8f3c9371e
- `status` = approved · `approved_by` = doug.rogers@databricks.com
- committed 2026-08-28T14:25:26.336Z

See `writeback_table.json` (the committed row) and `view_result.json` (the queue
now shows PAY-0000202 as held).
