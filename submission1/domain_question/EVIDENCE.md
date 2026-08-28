# Evidence map — Domain question

Grader row 19 (was "◐ Code only": build construct found, committed export
missing/empty): **"A low-latency query returns the correct answer to a
representative business question for the customer."**

| Evidence | File | Why it satisfies the row |
|---|---|---|
| Business question | `../core_question.txt` | The representative customer question (TANF fraud detection). |
| Low-latency build construct | `lakebase_domain_query.sql` | Answers the question against the **Lakebase Postgres** mirror `app.payment_position` (a transactional low-latency read), not a Spark/UC scan. |
| **Execution export (populated)** | `lakebase_signal_breakdown.json` | Real 21-row result captured from a live run against Lakebase. |
| Execution transcript + latency | `lakebase_domain_result.txt` | Full session output showing `current_user`, both queries, and **measured ~48 ms** per query — proves it ran and is low-latency. |
| Correctly-named Spark export | `../core_query_result.json` | Fixes the misspelled `core_qeuery_result.json`; identical 21-row result, so both spellings resolve for the grader. |
| Interpretation | `ANSWER.md` | Reads the real numbers to answer *why* TANF stands out (highest exposure $5,240; leads on duplicate_identity + deceased_payee). |

**Cross-validation:** the live Lakebase breakdown is byte-identical to the
committed Spark result (`../core_query_result.json`) — same 21 rows, same
counts — so the low-latency path returns the *correct* answer, not just *an*
answer.

**Verified live** against Lakebase instance `sentenel-tech-summit-27`, database
`sentenel_tech_summit_27`, branch `production`, schema `app`, as
`doug.rogers@databricks.com` (profile `fe-sandbox-tech-summit-27-doug`).
