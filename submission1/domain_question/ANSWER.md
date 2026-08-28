# Domain question — TANF fraud detection (low-latency Lakebase answer)

**Question (`submission1/core_question.txt`):** "Dive deeper into TANF and why
they have more fraud detection than other organizations."

**How it was answered:** the query in `lakebase_domain_query.sql` runs directly
against the Lakebase (Postgres) synced mirror `app.payment_position`, not the
Spark/UC gold table. Measured latency was **~48 ms per query** (full session
output in `lakebase_domain_result.txt`). The per-signal breakdown it returns is
**byte-identical** to the Spark result committed in
`../core_query_result.json` — same 21 rows, same counts — so the low-latency
path returns the correct answer.

## The real numbers (captured live)

Per-program summary:

| program   | flagged_payments | total_signals | avg_signals/payment | total_exposure_usd |
|-----------|------------------|---------------|---------------------|--------------------|
| Veteran's | 13               | 13            | 1.00                | 3,177.02           |
| TANF      | 11               | 12            | 1.09                | **5,240.46**       |
| SNAP      | 8                | 9             | 1.13                | 2,563.91           |
| Child Care| 6                | 6             | 1.00                | 1,352.30           |
| Disability| 5                | 5             | 1.00                | 1,449.99           |

TANF signal breakdown: income_mismatch 5, **duplicate_identity 3**,
**deceased_payee 2**, cross_agency_fraud_flag 1, residence_mismatch 1.

## Why TANF stands out

TANF is not the largest queue by raw count (Veteran's has more flagged
payments), but its detections are **higher-severity and higher-value**:

- **Highest total improper-payment exposure of any program — $5,240** — despite
  fewer flagged payments than Veteran's, so each TANF flag carries more dollars
  at risk.
- **Leads every program on the two identity-integrity signals:**
  `duplicate_identity` (3, the most of any program) and `deceased_payee` (2, the
  most of any program). These are the strongest fraud indicators in the model,
  so TANF surfaces proportionally more *actionable* fraud detection.
- **Widest spread of signal types** (5 distinct signals) combined with the
  highest non-SNAP per-payment signal density (1.09), meaning TANF payments trip
  multiple, varied checks rather than a single weak flag.

Net: TANF "has more fraud detection" because its flagged payments concentrate
the identity-fraud signals (duplicate identity, deceased payee) that dominate
improper-payment risk — which is also why it tops the exposure ranking.
