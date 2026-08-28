# Tasks 3 & 5 — Governed model-serving endpoint + route the app through AI Gateway

## Task 3 — programmatically create the model service + inference table

Created `sentinel-agent-llm` — an **external-model chat endpoint** that proxies the
LLM the app calls (`databricks-gpt-5-4`), so we can attach an inference table +
guardrails without touching the shared FM endpoint.

**Build construct (code):**
- `app/scripts/create_governed_llm_endpoint.sh` — idempotent create + `put-ai-gateway`.
- `app/scripts/governed_llm_endpoint.dab.yml` — the declarative (DAB) equivalent:
  `resources.model_serving_endpoints.sentinel_agent_llm` + the app `serving_endpoint`
  binding + `app.yaml` env.
- Credential: the external model authenticates to the underlying FM with a
  **service-principal OBO token** (app SP `dbgen-sentinel-ipp`, granted `CAN_USE` on
  tokens) stored as `secrets/sentinel/agent_llm_token` — never embedded.

**Execution evidence (live):**
- `endpoint.json` — `databricks serving-endpoints get sentinel-agent-llm`: `state.ready = READY`,
  `served_entity.external_model` = `databricks-gpt-5-4` (provider `databricks-model-serving`,
  task `llm/v1/chat`), and `ai_gateway.inference_table_config.enabled = true`
  (→ `tech_summit_27_sentenel.dev_doug_rogers_sentinel_ipp.sentinel_agent_llm_payload`)
  + `usage_tracking_config.enabled = true`.
- Inference table **exists** with the payload schema: `databricks_request_id,
  request_time, status_code, request, response, served_entity_id, requester, …`.
- A live test query through the endpoint returned a real model reply (proving the
  proxy reaches GPT-5): *"In one sentence, what is a pre-disbursement improper-payment
  hold?"* → a correct one-sentence answer.

**Note — inference-table writes are asynchronous.** Rows land minutes after
traffic, so the payload count read immediately after the test query was `0`. Re-check:
```sql
SELECT databricks_request_id, request_time, status_code, requester,
       left(request, 120)  AS request_snippet,
       left(response, 120) AS response_snippet
FROM tech_summit_27_sentenel.dev_doug_rogers_sentinel_ipp.sentinel_agent_llm_payload
ORDER BY request_time DESC LIMIT 10;
```

## Task 5 — route the app's LLM requests through the governed endpoint

The agent used the FM **Responses API** directly. It now routes through
`sentinel-agent-llm` (AI Gateway), which serves **chat-completions**.

**Build construct (code):**
- `app/server/agent/caseops.ts` — `configureAgentsSdk` now calls
  `setOpenAIAPI('chat_completions')` (the governed endpoint is chat-completions, not
  Responses); the OpenAI client `baseURL` stays `${host}/serving-endpoints` and the
  model is the governed endpoint name.
- `app/config/app.json` — `agentModel` = `${SERVING_ENDPOINT:sentinel-agent-llm}`
  (routes through the governed endpoint; override via `SERVING_ENDPOINT`).
- `governed_llm_endpoint.dab.yml` — the app `serving_endpoint` resource binding
  (`CAN_QUERY`) + `app.yaml` `SERVING_ENDPOINT` env, so a deploy wires the app SP to
  the endpoint declaratively.

**Execution evidence:** the app SP `dbgen-sentinel-ipp` was granted `CAN_QUERY` on
`sentinel-agent-llm` (see `endpoint.json` / permissions), and the live test query
above confirms requests to the endpoint succeed and are subject to its AI Gateway
(usage tracking + inference-table capture). Server `tsc -b tsconfig.server.json` → exit 0.

## Budget policy attachment

The endpoint's serverless usage is governed by the **`tech_summit_27_sentenel`
budget policy** (`f3f67b92-c3de-3903-b6a2-3f7ee227de07`; see `../budget_evidence.md`).
That policy is the **workspace default** (tagged `databricks-default-policy: true`),
so it **auto-applies** to this endpoint's serverless usage and cannot be explicitly
pinned — `serving-endpoints get` shows `budget_policy_id: null`, which *means* "the
default policy applies" (verified: passing `--budget-policy-id` / a JSON
`budget_policy_id` on create is a no-op for the default policy, so it stays null).
To pin a *non-default* policy instead, pass its id via `--budget-policy-id` at
create — see `create_governed_llm_endpoint.sh`.

## AI Gateway confirmation (serving through the gateway)

`endpoint.json` (`ai_gateway`) shows the endpoint serves through AI Gateway with
`inference_table_config.enabled = true` and `usage_tracking_config.enabled = true`;
the served entity is the external-model proxy and every query is captured to the
inference table. The app routes to this endpoint (Task 5), so all app LLM traffic
is served through the gateway.
