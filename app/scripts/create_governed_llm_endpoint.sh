#!/usr/bin/env bash
# Programmatically create the governed model-serving endpoint the Sentinel app's
# agent calls, with an AI Gateway inference table (audit log of every LLM
# request/response) + usage tracking. Idempotent — safe to re-run.
#
# Why a dedicated endpoint: the app currently calls the SHARED FM endpoint
# `databricks-gpt-5-4`. We must not attach an app-specific inference table /
# guardrails to a shared endpoint, so we stand up `sentinel-agent-llm` — an
# external-model (chat-completions) endpoint that proxies databricks-gpt-5-4 —
# and govern THAT. The app is then routed through it (see task 5).
#
# ── Prerequisite (one-time): a secret holding a token the external model uses to
#    call the underlying Databricks FM endpoint. Do NOT hard-code a token here.
#    Create a PAT in the workspace UI (or `databricks tokens create`), then:
#      databricks secrets create-scope sentinel            --profile <P>   # once
#      databricks secrets put-secret  sentinel agent_llm_token \
#        --string-value '<PAT>'                             --profile <P>
#
# ── Run:
#   DATABRICKS_CONFIG_PROFILE=fe-sandbox-tech-summit-27-doug \
#     ./app/scripts/create_governed_llm_endpoint.sh
#   (or pass --profile <name>)
set -euo pipefail

PROFILE="${DATABRICKS_CONFIG_PROFILE:-}"
[[ "${1:-}" == "--profile" ]] && PROFILE="$2"
PF=(); [[ -n "$PROFILE" ]] && PF=(--profile "$PROFILE")

ENDPOINT="sentinel-agent-llm"
HOST="$(databricks auth env "${PF[@]}" 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin).get("env",{}).get("DATABRICKS_HOST",""))' 2>/dev/null || true)"
[[ -z "$HOST" ]] && HOST="https://fe-sandbox-tech-summit-27-doug.cloud.databricks.com"
SECRET_REF='{{secrets/sentinel/agent_llm_token}}'
IT_CATALOG="tech_summit_27_sentenel"
IT_SCHEMA="dev_doug_rogers_sentinel_ipp"

echo "[gov-llm] endpoint=$ENDPOINT host=$HOST"

# ── 1. Create the external-model chat endpoint proxying databricks-gpt-5-4 ────
if databricks serving-endpoints get "$ENDPOINT" "${PF[@]}" >/dev/null 2>&1; then
  echo "[gov-llm] endpoint exists — skipping create"
else
  echo "[gov-llm] creating $ENDPOINT (external_model → databricks-gpt-5-4, task llm/v1/chat) …"
  databricks serving-endpoints create "$ENDPOINT" "${PF[@]}" --json "{
    \"config\": {
      \"served_entities\": [{
        \"name\": \"sentinel-agent-llm\",
        \"external_model\": {
          \"name\": \"databricks-gpt-5-4\",
          \"provider\": \"databricks-model-serving\",
          \"task\": \"llm/v1/chat\",
          \"databricks_model_serving_config\": {
            \"databricks_workspace_url\": \"$HOST\",
            \"databricks_api_token\": \"$SECRET_REF\"
          }
        }
      }]
    }
  }"
fi

# ── 2. AI Gateway: inference table (audit) + usage tracking ───────────────────
# NOTE: this is the governance layer. inference_table_config logs every request +
# response to <catalog>.<schema>.<prefix>_payload as a governed Delta table.
echo "[gov-llm] enabling AI Gateway inference table + usage tracking …"
databricks serving-endpoints put-ai-gateway "$ENDPOINT" "${PF[@]}" --json "{
  \"usage_tracking_config\": { \"enabled\": true },
  \"inference_table_config\": {
    \"enabled\": true,
    \"catalog_name\": \"$IT_CATALOG\",
    \"schema_name\": \"$IT_SCHEMA\",
    \"table_name_prefix\": \"sentinel_agent_llm\"
  }
}"
# (Task 4 adds the guardrails block to this same put-ai-gateway call — see
#  set_llm_guardrails.sh.)

# ── 3. Grant the app service principal CAN_QUERY ──────────────────────────────
# Preferred: the DAB app `serving_endpoint` resource binding (governed_llm_endpoint.dab.yml)
# auto-grants the app SP CAN_QUERY on deploy. To grant out-of-band, find the app
# SP and set endpoint permissions:
#   SP=$(databricks apps get dbgen-sentinel-ipp "${PF[@]}" -o json | python3 -c 'import sys,json;print(json.load(sys.stdin)["service_principal_client_id"])')
#   EID=$(databricks serving-endpoints get "$ENDPOINT" "${PF[@]}" -o json | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
#   databricks serving-endpoints set-permissions "$EID" "${PF[@]}" --json \
#     "{\"access_control_list\":[{\"service_principal_name\":\"$SP\",\"permission_level\":\"CAN_QUERY\"}]}"

# ── 4. Wait for READY ─────────────────────────────────────────────────────────
echo "[gov-llm] waiting for READY …"
for _ in $(seq 1 40); do
  st="$(databricks serving-endpoints get "$ENDPOINT" "${PF[@]}" -o json 2>/dev/null \
        | python3 -c 'import sys,json;d=json.load(sys.stdin);s=d.get("state",{});print(s.get("ready"),s.get("config_update"))' 2>/dev/null || true)"
  echo "[gov-llm]   state: $st"
  [[ "$st" == "READY NOT_UPDATING" ]] && { echo "[gov-llm] done."; exit 0; }
  sleep 15
done
echo "[gov-llm] WARNING: endpoint not READY after timeout — check the console." >&2
