// One-off maintenance: drop the Lakebase `app` schema so the next boot's
// migration recreates it cleanly. Needed after the mirror schema changed
// (payment_position/open_queue/dispo_recs columns) and the
// old tables would otherwise collide with the fresh CREATE TABLE migration.
//
// Run once:  npx tsx --env-file-if-exists=./.env scripts/reset_app_schema.ts
import { createApp, server, lakebase, analytics } from '@databricks/appkit';

await createApp({
  plugins: [server(), lakebase(), analytics({})],
  async onPluginsReady(appkit) {
    console.log('[reset] DROP SCHEMA app CASCADE …');
    await appkit.lakebase.pool.query('DROP SCHEMA IF EXISTS app CASCADE');
    console.log('[reset] done — next boot rebuilds app schema from the migration.');
    process.exit(0);
  },
});
