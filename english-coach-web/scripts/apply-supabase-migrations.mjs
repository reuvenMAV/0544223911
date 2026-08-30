#!/usr/bin/env node
/**
 * Apply SQL migrations to Supabase via direct Postgres connection.
 *
 * Usage:
 *   SUPABASE_DB_URL='postgresql://postgres.[ref]:[password]@...' node scripts/apply-supabase-migrations.mjs
 *
 * Get connection string from Supabase Dashboard → Project Settings → Database → Connection string (URI).
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "../supabase/migrations");
const dbUrl = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("Missing SUPABASE_DB_URL or DATABASE_URL");
  process.exit(1);
}

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`Applying ${file}...`);
    await client.query(sql);
    console.log(`OK: ${file}`);
  }
  await client.end();
  console.log("All migrations applied.");
}

main().catch(async (error) => {
  console.error(error.message);
  try {
    await client.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
