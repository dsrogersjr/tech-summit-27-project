# Task 8 — Use the Slack MCP (via Unity AI Gateway) to search guardrails-solution instructions

**Tool:** `slack_search_public_and_private` on the ucode-registered `system-ai-slack` MCP
(routed through Unity AI Gateway: `.../ai-gateway/mcp-services/system.ai.slack`, `auth: proxy`).
Driven over MCP JSON-RPC through `ucode mcp-proxy`. Logged-in Slack user resolved by the gateway MCP: `U0A5U4NQQ5T`.

This is the **raw, verbatim** payload the Slack MCP returned — real messages from Databricks Slack, not synthesized.


---

## Query 1 — `slack_search_public_and_private(query="guardrails", include_context=false)`

```
# Search Results for: guardrails

## Messages (20 results)
### Result 1 of 20
Channel: #ai-gateway (ID: C05AAPK63DK)
From: Kevin Stumpf <kevin.stumpf@databricks.com> (ID: U09EFHNJ0TA) 
Time: 2026-08-04 15:53:56 EDT
Message_ts: 1785873236.097139
Reply count: 86
Permalink: [link](https://databricks.enterprise.slack.com/archives/C05AAPK63DK/p1785873236097139?thread_ts=1785873236.097139&cid=C05AAPK63DK)
Text: 
:tada: Unity AI Gateway is now in GA!!
Unity AI Gateway is the best solution to govern models, MCPs, coding agents and custom agents at scale. As of today, it's in GA! It provides:
• Integrated Observability: See how much you're spending on AI with an OOB dashboard &amp; granular usage tracking in system tables
• Cost Controls: Configure spend alerts &amp; hard spend caps by user, team, or use case
• Access controls: Configure which user and agent is allowed to use what model and MCP tool. All natively integrated with Unity Catalog, making UC the best platform to govern data and AI across workspaces!
• Choice:  
    ◦ Bring your own capacity from external model providers (e.g. Bedrock &amp; Azure)
    ◦ FMAPI partner models (e.g. gpt-5-6)
    ◦ FMAPI OSS models (GLM 5.2, Kimi K3)

Now that UAIGW is in GA:
• CSP Workspaces (incl. HIPAA) can use it!
• Ring 3 and 2 customers don't have to opt into the capability anymore. It's rolled out by default! Ring 1 &amp; CSP workspaces can opt in

Customers can (soon) opt into the following Beta features:
• Control agent access &amp; actions with Service Policies &amp; Guardrails (available today): Configure OOB guardrails (such as PII redaction), custom guardrails (LLM as a judge &amp; custom code), and external guardrails. 
• Public APIs &amp; Terraform support to enable GitOps (available today): Provision AI Gateway resources (models, providers, mcps, agents etc) via the databricks-cli, APIs, or terraform. This enables customers to manage all their AI assets in code and roll out changes via CI/CD pipelines
• Monitor AI tokens (coming by EOW): Opt into a unified trace table to observe not just AI usage metadata (e.g. the number of tokens flowing through models) but also the actual content. This allows customers to look for abuse, security &amp; compliance violations with a centralized trace table in UC (rolling out this week)
• External Model Cost Controls (coming ~August 15): See and limit the costs of both DBX-hosted models AND externally hosted models
• Intelligent Routing to bend the cost curve (coming in ~1-2 weeks): Customers can use ucode &amp; omnigent to intelligently choose the right harness &amp; model to start reducing their AI spend

References:
• <http://go/aigovernance|go/aigovernance> for a lot of enablement material
• <http://go/aigateway/faq|go/aigateway/faq> for FAQ
• <https://docs.databricks.com/aws/en/ai-gateway/|docs.databricks.com/aws/en/ai-gateway> Docs
• <https://www.databricks.com/blog/unity-ai-gateway-generally-available|databricks.com/blog/unity-ai-gateway-generally-available> Launch Blog
• <https://docs.databricks.com/api/workspace/aigateway|docs.databricks.com/api/workspace/aigateway> API Docs

<!channel>

---

### Result 2 of 20
Channel: #ext-techsummit-amer-fy27 (ID: C0BPYCSP10D)
From: Saurabh Shukla <saurabh.shukla@databricks.com> (ID: U02FKQQBRG8) 
Time: 2026-08-26 11:44:27 EDT
Message_ts: 1787759067.233269
Reply count: 1
Permalink: [link](https://databricks.enterprise.slack.com/archives/C0BPYCSP10D/p1787759067233269?thread_ts=1787759067.233269&cid=C0BPYCSP10D)
Text: 
Genie One guardrails today is one workspace-level instructions file + per-user UC access. are we planning for more granular instructions and governance ?

---

### Result 3 of 20
Channel: #ext-techsummit-amer-fy27 (ID: C0BPYCSP10D)
From: Nithin Sankar <nithin.sankar@databricks.com> (ID: U0BKJHMFF5Y) 
Time: 2026-08-26 11:48:46 EDT
Message_ts: 1787759326.702079
Reply count: 11
Permalink: [link](https://databricks.enterprise.slack.com/archives/C0BPYCSP10D/p1787759326702079?thread_ts=1787759326.702079&cid=C0BPYCSP10D)
Text: 
Serious Question: How is Genie balanced against Compliance-based environments and for customers who require a full audit chain/ security guardrails? Do we have assets around this?

---

### Result 4 of 20
Channel: #allhands-comments (ID: C45EXC66M)
From: Jay Palaniappan <jay.palaniappan@databricks.com> (ID: U03CHTEFN1H) 
Time: 2026-06-11 19:49:06 EDT
Message_ts: 1781221746.140089
Reply count: 1
Permalink: [link](https://databricks.enterprise.slack.com/archives/C45EXC66M/p1781221746140089?thread_ts=1781221746.140089&cid=C45EXC66M)
Text: 
Omnigent is OpenRouter for enterprise with better Guardrails

---

### Result 5 of 20
Channel: #ext-techsummit-amer-fy27 (ID: C0BPYCSP10D)
From: Prasanna Saraswathi Krishnan <prasanna.krishnan@databricks.com> (ID: U089D32VCQK) 
Time: 2026-08-25 17:07:18 EDT
Message_ts: 1787692038.486499
Permalink: [link](https://databricks.enterprise.slack.com/archives/C0BPYCSP10D/p1787692038486499)
Text: 
Do we support NeMO guardrails and/or other open source alternatives as part of our custom guardrails?

---

### Result 6 of 20
Channel: #fe-build-with-ai (ID: C098MJXTEF3)
From: Steve Ostrowski <steve.ostrowski@databricks.com> (ID: U080A8B5N7M) 
Time: 2026-03-12 20:16:45 EDT
Message_ts: 1773361005.329669
Reply count: 34
Permalink: [link](https://databricks.enterprise.slack.com/archives/C098MJXTEF3/p1773361005329669?thread_ts=1773361005.329669&cid=C098MJXTEF3)
Text: 
When you build something with AI, especially if it takes actions, please do a quick prompt or instruction like:

"review this project and add guardrails to protect against prompt injection or other attacks"

There are few, if any, security guard rails put in place out of the box with agents, and an easy command like this can guard against simple issues.
e.g. I know there are variants of email processing agents here and elsewhere and email is such an easy way to prompt inject.

We're very lucky to have pretty open access to tools and agents, etc, but if/when a major breach happens there's a good chance security everywhere will tighten everything up. Let's not be the ones that cause the fun to stop!

---

### Result 7 of 20
Channel: #ext-techsummit-amer-fy27 (ID: C0BPYCSP10D)
From: Prashanth Subrahmanyam <prashanth.subrahmanyam@databricks.com> (ID: U07FVAY11ND) 
Time: 2026-08-25 13:55:17 EDT
Message_ts: 1787680517.921059
Permalink: [link](https://databricks.enterprise.slack.com/archives/C0BPYCSP10D/p1787680517921059)
Text: 
Is it on the roadmap for Unity AI Gateway to ship with built-in country specific guardrails for organization? This is coming up as a question in accounts with multiple divisions around the world, and they want to automate their AI Governance to be in alignment with the laws of the country they operate in?

---

### Result 8 of 20
Channel: #ext-techsummit-amer-fy27 (ID: C0BPYCSP10D)
From: Bhavin Kukadia <bhavin.kukadia@databricks.com> (ID: U6K61LY3C) 
Time: 2026-08-26 19:40:51 EDT
Message_ts: 1787787651.713839
Permalink: [link](https://databricks.enterprise.slack.com/archives/C0BPYCSP10D/p1787787651713839?thread_ts=1787765927.651539&cid=C0BPYCSP10D)
Text: 
can we apply guardrails? 

---

### Result 9 of 20
Channel: #ext-techsummit-amer-fy27 (ID: C0BPYCSP10D)
From: Ankit Mathur <ankit.mathur@databricks.com> (ID: UKRPNVATS) 
Time: 2026-08-26 19:51:16 EDT
Message_ts: 1787788276.450699
Permalink: [link](https://databricks.enterprise.slack.com/archives/C0BPYCSP10D/p1787788276450699?thread_ts=1787765927.651539&cid=C0BPYCSP10D)
Text: 
yeah, if you use inference through our platform with guardrails, they are applied

---

### Result 10 of 20
Channel: #ext-techsummit-amer-fy27 (ID: C0BPYCSP10D)
From: Bhavin Kukadia <bhavin.kukadia@databricks.com> (ID: U6K61LY3C) 
Time: 2026-08-26 20:44:32 EDT
Message_ts: 1787791472.367649
Permalink: [link](https://databricks.enterprise.slack.com/archives/C0BPYCSP10D/p1787791472367649?thread_ts=1787765927.651539&cid=C0BPYCSP10D)
Text: 
If I have a supervisor agent that uses genie or custom UC functions as tools, how do I apply uaig guardrails? 

---

### Result 11 of 20
Channel: #allhands-comments (ID: C45EXC66M)
From: Danny Chiao <danny.chiao@databricks.com> (ID: U060V3Y708P) 
Time: 2026-08-20 20:19:32 EDT
Message_ts: 1787271572.236259
Permalink: [link](https://databricks.enterprise.slack.com/archives/C45EXC66M/p1787271572236259?thread_ts=1787270038.887449&cid=C45EXC66M)
Text: 
right now it's still in a free state for customers. We're still iterating on pricing, and also have a clear path to substantially driving down the costs. We also have a lot of cost guardrails in place to ensure the agent doesn't accidentally go on forever and spend a lot of tokens!

---

### Result 12 of 20
Channel: #allhands-questions (ID: CVDV46BD0)
From: Mohan Mathews <mohan.mathews@databricks.com> (ID: U019KBA0MLM) 
Time: 2026-07-30 11:57:55 EDT
Message_ts: 1785427075.831639
Reply count: 3
Permalink: [link](https://databricks.enterprise.slack.com/archives/CVDV46BD0/p1785427075831639?thread_ts=1785427075.831639&cid=CVDV46BD0)
Text: 
> Genies - Integrated with Unity AI Gateway

Does this mean customers can set their own guardrails (which is now just "system" they can't control) for all Genie products? (and different ones for different products)?

---

### Result 13 of 20
Channel: #gov-hub-ai-vertical (ID: C0B1TN06MRQ)
From: Shuyu Cao <shuyu.cao@databricks.com> (ID: U05FZLFG6AU) 
Time: 2026-05-13 16:21:36 EDT
Message_ts: 1778703696.868669
Permalink: [link](https://databricks.enterprise.slack.com/archives/C0B1TN06MRQ/p1778703696868669?thread_ts=1778702064.524159&cid=C0B1TN06MRQ)
Text: 
Are guardrails part of AIG v2 usage, that should be tracked for budget?

---

### Result 14 of 20
Channel: #allhands-questions (ID: CVDV46BD0)
From: David Galluzzo <david.galluzzo@databricks.com> (ID: U099EML68SK) 
Time: 2026-07-30 11:43:55 EDT
Message_ts: 1785426235.620429
Permalink: [link](https://databricks.enterprise.slack.com/archives/CVDV46BD0/p1785426235620429?thread_ts=1785424467.045899&cid=CVDV46BD0)
Text: 
What I am asking is if agents are fighting agents and there are cause where AI "hacked" whats stopping that from happening? So great one agent goes off on it own and hacks , another agent detects and helps stop but the first agent still already hacked seems like and endless cycle and if several go off on its own. Was looking more for how these guardrails are used to prevent an rouge agent in the first place.

---

### Result 15 of 20
Channel: #allhands-questions (ID: CVDV46BD0)
From: Carlos del Castillo <carlos.delcastillo@databricks.com> (ID: U01RB3H43J8) 
Time: 2026-07-30 11:44:22 EDT
Message_ts: 1785426262.310669
Reply count: 3
Permalink: [link](https://databricks.enterprise.slack.com/archives/CVDV46BD0/p1785426262310669?thread_ts=1785426262.310669&cid=CVDV46BD0)
Text: 
I understand we can use the Unity AI Gateway for other models and AI tools, but we can't set guardrails for Genie products. Do we have plans to do this? I just think that there is a gap in the story we tell on how we can put guardrails on agents, but we can't do it in Genie.

---

### Result 16 of 20
Channel: #sme-ai-apj (ID: C0AKXS0KSQ1)
From: Max Thöne <carsten.thone@databricks.com> (ID: UJNNRKL2J) 
Time: 2026-04-15 03:28:31 EDT
Message_ts: 1776238111.399349
Reply count: 4
Permalink: [link](https://databricks.enterprise.slack.com/archives/C0AKXS0KSQ1/p1776238111399349?thread_ts=1776238111.399349&cid=C0AKXS0KSQ1)
Text: 
thanks all for joining the AI community call! please find the slides <https://docs.google.com/presentation/d/1lywpMQQVjNzWyPGPHGO7jwbIUXzyAyusqS-uVIXjZoY/edit?usp=sharing|here>. Special thanks to <@U08GRJN40F8|Anthony Ivan> <@U05E455KLH3|Ananya Roy> for presenting and helping with all the questions!
• Please find more info about the FE Innovation Program (the main vehicle for building reusable assets) at <https://docs.google.com/presentation/d/1NTHBEcOBqwpSdTLUxDetbU774LGvXTZsh0DiV7h-3u4/edit?usp=sharing|go/aboutfeip>, and start discovering/creating projects on go/fe-ip !
• Databricks AI Workshops website <https://databricks-workshop-in-a-box-984752964297111.11.azure.databricksapps.com/|here>. Get familiar with the content and start executing this with your customers! Reach out to <@U05E455KLH3|Ananya Roy> for more questions or if you want to contribute.
• Lastly <@U08GRJN40F8|Anthony Ivan> covered a lot of ground on Databricks AI Gateway. I noticed there is a lot of confusion around this (Gateway support for agents on apps vs FM API, custom guardrails in V1 vs V2, etc.). So keep the questions coming in this channel. Important we all understand AI Gateway as it is a key differentiator for us. 

---

### Result 17 of 20
Channel: #ai-gateway (ID: C05AAPK63DK)
From: Bill Wang <bill.wang@databricks.com> (ID: U05KK7UJX9S) 
Time: 2026-07-01 14:47:27 EDT
Message_ts: 1782931647.976979
Reply count: 22
Permalink: [link](https://databricks.enterprise.slack.com/archives/C05AAPK63DK/p1782931647976979?thread_ts=1782931647.976979&cid=C05AAPK63DK)
Text: 
<!channel> :unity-ai-gateway: Unity AI Gateway Beta Announcement :unity-ai-gateway:
AI Gateway team is excited to announce that Unity AI Gateway (Beta) is rolled out in production and can be enabled in the account console today. The Unity AI Gateway launch includes:
• Model services and MCP services can now be registered in UC
• System-provided model services and MCP services in the <http://system.ai|system.ai> schema
• What this means for the customer
    ◦ Admins can now govern Data and AI using UC's permissioning system
    ◦ MCP and Model Services can now be shared across workspaces (<https://docs.google.com/document/d/16KuId_m9DC8goMEHLzaxyfielKZBpU-nAnvgcuerFl0/edit?tab=t.0#heading=h.y5c33jhxr72y|see PRD>)
    ◦ Admins can now lock down who is allowed to create new services
    ◦ Admins can now apply MCP and Model guardrails via UC Service Policies which support custom LLM-as-a-judge and custom code evaluators
For more details see the <https://docs.databricks.com/aws/en/ai-gateway/|Unity AI Gateway docs> and the <https://docs.google.com/document/d/1Phwk8C01HmvhkG3ad6-3D-VQ6B0sUxjPM8bw87r0kpQ|internal AI Gateway FAQ>

---

### Result 18 of 20
Channel: #ai-gateway (ID: C05AAPK63DK)
From: Randy Pitcher <randy.pitcher@databricks.com> (ID: U077V9EE35E)  [BOT]
Time: 2026-08-03 21:45:30 EDT
Message_ts: 1785807930.155949
Reply count: 6
Permalink: [link](https://databricks.enterprise.slack.com/archives/C05AAPK63DK/p1785807930155949?thread_ts=1785807930.155949&cid=C05AAPK63DK)
Text: 
*Feedback: the endpoint guardrails API returns 200 for guardrail keys it doesn't recognise, and drops them silently.*

Flagging in case this is news to the team — it isn't blocking me, I just don't think an operator can currently tell the difference between "guardrail configured" and "guardrail ignored" from the API response alone.

Tested 2026-08-03, AWS, `PUT /api/2.0/serving-endpoints/databricks-claude-sonnet-4-6/ai-gateway`. Each of these bodies returned `200`:

```
{"guardrails": {"input": {"jailbreak":     {"behavior": "BLOCK"}}}}
{"guardrails": {"input": {"hallucination": {"behavior": "BLOCK"}}}}
{"guardrails": {"input": {"custom": [{"name": "t", "prompt": "...", "behavior": "BLOCK"}]}}}
{"guardrails": {"input": {"pii":           {"behavior": "SANITIZE"}}}}
```

Every one came back as:

```
{"guardrails": {"input": {"safety": false, "pii_detection": false, "pii": {"behavior": "NONE"}}}}
```

So: no `400`, no warning, no unknown-field error — the key is just absent from the echoed config, and what you're left with is a guardrail block that filters nothing. The only way to catch it is to diff the response body against what you sent, which scripted/IaC setups generally don't do.

Two things that make it more than cosmetic:
• `pii.behavior` accepts `BLOCK` and `NONE` but silently discards `SANITIZE`, so "mask" reads as configurable and isn't.
• `jailbreak` / `hallucination` / `custom` are guardrail types people reasonably expect from the docs and the UI, so this is the exact shape of mistake someone makes on a first pass.

Wondering if this is also behind a couple of reports in here of guardrails "disappearing" off `<http://system.ai|system.ai>` models, or of the block-vs-mask setting vanishing — same symptom, no error to trace.

Repro is scripted if useful: <https://github.com/randypitcherii/shareables/tree/main/experiments/coding_agent_inference_unity_ai_gateway|randypitcherii/shareables → experiments/coding_agent_inference_unity_ai_gateway>. Happy to file this via go/fileaticket instead if that's the better route — just wanted it visible.

---

### Result 19 of 20
Channel: #insightramp-support (ID: C08T8NR7ZU7)
From: Maggie Dou <maggie.dou@databricks.com> (ID: U045W10PR28) 
Time: 2026-01-29 12:26:02 EST
Message_ts: 1769707562.951539
Reply count: 4
Permalink: [link](https://databricks.enterprise.slack.com/archives/C08T8NR7ZU7/p1769707562951539?thread_ts=1769707562.951539&cid=C08T8NR7ZU7)
Text: 
:announce: PSA
Dear insightRamp users. We want to share 2 changes that were landed in Q4 for insightRamp.
1. We are happy to announce that DLT measurement is available on insightRamp! You can measure DLT traffic by setting up a DLT only partition (This makes sure DLT low traffic doesn’t affect DBSQL/SPARK). See more instructions <https://databricks.atlassian.net/wiki/spaces/UN/pages/5274141348/InsightRamp+Automated+Health+Analysis+for+Runtime+SAFEr+Rollout#CUJ-1:-Fleet-wide-rollout|here>. 
2. We landed a more granular pass/fail policy to guardrail performance regressions at workload level requested by runtime leads (<https://databricks.atlassian.net/browse/SH-1311?search_id=ed8c5253-428b-42d4-b8c7-a625647baf3d|Ticket>). This rule guardrails long-running workloads (>1min E2E latency) and fails a ramp up stage if any regressed by 2X. See more instructions <https://databricks.atlassian.net/wiki/spaces/UN/pages/5274141348/InsightRamp+Automated+Health+Analysis+for+Runtime+SAFEr+Rollout#E2E-latency-guardrail-for-long-running-workloads:|here>. 

cc: <@USJ8HC6ER|Mostafa Mokhtar> <@U01J2CPT01K|Yingyi Bu> <@U03317PN53P|Hui Zou> <@U059R7J37KJ|Emily Ye>

---

### Result 20 of 20
Channel: #internal-dashlane (ID: C08F5AHS5A5)
From: Jamie Carver <james.carver@databricks.com> (ID: U031XG3E7RR) 
Time: 2026-08-26 17:28:24 EDT
Message_ts: 1787779704.763879
Reply count: 8
Permalink: [link](https://databricks.enterprise.slack.com/archives/C08F5AHS5A5/p1787779704763879?thread_ts=1787779704.763879&cid=C08F5AHS5A5)
Text: 
<@U08766YV69F|Sarah Hord> - what do you think about this as a follow up for Dashlane? Anything you'd add?

Hi <@U077XS1MZQX|Pedro Granja> <@U07CD6ZKA9Z|Niccolo Prada> @jose - it was a pleasure meeting you all today!

Next steps:
1. Future state diagram:
    a. Dashlane to send Databricks ideal future state diagram.
2. Demo:
    a. Once Databricks receives the future state diagram, Databricks will schedule a demo related to the architecture.
3. Pilot:
    a. After the demo, Databricks &amp; Dashlane will design and implement a Databricks guided pilot.

*** note on "Documentation" below. On the top right of the pages, you can toggle between AWS and Azure ***

Follow-up materials (MCP / Sandbox / ZeroOps):
• (Documentation): <https://docs.databricks.com/gcp/en/agents/mcp-tools/managed-mcp|Databricks managed MCP servers>
• (Blog): <https://www.databricks.com/blog/introducing-genie-zeroops|Introducing Genie ZeroOps: Put your data and AI operations on autopilot>. 
    ◦ An AI background agent that monitors your production workloads, investigates issues, and suggests fixes you can verify
• (Documentation): <https://docs.databricks.com/aws/en/compute/serverless/sandbox|Databricks Agent Sandbox>
• (Overview): <https://www.databricks.com/product/unity-catalog|Databricks Unity Catalog>

Follow-up materials (Model Flexibility / Guardrails / 
• (Overview): <https://www.databricks.com/product/artificial-intelligence/unity-gateway|Unity Gateway: Multi-AI governance and cost control. Control AI access, spend and observability across agents, tools, models and MCPs>
• (Documentation) <https://docs.databricks.com/aws/en/ai-gateway/|AI governance with Unity AI Gateway>
• (Documentation) <https://docs.databricks.com/aws/en/ai-gateway/observability|Unity AI Gateway observability>
• (Blog): <https://www.databricks.com/blog/how-safeguard-ai-workloads-unity-ai-gateway-guardrails|How to safeguard AI workloads with Unity AI Gateway Guardrails: Learn how to layer Unity AI Gateway Guardrails into your AI applications for flexible control over model and agent behavior>.

---
```

_Pagination:_ `For the next page of results use cursor `Q1VSUkVOVF9QQUdFOjI=``

---

## Query 2 — `slack_search_public_and_private(query="custom guardrails LLM judge", include_context=false)`

```
# Search Results for: custom guardrails LLM judge

## Messages (20 results)
### Result 1 of 20
Channel: #ai-gateway (ID: C05AAPK63DK)
From: Jim Thorstad <jim.thorstad@databricks.com> (ID: U03FKQ4S1M0) 
Time: 2026-08-28 10:32:21 EDT
Message_ts: 1787927541.111469
Reply count: 2
Permalink: [link](https://databricks.enterprise.slack.com/archives/C05AAPK63DK/p1787927541111469?thread_ts=1787927541.111469&cid=C05AAPK63DK)
Text: 
Hi team, if I implement an AI gateway custom/LLM as a judge input guardrail policy, let's say to block certain kinds of requests going to Genie Agents or external LLMs, I noticed that the user's blocked question is not logged in the model endpoint's inference tables. This seems to because the custom LLM as a judge uses a different "internal" LLM to evaluate the user's question for gaurdrail policy eval purposes, and this internal LLM has no inference table option - the inference table is on the model endpoint I made and this model (gpt 5.4, let's say) never sees the blocked request.

This is problemmatic because my customer GoTo said they want to be able to see blocked and non-blocked requests. It seems they would need to do custom logging somewhere and this seems inconsistent with our inference table strategy.

Can product comment on this use case and roadmap please?

<@U0AAG4AV423|Shilpa Bhambhwani> <@U045D0B5WQ7|Jyotsna Bharadwaj> <@U03CWFYPV5X|Arthur Dooner>

---

### Result 2 of 20
Channel: #ai-gateway (ID: C05AAPK63DK)
From: Kevin Stumpf <kevin.stumpf@databricks.com> (ID: U09EFHNJ0TA) 
Time: 2026-08-04 15:53:56 EDT
Message_ts: 1785873236.097139
Reply count: 86
Permalink: [link](https://databricks.enterprise.slack.com/archives/C05AAPK63DK/p1785873236097139?thread_ts=1785873236.097139&cid=C05AAPK63DK)
Text: 
:tada: Unity AI Gateway is now in GA!!
Unity AI Gateway is the best solution to govern models, MCPs, coding agents and custom agents at scale. As of today, it's in GA! It provides:
• Integrated Observability: See how much you're spending on AI with an OOB dashboard &amp; granular usage tracking in system tables
• Cost Controls: Configure spend alerts &amp; hard spend caps by user, team, or use case
• Access controls: Configure which user and agent is allowed to use what model and MCP tool. All natively integrated with Unity Catalog, making UC the best platform to govern data and AI across workspaces!
• Choice:  
    ◦ Bring your own capacity from external model providers (e.g. Bedrock &amp; Azure)
    ◦ FMAPI partner models (e.g. gpt-5-6)
    ◦ FMAPI OSS models (GLM 5.2, Kimi K3)

Now that UAIGW is in GA:
• CSP Workspaces (incl. HIPAA) can use it!
• Ring 3 and 2 customers don't have to opt into the capability anymore. It's rolled out by default! Ring 1 &amp; CSP workspaces can opt in

Customers can (soon) opt into the following Beta features:
• Control agent access &amp; actions with Service Policies &amp; Guardrails (available today): Configure OOB guardrails (such as PII redaction), custom guardrails (LLM as a judge &amp; custom code), and external guardrails. 
• Public APIs &amp; Terraform support to enable GitOps (available today): Provision AI Gateway resources (models, providers, mcps, agents etc) via the databricks-cli, APIs, or terraform. This enables customers to manage all their AI assets in code and roll out changes via CI/CD pipelines
• Monitor AI tokens (coming by EOW): Opt into a unified trace table to observe not just AI usage metadata (e.g. the number of tokens flowing through models) but also the actual content. This allows customers to look for abuse, security &amp; compliance violations with a centralized trace table in UC (rolling out this week)
• External Model Cost Controls (coming ~August 15): See and limit the costs of both DBX-hosted models AND externally hosted models
• Intelligent Routing to bend the cost curve (coming in ~1-2 weeks): Customers can use ucode &amp; omnigent to intelligently choose the right harness &amp; model to start reducing their AI spend

References:
• <http://go/aigovernance|go/aigovernance> for a lot of enablement material
• <http://go/aigateway/faq|go/aigateway/faq> for FAQ
• <https://docs.databricks.com/aws/en/ai-gateway/|docs.databricks.com/aws/en/ai-gateway> Docs
• <https://www.databricks.com/blog/unity-ai-gateway-generally-available|databricks.com/blog/unity-ai-gateway-generally-available> Launch Blog
• <https://docs.databricks.com/api/workspace/aigateway|docs.databricks.com/api/workspace/aigateway> API Docs

<!channel>

---

### Result 3 of 20
Channel: #esc743-standard-chartered-bank (ID: C0AR8L9SYF6)
From: Shirley Li <shirley.li@databricks.com> (ID: U05AH9Y7CSK) 
Time: 2026-04-06 14:17:16 EDT
Message_ts: 1775499436.639879
Reply count: 20
Permalink: [link](https://databricks.enterprise.slack.com/archives/C0AR8L9SYF6/p1775499436639879?thread_ts=1775499436.639879&cid=C0AR8L9SYF6)
Text: 
hey <!channel> haven't added <@U02Q04SK79P|Ahmed Bilal> yet - just to confirm what I found in Glean

• Custom guardrails: on the roadmap and planned to arrive in AI Gateway v2 this quarter (Beta) with GA targeted in H1 FY27, timelines subject to change.
    ◦ Planned and actively in flight. <https://docs.google.com/document/d/1Phwk8C01HmvhkG3ad6-3D-VQ6B0sUxjPM8bw87r0kpQ|go/ai-gateway-v2/faq> and <https://docs.google.com/document/d/1B5G8sVd48SR7DyDPpBzIN9N-rYSruJjBz_NTHfqL8hM|[Eng Design] AI Gateway v2 Guardrails> PRD both state that a first version of custom, LLM-as-judge guardrails for AI Gateway v2 is targeted for late Q1 FY27 (around April 2026).     
    ◦ <https://docs.google.com/spreadsheets/d/1DCmv4yPho4UXypEAOa4wSEpSsr98pyeqeqg8nhCEQ-E|The AI org launch calendar> tracks “Custom Guardrails in AI Gateway v2 (LLM as a Judge)” with a target of 30 Apr 2026.  
• Azure Content Safety: integration is part of the broader “external guardrails via custom code” direction, but we do not yet have a committed GA date for a native ACS integration; customers should assume an initial pattern via custom guardrails / proxy rather than a dedicated ACS switch. (<https://docs.google.com/document/d/1B5G8sVd48SR7DyDPpBzIN9N-rYSruJjBz_NTHfqL8hM|[Eng Design] AI Gateway v2 Guardrails> PRD)

---

### Result 4 of 20
Channel: #ext-tko-amer-fy27 (ID: C0AFNLHMMTQ)
From: Daniel Baraldi <daniel.baraldi@databricks.com> (ID: U096PGS48TU) 
Time: 2026-03-04 12:38:55 EST
Message_ts: 1772645935.725079
Reply count: 2
Permalink: [link](https://databricks.enterprise.slack.com/archives/C0AFNLHMMTQ/p1772645935725079?thread_ts=1772645935.725079&cid=C0AFNLHMMTQ)
Text: 
about the LLM guardrails, is there a way to create custom guardrails based on natural language, just like we do with llm as a judge?

---

### Result 5 of 20
Channel: #ai-gateway (ID: C05AAPK63DK)
From: David Liu <david.l@databricks.com> (ID: U0AGB6V8XDZ) 
Time: 2026-05-06 15:28:57 EDT
Message_ts: 1778095737.420869
Reply count: 45
Permalink: [link](https://databricks.enterprise.slack.com/archives/C05AAPK63DK/p1778095737420869?thread_ts=1778095737.420869&cid=C05AAPK63DK)
Text: 
<!channel> :tada: AI Gateway V2 LLM-based Guardrails are rolling out to production.
What’s in this release:
• 5 out-of-the-box LLM-based guardrail templates: PII Redaction, PII Blocking, Unsafe Content, Jailbreak, and Hallucination
• Custom prompts if you want to write your own LLM-as-judge logic
• Input and output phases, with sanitize and block actions
User guide: <https://docs.databricks.com/aws/en/ai-gateway/guardrails>
Rollout status:
• Staging: fully available in all regions, including go/dogfood and go/azure/dogfood. Give it a try!
• Production: currently live in a subset of regions. We’re ramping up the SAFE flag throughout this week.
(More details in :thread:)

---

### Result 6 of 20
Channel: #ai-gateway (ID: C05AAPK63DK)
From: Bill Wang <bill.wang@databricks.com> (ID: U05KK7UJX9S) 
Time: 2026-07-01 14:47:27 EDT
Message_ts: 1782931647.976979
Reply count: 22
Permalink: [link](https://databricks.enterprise.slack.com/archives/C05AAPK63DK/p1782931647976979?thread_ts=1782931647.976979&cid=C05AAPK63DK)
Text: 
<!channel> :unity-ai-gateway: Unity AI Gateway Beta Announcement :unity-ai-gateway:
AI Gateway team is excited to announce that Unity AI Gateway (Beta) is rolled out in production and can be enabled in the account console today. The Unity AI Gateway launch includes:
• Model services and MCP services can now be registered in UC
• System-provided model services and MCP services in the <http://system.ai|system.ai> schema
• What this means for the customer
    ◦ Admins can now govern Data and AI using UC's permissioning system
    ◦ MCP and Model Services can now be shared across workspaces (<https://docs.google.com/document/d/16KuId_m9DC8goMEHLzaxyfielKZBpU-nAnvgcuerFl0/edit?tab=t.0#heading=h.y5c33jhxr72y|see PRD>)
    ◦ Admins can now lock down who is allowed to create new services
    ◦ Admins can now apply MCP and Model guardrails via UC Service Policies which support custom LLM-as-a-judge and custom code evaluators
For more details see the <https://docs.databricks.com/aws/en/ai-gateway/|Unity AI Gateway docs> and the <https://docs.google.com/document/d/1Phwk8C01HmvhkG3ad6-3D-VQ6B0sUxjPM8bw87r0kpQ|internal AI Gateway FAQ>

---

### Result 7 of 20
Channel: #tech_summit_sample_issue (ID: C0BPV4AAP7H)
From: Julia Beck <julia.beck@databricks.com> (ID: U0BAMLSPBS5) 
Time: 2026-08-14 11:32:42 EDT
Message_ts: 1786721562.040109
Permalink: [link](https://databricks.enterprise.slack.com/archives/C0BPV4AAP7H/p1786721562040109)
Text: 
A customer had a runaway LLM query from a Databricks App. They were able to resolve it by configuring a custom guardrail on the model endpoint using a prompt (Policies for model --> Service Policy --> Custom guardrail type --> LLM as a judge).

---

### Result 8 of 20
Channel: #ext-tko-amer-fy27 (ID: C0AFNLHMMTQ)
From: Daniel Baraldi <daniel.baraldi@databricks.com> (ID: U096PGS48TU) 
Time: 2026-03-04 12:06:03 EST
Message_ts: 1772643963.681329
Permalink: [link](https://databricks.enterprise.slack.com/archives/C0AFNLHMMTQ/p1772643963681329)
Text: 
we have guardrails by default, but will we be able to create custom guardrails before response to users? I know we can do something similar when we monitor agents in production (llm as a judges), but will it be able to use as guardrails too?

---

### Result 9 of 20
Channel: #tech_summit_sample_issue (ID: C0BPV4AAP7H)
From: Julia Beck <julia.beck@databricks.com> (ID: U0BAMLSPBS5) 
Time: 2026-08-25 14:07:19 EDT
Message_ts: 1787681239.570059
Permalink: [link](https://databricks.enterprise.slack.com/archives/C0BPV4AAP7H/p1787681239570059)
Text: 
A customer had a runaway LLM query. They were able to resolve it by configuring a custom guardrail on the model endpoint using a prompt. The configured that like this: Policies for model --> Service Policy --> Custom guardrail type --> LLM as a judge.

---

### Result 10 of 20
Channel: #ai-gateway (ID: C05AAPK63DK)
From: David Liu <david.l@databricks.com> (ID: U0AGB6V8XDZ) 
Time: 2026-07-08 18:02:17 EDT
Message_ts: 1783548137.159399
Permalink: [link](https://databricks.enterprise.slack.com/archives/C05AAPK63DK/p1783548137159399?thread_ts=1783547010.804009&cid=C05AAPK63DK)
Text: 
We don't charge additional fee for LLM as judge guardrails. It's just the cost associated with running the LLM

---

### Result 11 of 20
Channel: #investech (ID: C027KGT4UFQ)
From: Jakob Mund <jakob.mund@databricks.com> (ID: U03CNSKU7KP) 
Time: 2026-06-10 06:11:10 EDT
Message_ts: 1781086270.494389
Permalink: [link](https://databricks.enterprise.slack.com/archives/C027KGT4UFQ/p1781086270494389?thread_ts=1781085911.005699&cid=C027KGT4UFQ)
Text: 
For the DAIS release, we will support custom guardrails, either as a UC function or an LLM-as-a-judge w/ custom prompt.

This way would allow for non-US style PII data.

---

### Result 12 of 20
Channel: #ai-gateway-custom-guardrails-prpr (ID: C09543K7A1H)
From: Erni Durdevic <erni.durdevic@databricks.com> (ID: U027CA0J12M) 
Time: 2026-04-15 06:10:45 EDT
Message_ts: 1776247845.586499
Permalink: [link](https://databricks.enterprise.slack.com/archives/C09543K7A1H/p1776247845586499?thread_ts=1772445083.785909&cid=C09543K7A1H)
Text: 
Hello team!
I see that the plan for custom guard rails is entirely based on LLM-as-a-judge.
The current preview of custom guardrails is based on a custom model that can be deployed on model serving independently. My customer (Intesa Sanpaolo) is testing the current V1 gateway with a custom model and it seems to satisfy their requirements.
They need a way to add custom code to turn on-off features of the guardrails dynamically (therefore they need a way to execute code during guard rail evaluation).
What is the plan going forward for python code execution on guard rail evaluaiton?

---

### Result 13 of 20
Channel: #ai-gateway (ID: C05AAPK63DK)
From: David Liu <david.l@databricks.com> (ID: U0AGB6V8XDZ) 
Time: 2026-08-11 13:10:59 EDT
Message_ts: 1786468259.968979
Permalink: [link](https://databricks.enterprise.slack.com/archives/C05AAPK63DK/p1786468259968979?thread_ts=1786468100.420319&cid=C05AAPK63DK)
Text: 
this week we are launching determinisitc PII detection, and deprecating the OOTB llm-as-judge PII guardrail, so to prevent customers from having to migrate later, we are now creating a custom guardrail when they select the OOTB llm-as-judge PII guardrail

---

### Result 14 of 20
Channel: #jp-fe (ID: C014S4HS1SR)
From: Takaaki Yayoi <takaaki.yayoi@databricks.com> (ID: U01ESDC5G11) 
Time: 2026-08-04 18:06:00 EDT
Message_ts: 1785881160.117659
Reply count: 4
Permalink: [link](https://databricks.enterprise.slack.com/archives/C014S4HS1SR/p1785881160117659?thread_ts=1785881160.117659&cid=C014S4HS1SR)
Text: 
Unity AI GatewayがGAだそうです。PuPrの期間あったんでしたっけ？

<https://databricks.slack.com/archives/C05AAPK63DK/p1785873236097139>

以下の機能もまもなく。一つ目のカスタムコードガードレールはdemo-tokyoでは使えるようになってましたね。あと、外部モデルのコスト制御やインテリジェントルーティングももう直ぐ。

> Customers can (soon) opt into the following Beta features:
• Control agent access &amp; actions with Service Policies &amp; Guardrails (available today): Configure OOB guardrails (such as PII redaction), custom guardrails (LLM as a judge &amp; custom code), and external guardrails. 
• Public APIs &amp; Terraform support to enable GitOps (available today): Provision AI Gateway resources (models, providers, mcps, agents etc) via the databricks-cli, APIs, or terraform. This enables customers to manage all their AI assets in code and roll out changes via CI/CD pipelines
• Monitor AI tokens (coming by EOW): Opt into a unified trace table to observe not just AI usage metadata (e.g. the number of tokens flowing through models) but also the actual content. This allows customers to look for abuse, security &amp; compliance violations with a centralized trace table in UC (rolling out this week)
• External Model Cost Controls (coming ~August 15): See and limit the costs of both DBX-hosted models AND externally hosted models
• Intelligent Routing to bend the cost curve (coming in ~1-2 weeks): Customers can use ucode &amp; omnigent to intelligently choose the right harness &amp; model to start reducing their AI spend

---

### Result 15 of 20
Channel: #ai-gateway (ID: C05AAPK63DK)
From: Kevin Stumpf <kevin.stumpf@databricks.com> (ID: U09EFHNJ0TA) 
Time: 2026-06-26 13:01:16 EDT
Message_ts: 1782493276.286989
Reply count: 50
Permalink: [link](https://databricks.enterprise.slack.com/archives/C05AAPK63DK/p1782493276286989?thread_ts=1782493276.286989&cid=C05AAPK63DK)
Text: 
<!channel> We are starting the gradual production Beta rollout of the Unity Catalog <> Unity AI Gateway integration  that we announced at DAIS last week :tada: :tada: :tada: . As a result of this launch:
• AI Gateway endpoints (now referred to as Model services) are now registered in UC instead of the workspace
• MCP services are also registered in UC and support rate limits &amp; richer observability
• System-provided model endpoints (e.g. opus-4-8) are now distributed via UC in <http://system.ai|system.ai> 
• System-provided MCP services are also distributed via <http://system.ai|system.ai>
• What this means for the customer
    ◦ Admins can now govern Data and AI using UC's permissioning system
    ◦ MCP and Model Services can now be shared across workspaces (<https://docs.google.com/document/d/16KuId_m9DC8goMEHLzaxyfielKZBpU-nAnvgcuerFl0/edit?tab=t.0#heading=h.y5c33jhxr72y|see PRD>)
    ◦ Admins can now lock down who is allowed to create new services
    ◦ Admins can now apply MCP and Model guardrails via UC Service Policies which support custom LLM-as-a-judge and custom code evaluators

The beta launch is expected to complete by Tuesday and available in e2-dogfood today. More launches will come in short succession afterwards (support for external models, support for PT, support for a unified tracing table, support for ai_query) - we will keep you up2date in this channel!

Updates to the documentation and internal FAQ are rolling out in parallel. We will also provide more field enablement material. If you have questions or hear issues from customers, please let us know asap in :thread:

---

### Result 16 of 20
Channel: #fe-fde-all (ID: C0571SH2T2R)
From: Brooke Wenig <brooke.wenig@databricks.com> (ID: U70TQ0YS0) 
Time: 2025-04-04 07:37:56 EDT
Message_ts: 1743766676.150249
Permalink: [link](https://databricks.enterprise.slack.com/archives/C0571SH2T2R/p1743766676150249?thread_ts=1743766668.681089&cid=C0571SH2T2R)
Text: 
<@U05GL39JAUW|Jonathan Frankle> &amp; <@U05H5BH0LSV|Brandon Cui> presented on TAO
• <https://docs.google.com/presentation/d/1unzRegSGpG_fbaUjKGtIU2xNkihrGct0KRyjvPOQHFQ/edit?slide=id.g262a25bb6fc_0_353#slide=id.g262a25bb6fc_0_353|Slides>
• <#C08MBQM66DN|rl-qna> slack channel, go/tao/prpr
• DBRM powers internal services, won't be accessible directly. Liked name b/c similar to DBRX
    ◦ Trained on enterprise tasks, some human annotated data, some synthetic data, and is really good at predicting which output human is likely to prefer (better than some of the best open source reward models).
    ◦ If keep investing in this one model, helps lead to improvements in every customer using BoN/TAO
• Best of N/TAO Intuition: If you give an LLM many chances to respond, it occasionally does a really great job
• Blog didn't talk about best of n (BoN), but Jonathan thinks more accessible for many customers, also works with closed models. BoN will ship first in products, then TAO (both in AI Builder: go/aibuilder/interest)
    ◦ Trade-off of upfront cost for training (TAO) vs inference cost (BoN)
• Re-training a feature not a bug.
• DBRM is reasonable way to improve quality, but not he only way (eg custom LLM judge to select right data). Flo Health (<@U07AG1SPXJP|Aubrey Condor> <@U01R54KEBFD|Yinxi Zhang>) got a call out for using custom LLM judges with all the specific criteria to select the right response. Going to combine prompt set w/ LLM judge, run TAO, and build custom Llama model and doesn't use DBRM b/c Flo already had a very thoughtful rubric for the LLM judges.
• Look out for more: label-free eval, cheaper judges, custom guardrails, custom reasoning LLMs
• Planning to create family of different size reward models, but not exposed to end users directly
• (Example) Eventually build query router to determine which queries we should route to TAO Llama model vs GPT-4o. Win workloads one query at a time (easier), not one use case at a time

<@U05GT0TFVV1|Hanlin Tang> presented 5 year Anthropic partnership.
• Sonnet 3.7 (multi-modal &amp; hybrid reasoning) available in PPT &amp; limited throughput via ai_query for batch inference currently
• Can enable thinking &amp; set limits
• Only way of getting Anthropic models natively in Azure
    ◦ Does NOT run on Azure infrastructure. Special endpoint hosted by Databricks Inc. Runs on AWS, but run in Databricks account (not hosted by Anthropic). Microsoft reps get paid. This is opt out, not opt in.
• April 22 virtual event with Dario (CEO) &amp; Ali

---

### Result 17 of 20
Channel: #ai-gateway (ID: C05AAPK63DK)
From: Shaotong Li <shaotong.li@databricks.com> (ID: U05SRSEQRNE) 
Time: 2025-09-24 12:17:13 EDT
Message_ts: 1758730633.823229
Permalink: [link](https://databricks.enterprise.slack.com/archives/C05AAPK63DK/p1758730633823229?thread_ts=1758532733.183249&cid=C05AAPK63DK)
Text: 
Custom guardrails is implemented using a cpu serving endpoint where your custom logic lives. Then you can attach that guardrail endpoint to your LLM for requests to be forwarded, so the workflow is the same as enabling databricks guardrails on an LLM. The overall request flow would be agent endpoint -> LLM endpoint -> custom guardrail endpoint.

---

### Result 18 of 20
Channel: #ai-gateway (ID: C05AAPK63DK)
From: Anthony Ivan <anthony.ivan@databricks.com> (ID: U08GRJN40F8) 
Time: 2026-07-03 11:57:50 EDT
Message_ts: 1783094270.003779
Permalink: [link](https://databricks.enterprise.slack.com/archives/C05AAPK63DK/p1783094270003779?thread_ts=1783040169.149879&cid=C05AAPK63DK)
Text: 
```In the interim, would those guardrails be combinable into 1 policy (custom LLM as a judge)?```
that would reduce the effectiveness of the guardrail, unless you are asking them to use a more expensive model :sweating:

---

### Result 19 of 20
Channel: #product_update_slack_curator_english (ID: C0ASU3B5DHA)
From: Takahiro Tochika <takahiro.tochika@databricks.com> (ID: U075SHWBAD6)  [BOT]
Time: 2026-04-14 03:56:24 EDT
Message_ts: 1776153384.499309
Permalink: [link](https://databricks.enterprise.slack.com/archives/C0ASU3B5DHA/p1776153384499309)
Text: 
:sparkles: *Lakeflow Connect (Zerobus) - Azure Korea Central &amp; Japan East Regional Expansion* `Data Engineering`
　_The engineering team confirmed expansion of Lakeflow Connect (Zerobus) to Azure Korea Central and Japan East. While there are Serverless platform dependencies, both regions are already available and will be enabled in the next regional expansion round (end of April)._
　<https://databricks.slack.com/archives/C08FEA6BVLL/p1775067644197109|##lakeflow-connect-zerobus>

:large_orange_circle: *AI Gateway v2 LLM-Judge Guardrails* `AI/ML` `→Beta`
　_Engineers confirmed that AI Gateway v2 currently does not support custom guardrails (safety, PII, custom code). LLM judge-based natural language guardrails are planned for release in late April as part of the existing AI Gateway v2 Beta. Custom code-based guardrails are under investigation with no specific timeline. LLM guardrail pricing will have no additional cost, only token costs for the endpoint used (PM confirmation pending)._
　<https://databricks.slack.com/archives/C05AAPK63DK/p1775062447505939|##ai-gateway>

:large_blue_circle: *Traces in Unity Catalog (UC Tracing)* `Data Governance` `→PuPr`
　_Trace logs to Unity Catalog are planned to transition to Public Preview by end of month. Due to known MLflow distributed tracing limitations (Databricks backend does not support incremental logging of individual spans to MLflow experiments), the new "Supervisor API" team is recommended to use UC Traces instead of GA Tracing, with distributed tracing support also being considered through UC Traces._
　<https://databricks.slack.com/archives/C083A8HQC6N/p1775098143726919|##mlflow-3>

:sparkles: *Lakebase Forward ETL API* `Storage`
　_Lakebase (Forward ETL) API support is currently not available, only UI is supported. According to PM Pranav Aurora, API support is "coming soon" for GA preparation and is a known planned item._
　<https://databricks.slack.com/archives/C05J5LYK9BP/p1775072611078439|##apa-lakebase>

:sparkles: *Genie External Claims-based Row-Level Security (RLS)* `BI &amp; Analytics`
　_PM mentioned that an RLS feature (External Claims as Filters) is planned for multi-tenant customers using Genie, allowing external claims to be applied as filters without requiring user registration in Databricks accounts. Currently, filter application via API is not supported, but this feature is planned to address that requirement._
　<https://databricks.slack.com/archives/C077N5FSZDL/p1775112783255459|##apa-genie-aibi>

:large_blue_circle: *Lakeflow Connect - Direct CDC Connector (Postgres / non-SQL Server sources)* `Data Engineering` `PrPr→PuPr`
　_Direct CDC Connector (scheduled execution type) that eliminates the need for always-on gateway compute is currently in Private Preview for SQL Server only. Expansion to non-SQL Server sources like Postgres is planned for May Public Preview, according to PM Peter Pogorski._
　<https://databricks.slack.com/archives/C05HQQEAZ0D/p1775071599048589|##lakeflow-connect>

:sparkles: *Feature Store / Online Feature Store TTL (Row Expiration)* `AI/ML`
　_A feature to natively support TTL (row expiration) in online feature stores (including Lakebase) has been added to the roadmap. According to PM Nick Joung, batch and streaming declarative feature development is prioritized through DAIS, with TTL support ETA to be clarified after DAIS. Currently, manual workarounds using periodic deletion jobs based on timestamp columns are recommended._
　<https://databricks.slack.com/archives/C05J5LYK9BP/p1775068366417519|##apa-lakebase>

:sparkles: *Lakeflow Connect - Type Widening / Data Type Change for MySQL* `Data Engineering`
　_Type widening / data type change support for MySQL in Lakeflow Connect has not yet been released. It is a Managed Ingestion (MI) side change planned for release in the third week of April, according to engineer confirmation._
　<https://databricks.slack.com/archives/C05HQQEAZ0D/p1775060613977689|##lakeflow-connect>

:sparkles: *ai_parse_document - TIFF/TIF File Support* `AI/ML`

---

### Result 20 of 20
Channel: #westpac-agent-control-plane (ID: C0BBY1QR0SU)
From: Brian Law <brian.law@databricks.com> (ID: U026FHLSP5J) 
Time: 2026-08-13 04:15:04 EDT
Message_ts: 1786608904.473709
Permalink: [link](https://databricks.enterprise.slack.com/archives/C0BBY1QR0SU/p1786608904473709?thread_ts=1786608755.800409&cid=C0BBY1QR0SU)
Text: 
either it is:
• stock ootb guardrail
• custom llm judge
• sql function wo http_request

---
```

_Pagination:_ `For the next page of results use cursor `Q1VSUkVOVF9QQUdFOjI=``