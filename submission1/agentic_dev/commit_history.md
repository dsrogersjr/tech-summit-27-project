# Progressive, layered build — commit history

Two layers of evidence: (A) the git commit history shows the demo built up in
progressive layers, and (B) the SDP transformation is itself a layered
raw→silver→gold build. Both are real artifacts in this repo.

## A. Git history (real `git log --reverse`, all branches)

| Commit | Date | Message | Scope (shortstat) |
|---|---|---|---|
| `6492768` | 2026-08-27 | Add Sentinel improper-payment prevention demo project | 140 files, +39,761 — full scaffold: app, DAB, SDP, dashboard, Genie |
| `7374c38` | 2026-08-27 | add missing setup files | 8 files, +1,249 |
| `fb71fcc` | 2026-08-27 | Point the bundle default catalog at `tech_summit_27_sentenel` | 1 file, ±1 — config layer |
| `861be91` | 2026-08-27 | Record the workspace deploy IDs and Lakebase grant command | 3 files, +71/−18 — deploy layer (`main` tip before the agent change) |
| `7dc9b78` | 2026-08-27 | rename long table name `disposition_recommendations` | 9 files, +28/−28 — **agent change, layer 1 (code/schema)** |
| `0ed6aa6` | 2026-08-28 | Add script to rename the table | 1 file, +86 — **agent change, layer 2 (migration)** |
| `6efe430` | 2026-08-28 | Merge branch 'dev' into main | 10 files, +114/−28 — **promotion into `main`** |

The agent's work is a clean two-step layered increment (`7dc9b78` schema/code →
`0ed6aa6` migration script) on the `table-rename`/`dev` branch off `main`
(`861be91`), promoted via the `--no-ff` merge `6efe430`. `main` stayed at
`861be91` until the merge — see `submission1/git_history.txt`.

## B. SDP raw → silver → gold (layered pipeline build)

The Lakeflow SDP pipeline (declared in `databricks.yml` → `pipelines.sentinel_pipeline`)
loads three ordered libraries — a textbook progressive build:

1. `transformation/00_raw.sql` — raw passthrough (parquet landing → bronze)
2. `transformation/01_silver.sql` — flagged payments + case outcomes
3. `transformation/02_gold.sql` — open queue + prescribed disposition + `gold_queue_scored`

(Also present: `transformation/build_gold_ctas.sql`, `transformation/mv_payment_risk.sql`.)

Each gold recommendation (release / hold_for_verification / refer_to_investigation)
is derived from the silver layer, which is derived from raw — the layering is
enforced by the pipeline's library order and the tables' dependency graph.
