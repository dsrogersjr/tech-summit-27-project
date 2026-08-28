// Set up in-Lakebase semantic search for case reasoning and federal benefits
// verification playbooks (pgvector). The `search_cases` and `search_playbook`
// agent tools retrieve from these indexes in the operational store.
//
// Idempotent: enables vector, creates/seeds app.reference_playbooks, adds the
// disposition embedding column, embeds only new/changed content via
// databricks-gte-large-en, and creates both HNSW cosine indexes.
//
// Run (production branch):
//   DATABRICKS_CONFIG_PROFILE=fe-sandbox-tech-summit-27-doug \
//   DATABRICKS_HOST=https://fe-sandbox-tech-summit-27-doug.cloud.databricks.com \
//   DATABRICKS_WAREHOUSE_ID=030fbcc970a7476a \
//   PGHOST=<endpoint-host> PGDATABASE=sentenel_tech_summit_27 PGPORT=5432 PGSSLMODE=require \
//   LAKEBASE_ENDPOINT=projects/sentenel-tech-summit-27/branches/production/endpoints/primary \
//   LAKEBASE_BRANCH=projects/sentenel-tech-summit-27/branches/production \
//   LAKEBASE_DATABASE=projects/sentenel-tech-summit-27/branches/production/databases/db-sentenel-tech-summit-27 \
//   npx --no-install tsx scripts/setup_lakebase_search.ts
import type { Request } from 'express';
import { createApp, server, lakebase, analytics } from '@databricks/appkit';
import { embedText } from '../server/agent/tools/embed.js';

type PlaybookSeed = {
  guideId: string;
  title: string;
  agency: string;
  program: string;
  scenario: string;
  summary: string;
  verificationSteps: string[];
  requiredDocuments: string[];
  holdGuidance: string;
  authorityCitation: string;
  sourceUrl: string;
};

const PLAYBOOKS: PlaybookSeed[] = [
  {
    guideId: 'acf-tanf-income-identity',
    title: 'TANF Income and Identity Verification',
    agency: 'HHS Administration for Children and Families',
    program: 'TANF',
    scenario:
      'Income mismatch, duplicate identity, or cross-agency fraud signal',
    summary:
      'Resolve identity and income discrepancies using authoritative sources before changing eligibility or releasing a flagged payment.',
    verificationSteps: [
      'Confirm the individual and case identifiers against the state eligibility record.',
      'Reconcile reported income with available wage, unemployment, and benefit-match data.',
      'Contact the participant for discrepancy resolution under the state verification plan.',
      'Document the evidence, response deadline, and eligibility determination in the case record.',
    ],
    requiredDocuments: [
      'Government-issued identity evidence or approved electronic identity proof',
      'Recent wage statements or employer verification',
      'Current eligibility application and discrepancy notice',
    ],
    holdGuidance:
      'Use the shortest state-authorized pre-disbursement review window; provide required notice and do not treat an unresolved automated match as a final adverse determination.',
    authorityCitation: '42 U.S.C. § 602(a); 45 C.F.R. Parts 205 and 206',
    sourceUrl: 'https://www.acf.hhs.gov/ofa/programs/tanf',
  },
  {
    guideId: 'fns-snap-duplicate-income',
    title: 'SNAP Duplicate Participation and Income Verification',
    agency: 'USDA Food and Nutrition Service',
    program: 'SNAP',
    scenario:
      'Duplicate participation, deceased-person match, or income inconsistency',
    summary:
      'Validate data-match findings and obtain documentary or collateral verification consistent with SNAP verification and notice requirements.',
    verificationSteps: [
      'Validate the match against the household case record and source-system identifiers.',
      'Check duplicate participation through available interstate and state matching processes.',
      'Request documentary or collateral verification only for the unresolved discrepancy.',
      'Record the verification source and provide required notice before adverse action.',
    ],
    requiredDocuments: [
      'Household application and certification record',
      'Income verification or employer statement',
      'Identity and residency evidence relevant to the discrepancy',
    ],
    holdGuidance:
      'Do not deny solely on an unverified match. Apply state processing and notice timelines and preserve expedited-service protections where applicable.',
    authorityCitation: '7 C.F.R. §§ 272.13, 273.2(f), and 273.12',
    sourceUrl: 'https://www.fns.usda.gov/snap/recipient/eligibility',
  },
  {
    guideId: 'cms-medicaid-eligibility',
    title: 'Medicaid Eligibility Discrepancy Verification',
    agency: 'Centers for Medicare & Medicaid Services',
    program: 'Medicaid',
    scenario:
      'Income, identity, citizenship, residency, or death-data discrepancy',
    summary:
      'Use trusted electronic data first, request information only when needed, and provide a reasonable opportunity to resolve inconsistent eligibility information.',
    verificationSteps: [
      'Compare the discrepancy with the current application and electronic data sources.',
      'Confirm identity and the data source before attributing the match to the beneficiary.',
      'Request only information needed to resolve information that cannot be verified electronically.',
      'Provide reasonable opportunity and applicable advance notice before termination or denial.',
    ],
    requiredDocuments: [
      'Eligibility application or renewal record',
      'Income or residency evidence for the unresolved element',
      'Identity or citizenship evidence when electronic verification is unsuccessful',
    ],
    holdGuidance:
      'Maintain benefits and follow reasonable-opportunity and notice rules where required; an automated discrepancy is investigative evidence, not a final eligibility decision.',
    authorityCitation: '42 C.F.R. §§ 435.945–435.956 and 435.911',
    sourceUrl:
      'https://www.medicaid.gov/medicaid/eligibility/eligibility-enrollment-systems/index.html',
  },
  {
    guideId: 'eta-ui-identity-fraud',
    title: 'Unemployment Insurance Identity Fraud Verification',
    agency: 'U.S. Department of Labor Employment and Training Administration',
    program: 'Unemployment Insurance',
    scenario:
      'Stolen identity, multi-state claim, deceased claimant, or suspicious payment change',
    summary:
      'Pause only the suspicious payment activity while promptly validating claimant identity through layered evidence and preserving due-process protections.',
    verificationSteps: [
      'Confirm the claim and payment-change event against the state UI system of record.',
      'Use layered identity verification and authoritative cross-match results.',
      'Contact the claimant through a previously verified channel when possible.',
      'Document the determination, claimant response, and appeal or adjudication path.',
    ],
    requiredDocuments: [
      'Identity evidence accepted by the state workforce agency',
      'Claimant contact and account-change history',
      'Employment and wage records tied to the claim',
    ],
    holdGuidance:
      'Target the hold to the suspicious transaction, minimize delay to legitimate claimants, and follow state adjudication and notice requirements.',
    authorityCitation: 'Social Security Act §§ 303(a)(1), 303(a)(3), and 1137',
    sourceUrl:
      'https://www.dol.gov/agencies/eta/unemployment-insurance-payment-accuracy',
  },
];

function playbookContent(playbook: PlaybookSeed): string {
  return [
    playbook.title,
    `Agency: ${playbook.agency}`,
    `Program: ${playbook.program}`,
    `Scenario: ${playbook.scenario}`,
    playbook.summary,
    `Verification steps: ${playbook.verificationSteps.join('; ')}`,
    `Required documents: ${playbook.requiredDocuments.join('; ')}`,
    `Hold guidance: ${playbook.holdGuidance}`,
    `Authority: ${playbook.authorityCitation}`,
  ].join('\n');
}

await createApp({
  plugins: [server(), lakebase(), analytics({})],
  async onPluginsReady(appkit) {
    const c = await appkit.lakebase.pool.connect();
    // Minimal context for embedText — no forwarded token, so authHeaders falls
    // back to the SDK credential chain (the CLI profile).
    const ctx = {
      req: { headers: {} } as unknown as Request,
      databricksHost: process.env.DATABRICKS_HOST ?? '',
    };
    try {
      console.log('[search-setup] CREATE EXTENSION vector …');
      try {
        await c.query('CREATE EXTENSION IF NOT EXISTS vector');
      } catch (e) {
        console.warn(
          `[search-setup] "vector" not available (${(e as Error).message}); trying "lakebase_vector"`,
        );
        await c.query('CREATE EXTENSION IF NOT EXISTS lakebase_vector');
      }

      console.log('[search-setup] CREATE TABLE app.reference_playbooks …');
      await c.query(`
        CREATE TABLE IF NOT EXISTS app.reference_playbooks (
          guide_id text PRIMARY KEY,
          title text NOT NULL,
          agency text NOT NULL,
          program text NOT NULL,
          scenario text NOT NULL,
          summary text NOT NULL,
          verification_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
          required_documents jsonb NOT NULL DEFAULT '[]'::jsonb,
          hold_guidance text,
          authority_citation text NOT NULL,
          source_url text,
          content text NOT NULL,
          search_embedding vector(1024),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      const embeddingColumn = await c.query(`
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'app'
          AND table_name = 'reference_playbooks'
          AND column_name = 'search_embedding'
      `);
      if (embeddingColumn.rowCount === 0) {
        await c.query(
          'ALTER TABLE app.reference_playbooks ADD COLUMN search_embedding vector(1024)',
        );
      }
      const existingIndexes = new Set(
        (
          await c.query(`
            SELECT indexname
            FROM pg_indexes
            WHERE schemaname = 'app'
              AND tablename IN ('reference_playbooks', 'dispo_recs')
          `)
        ).rows.map((row) => String(row.indexname)),
      );
      if (!existingIndexes.has('reference_playbooks_program_idx')) {
        await c.query(
          'CREATE INDEX reference_playbooks_program_idx ON app.reference_playbooks (program)',
        );
      }
      if (!existingIndexes.has('reference_playbooks_agency_idx')) {
        await c.query(
          'CREATE INDEX reference_playbooks_agency_idx ON app.reference_playbooks (agency)',
        );
      }

      console.log(
        `[search-setup] UPSERT ${PLAYBOOKS.length} federal verification guides …`,
      );
      for (const p of PLAYBOOKS) {
        const content = playbookContent(p);
        await c.query(
          `INSERT INTO app.reference_playbooks (
             guide_id, title, agency, program, scenario, summary,
             verification_steps, required_documents, hold_guidance,
             authority_citation, source_url, content
           ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12)
           ON CONFLICT (guide_id) DO UPDATE SET
             title = EXCLUDED.title,
             agency = EXCLUDED.agency,
             program = EXCLUDED.program,
             scenario = EXCLUDED.scenario,
             summary = EXCLUDED.summary,
             verification_steps = EXCLUDED.verification_steps,
             required_documents = EXCLUDED.required_documents,
             hold_guidance = EXCLUDED.hold_guidance,
             authority_citation = EXCLUDED.authority_citation,
             source_url = EXCLUDED.source_url,
             search_embedding = CASE
               WHEN reference_playbooks.content IS DISTINCT FROM EXCLUDED.content THEN NULL
               ELSE reference_playbooks.search_embedding
             END,
             content = EXCLUDED.content,
             updated_at = CASE
               WHEN reference_playbooks.content IS DISTINCT FROM EXCLUDED.content THEN now()
               ELSE reference_playbooks.updated_at
             END`,
          [
            p.guideId,
            p.title,
            p.agency,
            p.program,
            p.scenario,
            p.summary,
            JSON.stringify(p.verificationSteps),
            JSON.stringify(p.requiredDocuments),
            p.holdGuidance,
            p.authorityCitation,
            p.sourceUrl,
            content,
          ],
        );
      }

      const playbookRows = (
        await c.query(
          `SELECT guide_id, content
             FROM app.reference_playbooks
            WHERE search_embedding IS NULL`,
        )
      ).rows as Array<{ guide_id: string; content: string }>;
      console.log(
        `[search-setup] embedding ${playbookRows.length} playbooks …`,
      );
      for (const p of playbookRows) {
        const vector = await embedText(ctx, p.content);
        await c.query(
          'UPDATE app.reference_playbooks SET search_embedding = $1::vector WHERE guide_id = $2',
          [`[${vector.join(',')}]`, p.guide_id],
        );
      }
      if (!existingIndexes.has('reference_playbooks_embedding_hnsw_idx')) {
        try {
          await c.query(
            `CREATE INDEX reference_playbooks_embedding_hnsw_idx
               ON app.reference_playbooks USING hnsw (search_embedding vector_cosine_ops)`,
          );
        } catch (error) {
          if ((error as { code?: string }).code !== '42501') throw error;
          console.warn(
            '[search-setup] HNSW index deferred to app owner at next startup',
          );
        }
      }

      console.log(
        '[search-setup] ADD COLUMN app.dispo_recs.search_embedding vector(1024) …',
      );
      const dispositionEmbeddingColumn = await c.query(`
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'app'
          AND table_name = 'dispo_recs'
          AND column_name = 'search_embedding'
      `);
      if (dispositionEmbeddingColumn.rowCount === 0) {
        await c.query(
          'ALTER TABLE app.dispo_recs ADD COLUMN search_embedding vector(1024)',
        );
      }

      const rows = (
        await c.query(
          `SELECT payment_id, reasoning
             FROM app.dispo_recs
            WHERE search_embedding IS NULL AND reasoning IS NOT NULL`,
        )
      ).rows as Array<{ payment_id: string; reasoning: string }>;
      console.log(
        `[search-setup] embedding ${rows.length} rows via databricks-gte-large-en …`,
      );

      let done = 0;
      for (const r of rows) {
        const vec = await embedText(ctx, r.reasoning);
        const lit = `[${vec.join(',')}]`;
        await c.query(
          'UPDATE app.dispo_recs SET search_embedding = $1::vector WHERE payment_id = $2',
          [lit, r.payment_id],
        );
        done++;
        if (done % 10 === 0)
          console.log(`[search-setup]   ${done}/${rows.length}`);
      }
      console.log(`[search-setup] embedded ${done} rows`);

      console.log(
        '[search-setup] CREATE INDEX dispo_recs_reasoning_vec_idx (hnsw cosine) …',
      );
      if (!existingIndexes.has('dispo_recs_reasoning_vec_idx')) {
        try {
          await c.query(
            `CREATE INDEX dispo_recs_reasoning_vec_idx
               ON app.dispo_recs USING hnsw (search_embedding vector_cosine_ops)`,
          );
        } catch (error) {
          if ((error as { code?: string }).code !== '42501') throw error;
          console.warn(
            '[search-setup] disposition HNSW index owner-managed; continuing',
          );
        }
      }

      const cnt = (
        await c.query(
          `SELECT count(*)::int AS total, count(search_embedding)::int AS embedded
             FROM app.dispo_recs`,
        )
      ).rows[0];
      const playbookCount = (
        await c.query(
          `SELECT count(*)::int AS total, count(search_embedding)::int AS embedded
             FROM app.reference_playbooks`,
        )
      ).rows[0];
      console.log(
        '[search-setup] done: ' +
          JSON.stringify({
            disposition_recommendations: cnt,
            reference_playbooks: playbookCount,
          }),
      );
      process.exit(0);
    } catch (e) {
      console.error('[search-setup] failed:', e);
      process.exit(1);
    } finally {
      c.release();
    }
  },
});
