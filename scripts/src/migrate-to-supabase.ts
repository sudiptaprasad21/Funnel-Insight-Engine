/**
 * migrate-to-supabase.ts
 *
 * Creates the full schema on Supabase and migrates all data from the Replit DB.
 * Safe to re-run: uses CREATE TABLE IF NOT EXISTS and ON CONFLICT DO NOTHING/UPDATE.
 * Uses pg.Client (not Pool) with individual params to handle special chars in passwords.
 *
 * Usage: pnpm --filter @workspace/scripts run migrate-to-supabase
 */

import pg from "pg";

const { Client, Pool } = pg;

const SOURCE_URL = process.env.DATABASE_URL;
const TARGET_URL = process.env.SUPABASE_DATABASE_URL;

if (!SOURCE_URL) {
  console.error("Error: DATABASE_URL (source Replit DB) is not set.");
  process.exit(1);
}
if (!TARGET_URL) {
  console.error("Error: SUPABASE_DATABASE_URL is not set.");
  process.exit(1);
}

/**
 * Parse a postgres URL with a regex so that special characters in the password
 * (e.g. #) are correctly extracted — standard URL parsers treat # as a fragment
 * delimiter and silently truncate the password.
 */
function parsePostgresUrl(url: string) {
  const match = url.match(
    /^(?:postgresql|postgres):\/\/([^:]+):(.+)@([^@:/]+)(?::(\d+))?\/([^?]+)/,
  );
  if (!match) throw new Error(`Cannot parse connection string: ${url.slice(0, 30)}…`);
  const [, user, password, host, port, database] = match;
  return { user, password, host, port: port ? parseInt(port, 10) : 5432, database };
}

const targetParams = parsePostgresUrl(TARGET_URL);
console.log(`Connecting to Supabase host: ${targetParams.host}`);

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  price       REAL NOT NULL,
  sale_price  REAL,
  on_sale     BOOLEAN NOT NULL DEFAULT FALSE,
  image_url   TEXT,
  description TEXT,
  is_nappy_sub BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id                SERIAL PRIMARY KEY,
  name              TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  is_repeat         BOOLEAN NOT NULL DEFAULT FALSE,
  is_subscribed     BOOLEAN NOT NULL DEFAULT FALSE,
  subscription_days INTEGER,
  subscription_plan TEXT,
  total_orders      INTEGER NOT NULL DEFAULT 0,
  total_spend       REAL NOT NULL DEFAULT 0,
  source            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS funnel_events (
  id          SERIAL PRIMARY KEY,
  event_type  TEXT NOT NULL,
  session_id  TEXT NOT NULL,
  customer_id INTEGER,
  product_id  INTEGER,
  metadata    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS experiments (
  id              SERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  hypothesis      TEXT NOT NULL,
  expected_impact TEXT NOT NULL,
  effort          TEXT NOT NULL DEFAULT 'medium',
  funnel_stage    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'proposed',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ,
  merge_note      TEXT
);

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

async function run() {
  console.log("=== Supabase Migration ===\n");

  // Source: use Pool (Replit DB, no special chars in URL)
  const srcPool = new Pool({ connectionString: SOURCE_URL });
  const src = await srcPool.connect();

  // Target: use Client with individual params (handles # in password)
  const tgt = new Client({ ...targetParams, ssl: { rejectUnauthorized: false } });
  await tgt.connect();
  console.log("  ✓ Connected to Supabase\n");

  try {
    // ── Step 1: Create schema ──────────────────────────────────────────────
    console.log("Step 1/3 — Creating schema on Supabase…");
    await tgt.query(SCHEMA_SQL);
    console.log("  ✓ All tables created (or already exist)\n");

    // ── Step 2: Migrate data ───────────────────────────────────────────────
    console.log("Step 2/3 — Migrating data…\n");

    // products
    {
      const { rows } = await src.query(
        "SELECT id,name,category,price,sale_price,on_sale,image_url,description,is_nappy_sub,created_at FROM products ORDER BY id",
      );
      await tgt.query("BEGIN");
      for (const r of rows) {
        await tgt.query(
          `INSERT INTO products(id,name,category,price,sale_price,on_sale,image_url,description,is_nappy_sub,created_at)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(id) DO NOTHING`,
          [r.id,r.name,r.category,r.price,r.sale_price,r.on_sale,r.image_url,r.description,r.is_nappy_sub,r.created_at],
        );
      }
      await tgt.query("COMMIT");
      if (rows.length) await tgt.query("SELECT setval('products_id_seq',(SELECT MAX(id) FROM products))");
      console.log(`  products       → ${rows.length} rows`);
    }

    // customers
    {
      const { rows } = await src.query(
        "SELECT id,name,email,is_repeat,is_subscribed,subscription_days,subscription_plan,total_orders,total_spend,source,created_at FROM customers ORDER BY id",
      );
      await tgt.query("BEGIN");
      for (const r of rows) {
        await tgt.query(
          `INSERT INTO customers(id,name,email,is_repeat,is_subscribed,subscription_days,subscription_plan,total_orders,total_spend,source,created_at)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(id) DO NOTHING`,
          [r.id,r.name,r.email,r.is_repeat,r.is_subscribed,r.subscription_days,r.subscription_plan,r.total_orders,r.total_spend,r.source,r.created_at],
        );
      }
      await tgt.query("COMMIT");
      if (rows.length) await tgt.query("SELECT setval('customers_id_seq',(SELECT MAX(id) FROM customers))");
      console.log(`  customers      → ${rows.length} rows`);
    }

    // funnel_events — chunked
    {
      const { rows } = await src.query(
        "SELECT id,event_type,session_id,customer_id,product_id,metadata,created_at FROM funnel_events ORDER BY id",
      );
      const CHUNK = 100;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        await tgt.query("BEGIN");
        for (const r of chunk) {
          await tgt.query(
            `INSERT INTO funnel_events(id,event_type,session_id,customer_id,product_id,metadata,created_at)
             VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING`,
            [r.id,r.event_type,r.session_id,r.customer_id,r.product_id,r.metadata,r.created_at],
          );
        }
        await tgt.query("COMMIT");
      }
      if (rows.length) await tgt.query("SELECT setval('funnel_events_id_seq',(SELECT MAX(id) FROM funnel_events))");
      console.log(`  funnel_events  → ${rows.length} rows`);
    }

    // experiments
    {
      const { rows } = await src.query(
        "SELECT id,title,hypothesis,expected_impact,effort,funnel_stage,status,created_at,updated_at,merge_note FROM experiments ORDER BY id",
      );
      await tgt.query("BEGIN");
      for (const r of rows) {
        await tgt.query(
          `INSERT INTO experiments(id,title,hypothesis,expected_impact,effort,funnel_stage,status,created_at,updated_at,merge_note)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(id) DO NOTHING`,
          [r.id,r.title,r.hypothesis,r.expected_impact,r.effort,r.funnel_stage,r.status,r.created_at,r.updated_at,r.merge_note],
        );
      }
      await tgt.query("COMMIT");
      if (rows.length) await tgt.query("SELECT setval('experiments_id_seq',(SELECT MAX(id) FROM experiments))");
      console.log(`  experiments    → ${rows.length} rows`);
    }

    // app_settings
    {
      const { rows } = await src.query("SELECT key,value,updated_at FROM app_settings");
      await tgt.query("BEGIN");
      for (const r of rows) {
        await tgt.query(
          `INSERT INTO app_settings(key,value,updated_at) VALUES($1,$2,$3)
           ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value, updated_at=EXCLUDED.updated_at`,
          [r.key,r.value,r.updated_at],
        );
      }
      await tgt.query("COMMIT");
      console.log(`  app_settings   → ${rows.length} rows`);
    }

    // ── Step 3: Verify ────────────────────────────────────────────────────
    console.log("\nStep 3/3 — Verifying row counts…\n");
    const tables = ["funnel_events","customers","products","experiments","app_settings"];
    let allOk = true;
    for (const table of tables) {
      const srcRes = await src.query(`SELECT COUNT(*) FROM ${table}`);
      const tgtRes = await tgt.query(`SELECT COUNT(*) FROM ${table}`);
      const srcN = parseInt(srcRes.rows[0].count, 10);
      const tgtN = parseInt(tgtRes.rows[0].count, 10);
      const ok = srcN === tgtN;
      if (!ok) allOk = false;
      console.log(`  ${ok ? "✓" : "✗ MISMATCH"}  ${table.padEnd(18)} source=${srcN}  supabase=${tgtN}`);
    }

    console.log(allOk
      ? "\n✓ Migration successful — all counts match."
      : "\n✗ Some counts differ — check the output above.");
  } finally {
    src.release();
    await srcPool.end();
    await tgt.end();
  }
}

run().catch((err) => {
  console.error("\nMigration failed:", err.message);
  process.exit(1);
});
