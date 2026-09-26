import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const file = process.argv[2];
if (!file) throw new Error("Usage: node scripts/apply-migration.mjs <migration.sql>");
const connectionString = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
if (!connectionString) throw new Error("A production Postgres URL is required.");

const databaseUrl = new URL(connectionString);
databaseUrl.searchParams.delete("sslmode");
const client = new pg.Client({ connectionString: databaseUrl.toString(), ssl: { rejectUnauthorized: false } });
const sql = await readFile(resolve(file), "utf8");
try {
  await client.connect();
  await client.query("begin");
  await client.query(sql);
  await client.query("commit");
  console.log(`Applied ${file}`);
} catch (error) {
  await client.query("rollback").catch(() => {});
  throw error;
} finally {
  await client.end();
}
