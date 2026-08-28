# Tasks 6, 7, 8 — Extend to the coding agent + MCP (Unity AI Gateway)

All three tasks are executed **live** against workspace
`https://fe-sandbox-tech-summit-27-doug.cloud.databricks.com` using **`ucode`**
(Databricks' Unity AI Gateway Coding CLI, `v0.1.0+42.gaa7be13`, installed from
`github.com/databricks/ucode`). The artifacts in this folder are the actual command
outputs / config files, not mock-ups.

| # | Task | Status |
|---|---|---|
| 6 | Onboard coding agent with Unity Gateway (ucode) | ✅ Claude Code configured; base URL routes through the gateway |
| 7 | Onboard Slack MCP with Unity Gateway + add to coding agent | ✅ `system.ai.slack` registered for Claude Code; `✔ Connected` |
| 8 | Use Slack MCP to search instructions on the guardrails solution | ✅ Live searches run through the gateway MCP; real results captured |

---

## Task 6 — Onboard the coding agent with Unity AI Gateway

**Command (headless — reused the profile's cached OAuth, no browser needed):**
```bash
uv tool install git+https://github.com/databricks/ucode
ucode configure --agent claude --profiles fe-sandbox-tech-summit-27-doug --skip-validate
```
Output: `✔ Databricks authentication complete` → `✔ Unity AI Gateway detected` →
`✔ Databricks AI Tools installed` → `Claude Code: configured (Provider: Databricks)`.

**Evidence:**
- `ucode_status.txt` — `ucode status`: Claude Code **Configured: yes**, and
  **Base URL: `https://fe-sandbox-tech-summit-27-doug.cloud.databricks.com/ai-gateway/anthropic`**
  — i.e. Claude Code's model traffic is routed through Unity AI Gateway, not straight to Anthropic/FMAPI.
- `claude_ucode_settings.json` — the config ucode wrote to `~/.claude/ucode-settings.json`:
  - `ANTHROPIC_BASE_URL` = the gateway `/ai-gateway/anthropic` route.
  - `CLAUDE_CODE_USE_GATEWAY=1`, `ANTHROPIC_CUSTOM_HEADERS: x-databricks-use-coding-agent-mode: true`.
  - Model pins resolve to UC-governed models: `system.ai.claude-opus-4-8`,
    `system.ai.claude-sonnet-5`, `system.ai.claude-haiku-4-5`.
  - **No token on disk** — auth is a dynamic `apiKeyHelper` (`ucode auth-token …`) that mints a
    fresh per-request token, so per-user identity + usage tracking + rate limiting apply and no
    shared secret is stored.

Because traffic flows through the gateway, this coding agent's usage is now subject to the
same governance layer as the app's LLM (usage tracking, rate limits, guardrails, and the
`tech_summit_27_sentenel` budget — see `../budget_evidence.md`).

## Task 7 — Onboard the Slack MCP with Unity AI Gateway + add it to the coding agent

**Command (non-interactive):**
```bash
ucode configure mcp --services system.ai.slack
```
Output: `Discovering MCP services in system.ai…` → `Configuring MCP servers… 0/1` → `✔ Saved`.

**Evidence:**
- `mcp_servers.json` — the ucode registration record: server `system-ai-slack` →
  `https://…/ai-gateway/mcp-services/system.ai.slack`, `auth: "proxy"`, `clients: ["claude"]`.
  The MCP is served **through the gateway** (UC-governed MCP service), not a direct Slack token.
- `claude_mcp_list.txt` — `claude mcp list` shows the server registered in Claude Code itself and
  **`✔ Connected`**:
  `system-ai-slack: … ucode mcp-proxy --url …/ai-gateway/mcp-services/system.ai.slack … ✔ Connected`.
  ucode wires it as a local stdio↔gateway bridge (`ucode mcp-proxy`) that injects a freshly-minted
  gateway token on every upstream request.
- `slack_mcp_tools.json` — the MCP handshake + `tools/list`: `serverInfo.name = "slack"`, and the
  gateway MCP surfaces **read-only** Slack tools only (`slack_search_public_and_private`,
  `slack_search_channels`, `slack_search_users`, `slack_read_channel`, `slack_read_thread`,
  `slack_read_canvas`, `slack_read_user_profile`) — write tools are filtered out by the wrapper.
  Slack itself is authenticated through the gateway (the MCP resolves a logged-in Slack user id),
  satisfying the "AI Gateway → MCPs → slack → Login" prerequisite.

## Task 8 — Use the Slack MCP to search instructions on the guardrails solution

Ran `slack_search_public_and_private` through the **ucode-registered `system.ai.slack` MCP**
(over the gateway), for the guardrails solution. Full verbatim results are in
`slack_guardrails_search.md`. Two queries: `"guardrails"` and `"custom guardrails LLM judge"`.

**Instructions/solution surfaced (real Slack messages):**
- **AI Gateway V2 LLM-based Guardrails** (David Liu, `#ai-gateway`): 5 OOB templates — PII Redaction,
  PII Blocking, Unsafe Content, Jailbreak, Hallucination; **custom prompts for your own LLM-as-judge**;
  **input & output phases** with **sanitize and block** actions. User guide:
  `docs.databricks.com/aws/en/ai-gateway/guardrails`.
- **Step-by-step config** (Julia Beck, `#tech_summit_sample_issue`): resolve a runaway LLM query by
  configuring a custom guardrail on the model endpoint —
  **Policies for model → Service Policy → Custom guardrail type → LLM as a judge**.
- **Custom-code guardrails** (Shaotong Li, `#ai-gateway`): implemented as a **CPU serving endpoint**
  hosting your logic, attached to the LLM; request flow `agent endpoint → LLM endpoint → custom
  guardrail endpoint`. Also (Brian Law, `#westpac-agent-control-plane`) the three types:
  stock OOTB guardrail / custom LLM-judge / SQL function w/ `http_request`.
- **UC Service Policies** (Kevin Stumpf / Bill Wang, `#ai-gateway`): guardrails applied via UC Service
  Policies supporting **custom LLM-as-a-judge and custom code evaluators**; enablement at
  `go/aigovernance`, FAQ at `go/aigateway/faq`.

These directly informed our custom guardrail (Task 4, `../guardrails/EVIDENCE.md`): a pattern/code
**input guardrail** that **blocks** broad "query all data" requests before they reach the model —
the "custom code / block-action input guardrail" pattern the Slack threads describe.

---

### Reproduce

```bash
export PATH="$HOME/.local/bin:$PATH"
ucode status                         # workspace + Claude Code gateway routing
claude mcp list | grep system-ai     # system-ai-slack ✔ Connected
# search through the gateway MCP (stdio proxy speaks MCP JSON-RPC):
#   initialize → notifications/initialized → tools/call slack_search_public_and_private {query:"guardrails"}
ucode mcp-proxy --url https://fe-sandbox-tech-summit-27-doug.cloud.databricks.com/ai-gateway/mcp-services/system.ai.slack \
  --host https://fe-sandbox-tech-summit-27-doug.cloud.databricks.com \
  --profile fe-sandbox-tech-summit-27-doug
```

### Notes / honesty
- ucode onboarded **Claude Code** specifically (the agent in use); the same `ucode configure`
  supports codex/gemini/opencode/copilot/pi — their base URLs are pre-computed in ucode state but
  only Claude Code was configured here.
- The gateway Slack MCP is **read-only** by design (search/read tools only), which is why Task 8 is a
  search, not a write.
- Config carries **no secrets**: the Claude gateway auth and the MCP proxy both mint tokens on demand
  via `ucode auth-token` using the workspace OAuth profile.
