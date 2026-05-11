/**
 * migrate-to-supabase.ts
 *
 * Migrates all data from the Replit Postgres DB to Supabase.
 * Run AFTER setting SUPABASE_DATABASE_URL as a secret and AFTER
 * `pnpm --filter @workspace/db run push` has applied the schema to Supabase.
 *
 * Usage: pnpm --filter @workspace/scripts run migrate-to-supabase
 */

import pg from "pg";

const { Pool } = pg;

const SOURCE_URL = process.env.DATABASE_URL;
const TARGET_URL = process.env.SUPABASE_DATABASE_URL;

if (!SOURCE_URL) {
  console.error("Error: DATABASE_URL (source Replit DB) is not set.");
  process.exit(1);
}
if (!TARGET_URL) {
  console.error(
    "Error: SUPABASE_DATABASE_URL is not set. Please add it as a secret first.",
  );
  process.exit(1);
}

const source = new Pool({ connectionString: SOURCE_URL });
const target = new Pool({
  connectionString: TARGET_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  console.log("Starting migration: Replit DB → Supabase\n");

  const src = await source.connect();
  const tgt = await target.connect();

  try {
    // ── 1. products ────────────────────────────────────────────────────────
    console.log("Migrating products…");
    const products = await src.query(
      "SELECT id, name, category, price, sale_price, on_sale, image_url, description, is_nappy_sub, created_at FROM products ORDER BY id",
    );
    if (products.rows.length > 0) {
      await tgt.query("BEGIN");
      for (const r of products.rows) {
        await tgt.query(
          `INSERT INTO products (id, name, category, price, sale_price, on_sale, image_url, description, is_nappy_sub, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (id) DO NOTHING`,
          [r.id, r.name, r.category, r.price, r.sale_price, r.on_sale, r.image_url, r.description, r.is_nappy_sub, r.created_at],
        );
      }
      await tgt.query("COMMIT");
      await tgt.query(
        "SELECT setval('products_id_seq', (SELECT MAX(id) FROM products))",
      );
      console.log(`  ✓ ${products.rows.length} products`);
    } else {
      console.log("  (no products to migrate)");
    }

    // ── 2. customers ───────────────────────────────────────────────────────
    console.log("Migrating customers…");
    const customers = await src.query(
      "SELECT id, name, email, is_repeat, is_subscribed, subscription_days, subscription_plan, total_orders, total_spend, source, created_at FROM customers ORDER BY id",
    );
    if (customers.rows.length > 0) {
      await tgt.query("BEGIN");
      for (const r of customers.rows) {
        await tgt.query(
          `INSERT INTO customers (id, name, email, is_repeat, is_subscribed, subscription_days, subscription_plan, total_orders, total_spend, source, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (id) DO NOTHING`,
          [r.id, r.name, r.email, r.is_repeat, r.is_subscribed, r.subscription_days, r.subscription_plan, r.total_orders, r.total_spend, r.source, r.created_at],
        );
      }
      await tgt.query("COMMIT");
      await tgt.query(
        "SELECT setval('customers_id_seq', (SELECT MAX(id) FROM customers))",
      );
      console.log(`  ✓ ${customers.rows.length} customers`);
    } else {
      console.log("  (no customers to migrate)");
    }

    // ── 3. funnel_events ───────────────────────────────────────────────────
    console.log("Migrating funnel_events…");
    const events = await src.query(
      "SELECT id, event_type, session_id, customer_id, product_id, metadata, created_at FROM funnel_events ORDER BY id",
    );
    if (events.rows.length > 0) {
      // Insert in chunks of 100 to avoid oversized transactions
      const CHUNK = 100;
      let total = 0;
      for (let i = 0; i < events.rows.length; i += CHUNK) {
        const chunk = events.rows.slice(i, i + CHUNK);
        await tgt.query("BEGIN");
        for (const r of chunk) {
          await tgt.query(
            `INSERT INTO funnel_events (id, event_type, session_id, customer_id, product_id, metadata, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7)
             ON CONFLICT (id) DO NOTHING`,
            [r.id, r.event_type, r.session_id, r.customer_id, r.product_id, r.metadata, r.created_at],
          );
        }
        await tgt.query("COMMIT");
        total += chunk.length;
        process.stdout.write(`\r  inserting… ${total}/${events.rows.length}`);
      }
      await tgt.query(
        "SELECT setval('funnel_events_id_seq', (SELECT MAX(id) FROM funnel_events))",
      );
      console.log(`\n  ✓ ${events.rows.length} funnel_events`);
    } else {
      console.log("  (no events to migrate)");
    }

    // ── 4. experiments ─────────────────────────────────────────────────────
    console.log("Migrating experiments…");
    const experiments = await src.query(
      "SELECT id, title, hypothesis, expected_impact, effort, funnel_stage, status, created_at, updated_at, merge_note FROM experiments ORDER BY id",
    );
    if (experiments.rows.length > 0) {
      await tgt.query("BEGIN");
      for (const r of experiments.rows) {
        await tgt.query(
          `INSERT INTO experiments (id, title, hypothesis, expected_impact, effort, funnel_stage, status, created_at, updated_at, merge_note)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (id) DO NOTHING`,
          [r.id, r.title, r.hypothesis, r.expected_impact, r.effort, r.funnel_stage, r.status, r.created_at, r.updated_at, r.merge_note],
        );
      }
      await tgt.query("COMMIT");
      await tgt.query(
        "SELECT setval('experiments_id_seq', (SELECT MAX(id) FROM experiments))",
      );
      console.log(`  ✓ ${experiments.rows.length} experiments`);
    } else {
      console.log("  (no experiments to migrate)");
    }

    // ── 5. app_settings ────────────────────────────────────────────────────
    console.log("Migrating app_settings…");
    const settings = await src.query(
      "SELECT key, value, updated_at FROM app_settings",
    );
    if (settings.rows.length > 0) {
      await tgt.query("BEGIN");
      for (const r of settings.rows) {
        await tgt.query(
          `INSERT INTO app_settings (key, value, updated_at)
           VALUES ($1,$2,$3)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
          [r.key, r.value, r.updated_at],
        );
      }
      await tgt.query("COMMIT");
      console.log(`  ✓ ${settings.rows.length} app_settings rows`);
    } else {
      console.log("  (no settings to migrate)");
    }

    console.log("\nMigration complete. Verifying row counts in Supabase…\n");

    const checks = [
      "funnel_events",
      "customers",
      "products",
      "experiments",
      "app_settings",
    ];
    for (const table of checks) {
      const srcCount = await src.query(`SELECT COUNT(*) FROM ${table}`);
      const tgtCount = await tgt.query(`SELECT COUNT(*) FROM ${table}`);
      const match =
        srcCount.rows[0].count === tgtCount.rows[0].count ? "✓" : "✗ MISMATCH";
      console.log(
        `  ${match}  ${table}: source=${srcCount.rows[0].count}  supabase=${tgtCount.rows[0].count}`,
      );
    }
  } finally {
    src.release();
    tgt.release();
    await source.end();
    await target.end();
  }
}

run().catch((err) => {
  console.error("\nMigration failed:", err.message);
  process.exit(1);
});
