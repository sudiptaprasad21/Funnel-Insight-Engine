import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString =
  process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL or SUPABASE_DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/**
 * Parse a postgres connection URL using a regex so that special characters
 * in the password (e.g. #, @) are preserved correctly.
 * Standard URL parsers treat # as a fragment delimiter and silently truncate.
 */
function parsePostgresUrl(url: string) {
  const match = url.match(
    /^(?:postgresql|postgres):\/\/([^:]+):(.+)@([^@:/]+)(?::(\d+))?\/([^?]+)/,
  );
  if (!match) return null;
  const [, user, password, host, port, database] = match;
  return { user, password, host, port: port ? parseInt(port, 10) : 5432, database };
}

const isSupabase = !!process.env.SUPABASE_DATABASE_URL;
const parsed = isSupabase ? parsePostgresUrl(connectionString) : null;

export const pool = parsed
  ? new Pool({ ...parsed, ssl: { rejectUnauthorized: false } })
  : new Pool({ connectionString });

export const db = drizzle(pool, { schema });

export * from "./schema";
