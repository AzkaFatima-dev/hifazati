import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import assert from "node:assert/strict";
import pg from "pg";

const [envFile, migration] = process.argv.slice(2);
assert(envFile && migration, "Usage: node scripts/apply-migration.mjs <env-file> <migration.sql>");
const env = parseEnv(readFileSync(envFile, "utf8"));
const url = new URL(env.POSTGRES_URL);
if (url.searchParams.get("sslmode") === "require") url.searchParams.set("uselibpqcompat", "true");
const db = new pg.Client({ connectionString: url.toString() });
try {
  await db.connect();
  await db.query("begin");
  await db.query("set local lock_timeout = '5s'");
  await db.query(readFileSync(migration, "utf8"));
  await db.query("commit");
  console.log(`Applied ${migration}`);
} catch (error) {
  await db.query("rollback").catch(() => {});
  throw error;
} finally { await db.end(); }
