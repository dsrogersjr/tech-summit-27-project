/**
 * One-shot Delta → Lakebase sync — Sentinel Payment Integrity.
 *
 * > In production this is Lakebase Synced Tables (managed, continuous
 * > Delta→Lakebase replication with the same UC governance). For the demo
 * > build we keep it simple: a manual one-shot sync at boot, code we can
 * > show, no extra resource. Same outcome on screen.
 *
 * Pulls the three READ-ONLY Gold mirrors:
 *   - payment_position         (the flagged payments + flagged count)
 *   - open_queue               (open flag + risk metrics)
 *   - dispo_recs (the ML model's ranked dispositions)
 *
 * `case_actions` is the app's own WRITABLE table — never synced, starts empty.
 *
 * The dispo_recs table is BUILT BY THE TRAINEE (the ML step of
 * the workshop). So its query is fault-tolerant: if the table doesn't exist
 * yet, we log + leave the mirror empty rather than failing boot.
 *
 * Idempotent in the "only-if-destination-empty" sense — if the position
 * mirror has rows, we skip. Pass `{ forceIfAnyEmpty: true }` to re-sync
 * on demand (used by the "Reset demo" button).
 */
export async function syncFromDelta(
  db: AppDb,
  cfg: DataConfig,
  opts: { forceIfAnyEmpty?: boolean } = {},
): Promise<void> {
  const exists = await db.execute(
    sql`SELECT COUNT(*)::int AS n FROM app.payment_position`,
  );
  const n = (exists.rows[0] as { n: number } | undefined)?.n ?? 0;
  if (n > 0 && !opts.forceIfAnyEmpty) return;

  const warehouseId = process.env.DATABRICKS_WAREHOUSE_ID;
  if (!warehouseId) {
    console.warn('[sync] DATABRICKS_WAREHOUSE_ID not set — skipping Delta sync');
    return;
  }

  console.log('[sync] Starting Delta → Lakebase sync (parallel)…');
  const t0 = Date.now();

  const fq = (name: 'paymentPosition' | 'openQueue' | 'dispositionRecommendations') =>
    `${cfg.catalog}.${cfg.schema}.${cfg.tables[name]}`;

/**
 * Reset: truncate the app's writable table + chat state, then re-sync the
 * read-only mirrors. All agent writes are wiped — flags return to open,
 * exposure returns to full. Intentional: between presentations the backlog
 * should look untouched.
 */
export async function wipeMirroredTables(db: AppDb): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`TRUNCATE TABLE app.feedback RESTART IDENTITY CASCADE`);
    await tx.execute(sql`TRUNCATE TABLE app.messages RESTART IDENTITY CASCADE`);
    await tx.execute(sql`TRUNCATE TABLE app.conversations RESTART IDENTITY CASCADE`);
    // The writable action table — the only place agent writes land.
    await tx.execute(sql`TRUNCATE TABLE app.case_actions RESTART IDENTITY CASCADE`);
    // Read-only mirrors — re-pulled by syncFromDelta after this.
    await tx.execute(sql`TRUNCATE TABLE app.dispo_recs RESTART IDENTITY CASCADE`);
    await tx.execute(sql`TRUNCATE TABLE app.open_queue RESTART IDENTITY CASCADE`);
    await tx.execute(sql`TRUNCATE TABLE app.payment_position RESTART IDENTITY CASCADE`);
  });
}
