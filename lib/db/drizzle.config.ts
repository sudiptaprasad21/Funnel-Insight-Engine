import { defineConfig } from "drizzle-kit";
import path from "path";

const raw = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!raw) {
  throw new Error(
    "DATABASE_URL or SUPABASE_DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/**
 * Percent-encode the password portion of a postgres URL so that special
 * characters (e.g. #) are not misinterpreted by URL parsers.
 */
function encodePasswordInUrl(url: string): string {
  const match = url.match(
    /^((?:postgresql|postgres):\/\/[^:]+):(.+)@(.+)$/,
  );
  if (!match) return url;
  const [, prefix, password, rest] = match;
  return `${prefix}:${encodeURIComponent(password)}@${rest}`;
}

const isSupabase = !!process.env.SUPABASE_DATABASE_URL;
const url = encodePasswordInUrl(raw);

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url,
    ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  },
});
