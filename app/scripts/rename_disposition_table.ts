// One-off maintenance: rename the production Lakebase mirror table from
// `app.disposition_recommendations` to `app.dispo_recs`.
//
// Run this once while the app's postgres binding points at the PRODUCTION
// Lakebase branch:
//   npx tsx --env-file-if-exists=./.env scripts/rename_disposition_table.ts
//
// Safety behavior:
//   - no-op if the rename already happened
//   - aborts if both old + new table names exist
//   - aborts if neither table exists
//   - runs the ALTER inside a transaction on a dedicated connection
import { createApp, server, lakebase, analytics } from '@databricks/appkit';

await createApp({
  plugins: [server(), lakebase(), analytics({})],
  async onPluginsReady(appkit) {
    const client = await appkit.lakebase.pool.connect();
    try {
      const ctx = await client.query<{
        current_database: string;
        current_user: string;
      }>(`
        SELECT
          current_database() AS current_database,
          current_user AS current_user
      `);
      const target = ctx.rows[0];
      console.log(
        `[rename] connected to database=${target?.current_database ?? 'unknown'} user=${target?.current_user ?? 'unknown'}`,
      );

      const exists = await client.query<{
        old_exists: boolean;
        new_exists: boolean;
      }>(`
        SELECT
          to_regclass('app.disposition_recommendations') IS NOT NULL AS old_exists,
          to_regclass('app.dispo_recs') IS NOT NULL AS new_exists
      `);
      const state = exists.rows[0];
      const oldExists = Boolean(state?.old_exists);
      const newExists = Boolean(state?.new_exists);

      if (!oldExists && newExists) {
        console.log('[rename] app.dispo_recs already exists — nothing to do.');
        process.exit(0);
      }

      if (oldExists && newExists) {
        throw new Error(
          'Both app.disposition_recommendations and app.dispo_recs exist. Resolve manually before running this migration.',
        );
      }

      if (!oldExists && !newExists) {
        throw new Error(
          'Neither app.disposition_recommendations nor app.dispo_recs exists on the connected branch.',
        );
      }

      console.log('[rename] renaming app.disposition_recommendations -> app.dispo_recs ...');
      await client.query('BEGIN');
      await client.query(
        'ALTER TABLE app.disposition_recommendations RENAME TO dispo_recs',
      );
      await client.query('COMMIT');

      const verify = await client.query<{ renamed_exists: boolean }>(`
        SELECT to_regclass('app.dispo_recs') IS NOT NULL AS renamed_exists
      `);
      if (!verify.rows[0]?.renamed_exists) {
        throw new Error('Rename completed without app.dispo_recs becoming visible.');
      }

      console.log('[rename] done — app.dispo_recs is now the live table name.');
      process.exit(0);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      console.error('[rename] failed:', error);
      process.exit(1);
    } finally {
      client.release();
    }
  },
});