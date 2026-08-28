# Branching — evidence map

Branching in this project is **dual**: git branches (source-code iteration) **and**
Lakebase Postgres branches (copy-on-write database branches that auto-expire and
suspend when idle). Both are covered below.

Live evidence captured 2026-08-28 against Lakebase project `sentenel-tech-summit-27`
using CLI profile `fe-sandbox-tech-summit-27-doug`.

| Row | Requirement | Evidence file(s) | Why it satisfies |
|---|---|---|---|
| 8 | A development branch off main is named, and its creation is captured in code | `git_branch_creation.txt`, `../branch.txt`, `lakebase_branch_creation_code.txt`, `lakebase_branches.json` | **git:** reflog shows `dev` "Created from origin/main" at `861be91`. **Lakebase:** `lakebase_setup_db.sh:83-92` (`create-branch`/`create-endpoint`) is the code that creates a branch+endpoint; live `dev` branch exists with `source_branch=production`. |
| 9 | The branch's changes are committed as versioned artifacts | `dev_branch_table_rename.patch` | Real `git format-patch` of the dev branch's development commits (`7dc9b78`, `0ed6aa6`) off the original main `861be91` — 10 files, +114/−28, committed here as a versioned patch artifact. |
| 11 | Both branch uses shown: development iteration + a throwaway forecasting branch | `forecast_throwaway_branch_lifecycle.txt`, `lakebase_branches.json` | **Iteration:** long-lived `dev` branch (git + Lakebase). **Throwaway forecasting:** real `forecast-throwaway` Lakebase branch created copy-on-write off production with a 1h TTL, listed, then deleted — full create→list→delete transcript. (`dev-app-updates` is a second real auto-expiring throwaway branch.) |
| 12 | Scale-to-zero configured so idle branches cost close to nothing | `lakebase_branch_creation_code.txt`, `lakebase_production_endpoint.json`, `lakebase_project.json` | **Build construct:** `lakebase_setup_db.sh:91-92` creates endpoints with `autoscaling_limit_min_cu: 0.5` (low floor). **Live config:** endpoints carry `suspend_timeout_duration` (auto-suspend/pause when idle → compute→0 → ~$0), and throwaway branches start at `logical_size_bytes: 0` (copy-on-write). DAB warehouse also `auto_stop_mins: 10` (databricks.yml:123). |

## Files
- `dev_branch_table_rename.patch` — versioned diff of the dev branch development commits.
- `git_branch_creation.txt` — reflog proof `dev` was branched from `main`, plus the promotion merge `6efe430`.
- `lakebase_branch_creation_code.txt` — cited branch/endpoint-creation code (`lakebase_setup_db.sh`, `databricks.yml`).
- `forecast_throwaway_branch_lifecycle.txt` — real create→list→delete of a throwaway forecasting Lakebase branch.
- `lakebase_branches.json` — live list of all Lakebase branches (`production`, `dev`, `dev-app-updates`).
- `lakebase_project.json` / `lakebase_production_endpoint.json` — live project + endpoint config (scale-to-zero / suspend settings).

## Notes / caveats
- The live `production` endpoint currently reports `autoscaling_limit_min_cu: 8` (it was
  scaled up for the workshop); the *code* that provisions branch endpoints sets the
  low `0.5` floor. Scale-to-zero here is the **suspend-on-idle** mechanism
  (`suspend_timeout_duration`), which pauses compute for idle branches.
- `main..dev` currently diffs to only the `submission1` commit because `dev` was already
  merged into `main` (`6efe430`); the substantive branch development is therefore
  captured as the `861be91..0ed6aa6` range in `dev_branch_table_rename.patch`.
