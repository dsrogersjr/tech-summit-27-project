```json
[
  {
    "name": "Sentinel — Improper-Payment Prevention",
    "story": "Cross-agency fraud-match, beneficiary/eligibility, payment-queue and death/income-record sources land in a governed lakehouse via Lakeflow + Genie Code; a metric view + gold queue power an AI/BI dashboard, a Genie Agent, and a Databricks App (on Lakebase) where a program-integrity examiner sees each flagged pre-disbursement payment, gets a prescribed disposition, and approves before funds move — all reached through Genie One, with every AI call bounded + audited by the Unity AI Gateway.",
    "columns": [
      "sources",
      "pipeline",
      "compute",
      "work",
      "entry"
    ],
    "nodes": [
      {
        "id": "app",
        "type": "databricks-apps-work",
        "col": "work",
        "row": 3,
        "label": "Payment Integrity App",
        "desc": "Examiner console: see → assist → act",
        "ai_reasoning": "the primary surface — live queue on Lakebase, assistant investigates + prescribes, examiner approves → write-back"
      },
      {
        "id": "dashboard",
        "type": "ai-bi-dashboard",
        "col": "work",
        "row": 1,
        "ai_reasoning": "Sentinel Payment Integrity dashboard — KPI tiles + queue, reads the metric view over the lakehouse"
      },
      {
        "id": "data",
        "type": "lakeflow-genie-block",
        "col": "pipeline",
        "params": {
          "bronze_desc": "Raw beneficiaries, claims, payments, flags",
          "silver_desc": "Flagged payments + case outcomes",
          "gold_desc": "Open queue + prescribed disposition"
        },
        "ai_reasoning": "one data-layer block: Lakeflow ingest + bronze→silver→gold, built/maintained by Genie Code. Contains SDP + Genie Code so no separate tiles."
      },
      {
        "id": "db-platform",
        "type": "db-platform",
        "pin": {
          "at": "top-left",
          "to": "platform-box"
        }
      },
      {
        "id": "genie",
        "type": "genie",
        "col": "work",
        "row": 2,
        "ai_reasoning": "Sentinel Payment Integrity Genie space — NL investigation of a flagged payment over the governed lakehouse"
      },
      {
        "id": "genie-one",
        "type": "genie-one",
        "col": "entry",
        "rot": 90,
        "ai_reasoning": "business-user front door for Della (Deputy Commissioner); fronts the dashboard, Genie, and app; persona built in; edges auto-arrow"
      },
      {
        "id": "governance",
        "type": "governance-block",
        "pin": {
          "at": "top",
          "to": "platform-box"
        },
        "ai_reasoning": "spans the platform: Unity Catalog access/lineage/audit + Unity AI Gateway (bounded ~$500K/yr, per-program-attributable, audit-ready for IG/GAO) + Genie Ontology. One AI-gateway edge to the app makes the bounded-AI story visible."
      },
      {
        "id": "lakebase",
        "type": "lakebase",
        "col": "compute",
        "row": 3,
        "desc": "Synced payment queue + writable case actions",
        "ai_reasoning": "read-only gold mirror synced from the pipeline for sub-ms per-payment reads, plus the app's writable case_actions table"
      },
      {
        "id": "lakehouse",
        "type": "sql-lakehouse",
        "col": "compute",
        "row": 1,
        "ai_reasoning": "governed serving copy of the gold tables + mv_payment_risk; the dashboard + Genie read from here"
      },
      {
        "id": "note-audit",
        "type": "note",
        "text": "Every recommendation — signals, ranked options, approving examiner, memo — is logged for the Inspector General and GAO.",
        "below": "app",
        "gap": 32
      },
      {
        "id": "note-prevention",
        "type": "note",
        "text": "Prevention, not pay-and-chase: the disposition (release / hold / investigate) is prescribed BEFORE funds disburse. Each point of improper-payment rate prevented ≈ ~$600M/yr.",
        "below": "data",
        "gap": 36
      },
      {
        "id": "platform-box",
        "type": "box",
        "title": "Databricks Data + AI Platform",
        "titleIcon": "file:vendor/databricks",
        "wraps": [
          "src-beneficiary",
          "src-fraudfeed",
          "src-payments",
          "src-records",
          "data",
          "lakehouse",
          "lakebase",
          "dashboard",
          "genie",
          "app",
          "genie-one"
        ]
      },
      {
        "id": "src-beneficiary",
        "type": "source",
        "col": "sources",
        "row": 1,
        "label": "Beneficiary & eligibility DB",
        "icon": "file:vendor/postgresql",
        "desc": "Enrollment, program, income on file",
        "caption": "right"
      },
      {
        "id": "src-fraudfeed",
        "type": "source",
        "col": "sources",
        "row": 2,
        "label": "Cross-agency fraud-match feed",
        "icon": "text",
        "desc": "SSA / USCIS flags, duplicate identity",
        "caption": "right"
      },
      {
        "id": "src-payments",
        "type": "source",
        "col": "sources",
        "row": 3,
        "label": "Pre-disbursement payment events",
        "icon": "inputData",
        "desc": "The live payment queue",
        "caption": "right"
      },
      {
        "id": "src-records",
        "type": "source",
        "col": "sources",
        "row": 4,
        "label": "Death & third-party income records",
        "icon": "pdfLogo",
        "desc": "Deceased-payee + IRS/employer income",
        "caption": "right"
      }
    ],
    "edges": [
      {
        "id": "e-app-lb",
        "from": "lakebase",
        "to": "app",
        "flow": true,
        "label": "Read queue · write case action"
      },
      {
        "id": "e-ben",
        "from": "src-beneficiary",
        "to": "data@in-lakeflow-connect",
        "flow": true
      },
      {
        "id": "e-dash",
        "from": "lakehouse",
        "to": "dashboard",
        "flow": true
      },
      {
        "id": "e-fraud",
        "from": "src-fraudfeed",
        "to": "data@in-lakeflow-connect",
        "flow": true,
        "label": "The wave: +signals ~3w ago"
      },
      {
        "id": "e-g1-app",
        "from": "genie-one",
        "to": "app"
      },
      {
        "id": "e-g1-dash",
        "from": "genie-one",
        "to": "dashboard"
      },
      {
        "id": "e-g1-genie",
        "from": "genie-one",
        "to": "genie"
      },
      {
        "id": "e-genie",
        "from": "lakehouse",
        "to": "genie",
        "flow": true
      },
      {
        "id": "e-gov-app",
        "from": "governance@ai-gateway-b",
        "to": "app",
        "label": "AI calls bounded + audited"
      },
      {
        "id": "e-lb",
        "from": "data",
        "to": "lakebase",
        "flow": true,
        "label": "Sync gold queue"
      },
      {
        "id": "e-lh",
        "from": "data",
        "to": "lakehouse",
        "flow": true
      },
      {
        "id": "e-pay",
        "from": "src-payments",
        "to": "data@in-zerobus",
        "flow": true
      },
      {
        "id": "e-rec",
        "from": "src-records",
        "to": "data@in-direct",
        "flow": true
      }
    ]
  }
]
```
