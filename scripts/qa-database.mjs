import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import pg from "pg";

const envFile = process.argv[2];
if (envFile) Object.assign(process.env, parseEnv(readFileSync(envFile, "utf8")));
const connectionString = process.env.POSTGRES_URL;
assert(connectionString, "POSTGRES_URL is required");
// Honor the SSL mode in the supplied administrator connection string.
const connectionUrl = new URL(connectionString);
if (connectionUrl.searchParams.get("sslmode") === "require") connectionUrl.searchParams.set("uselibpqcompat", "true");
const db = new pg.Client({ connectionString: connectionUrl.toString() });
const checks = [];
function check(name, passed) { checks.push({ name, passed }); console.log(`${passed ? "PASS" : "FAIL"} ${name}`); }

try {
  await db.connect();
  const permissions = await db.query(`
    select c.relname, c.relrowsecurity as rls,
      has_table_privilege('anon', c.oid, 'select') as anon_read,
      has_table_privilege('anon', c.oid, 'insert') as anon_write,
      has_table_privilege('authenticated', c.oid, 'select') as auth_read,
      has_table_privilege('authenticated', c.oid, 'insert') as auth_write
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' order by c.relname`);
  console.log("Table permission inventory", JSON.stringify(permissions.rows));
  for (const table of permissions.rows.filter((row) => ["ride_reports", "driver_lookup_attempts", "report_deletion_jobs", "intake_request_limits"].includes(row.relname))) {
    check(`${table.relname} is private with RLS`, table.rls && !table.anon_read && !table.anon_write && !table.auth_read && !table.auth_write);
  }
  const bucket = (await db.query("select public,file_size_limit,allowed_mime_types from storage.buckets where id='report-evidence'")).rows[0];
  check("Proof bucket is private, limited to 20 MB, and restricted to supported MIME types", bucket?.public === false && Number(bucket.file_size_limit) === 20971520 && bucket?.allowed_mime_types?.includes("image/png") && !bucket?.allowed_mime_types?.includes("text/html"));
  console.log("Proof MIME restrictions", JSON.stringify(bucket?.allowed_mime_types));
  const grants = (await db.query(`select p.proname,
    has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
    has_function_privilege('authenticated',p.oid,'EXECUTE') as auth_execute
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('delete_owned_report','reserve_driver_lookup','reserve_intake_attempt','validate_public_trend')`)).rows;
  for (const fn of grants) check(`${fn.proname} cannot be called by browser roles`, !fn.anon_execute && !fn.auth_execute);
  const counts = (await db.query(`select (select count(*) from public.ride_reports) as reports,
    (select count(*) from public.public_ride_trends) as trends,
    (select count(*) from public.report_deletion_jobs) as pending_file_cleanup,
    (select count(*) from storage.objects where bucket_id='report-evidence') as private_proof_files,
    (select count(*) from storage.objects o where o.bucket_id='report-evidence'
       and o.created_at < now() - interval '24 hours'
       and not exists (select 1 from public.ride_reports r
         where o.name = any(r.evidence_paths) or o.name = r.driver_photo_path)) as old_orphan_files`)).rows[0];
  console.log("Aggregate inventory", JSON.stringify(counts));

  await db.query("begin");
  const accountId = randomUUID(), guestId = randomUUID();
  const tokenHash = createHash("sha256").update(randomBytes(32)).digest("hex");
  const owner = `user_QA${randomBytes(10).toString("hex")}`;
  for (const [id, userId, hash] of [[accountId, owner, null], [guestId, null, tokenHash]]) {
    await db.query(`insert into public.ride_reports
      (id,provider,provider_other,issue_type,area,details,driver_name,driver_name_key,driver_contact,driver_phone_key,evidence_paths,owner_user_id,manage_token_hash)
      values ($1,'Other','Automated QA fixture','Other','QA isolated','Transactional QA fixture; never published','QA fixture','qa fixture','000000000','000000000',$2,$3,$4)`,
    [id, [`${id}/evidence-${randomUUID()}.pdf`], userId, hash]);
  }
  for (const [name, id, userId, hash, allowed] of [
    ["Account owner can delete",accountId,owner,null,true],
    ["Different account cannot delete",accountId,"user_QAOther123",null,false],
    ["Guest with wrong receipt cannot delete account report",accountId,null,"wrong",false],
    ["Missing credentials cannot delete account report",accountId,null,null,false],
    ["Correct receipt can delete guest report",guestId,null,tokenHash,true],
    ["Wrong receipt cannot delete guest report",guestId,null,"wrong",false],
    ["Signed-in stranger cannot delete guest report",guestId,owner,null,false],
    ["Missing credentials cannot delete guest report",guestId,null,null,false],
  ]) {
    await db.query("savepoint deletion_case");
    const result = (await db.query("select public.delete_owned_report($1,$2,$3) as paths",[id,userId,hash])).rows[0].paths;
    const remaining = Number((await db.query("select count(*) as n from public.ride_reports where id=$1",[id])).rows[0].n);
    check(name, allowed ? Array.isArray(result) && remaining === 0 : result === null && remaining === 1);
    if (allowed) check(`${name}: file cleanup is queued`, Number((await db.query("select count(*) as n from public.report_deletion_jobs where report_id=$1",[id])).rows[0].n) === 1);
    await db.query("rollback to savepoint deletion_case");
  }
  for (let i=1; i<=21; i++) {
    const allowed = (await db.query("select public.reserve_driver_lookup($1) as allowed",[owner])).rows[0].allowed;
    check(`Driver lookup quota ${i}/20`, allowed === (i<=20));
  }
  for (const [action, limit] of [["upload",60],["report",20],["receipt",120]]) {
    const subject = createHash("sha256").update(randomUUID()).digest("hex");
    await db.query("insert into public.intake_request_limits(subject_hash,action,window_start,attempts) values ($1,$2,date_trunc('hour',now()),$3)",[subject,action,limit-1]);
    check(`${action} request ${limit} allowed`, (await db.query("select public.reserve_intake_attempt($1,$2) as allowed",[subject,action])).rows[0].allowed === true);
    check(`${action} request ${limit+1} denied`, (await db.query("select public.reserve_intake_attempt($1,$2) as allowed",[subject,action])).rows[0].allowed === false);
  }
  check("Unknown intake action is rejected", (await db.query("select public.reserve_intake_attempt($1,$2) as allowed",["a".repeat(64),"other"])).rows[0].allowed === false);

  await db.query("savepoint insufficient_trend");
  try {
    await db.query("insert into public.public_ride_trends(provider,issue_type,area,report_count) values ('Other','Other','QA isolated',3)");
    check("One or two reviewed reports cannot be published as a public group", false);
  } catch (error) {
    check("One or two reviewed reports cannot be published as a public group", error.code === "23514");
  }
  await db.query("rollback to savepoint insufficient_trend");
  const thirdId = randomUUID();
  await db.query(`insert into public.ride_reports
    (id,provider,provider_other,issue_type,area,details,driver_name,driver_name_key,driver_contact,driver_phone_key,evidence_paths,owner_user_id)
    values ($1,'Other','Automated QA fixture','Other','QA isolated','Transactional QA fixture; never published','QA fixture','qa fixture','000000000','000000000',$2,$3)`,
    [thirdId,[`${thirdId}/evidence-${randomUUID()}.pdf`],owner]);
  await db.query("update public.ride_reports set review_status='reviewed' where id=any($1::uuid[])",[[accountId,guestId,thirdId]]);
  await db.query("insert into public.public_ride_trends(provider,issue_type,area,report_count) values ('Other','Other','QA isolated',3)");
  check("Three reviewed reports can form an accurate group", Number((await db.query("select count(*) as n from public.public_ride_trends where area='QA isolated'")).rows[0].n) === 1);
  await db.query("update public.ride_reports set review_status='rejected' where id=$1",[thirdId]);
  check("Rejecting a reviewed report removes an under-three public group", Number((await db.query("select count(*) as n from public.public_ride_trends where area='QA isolated'")).rows[0].n) === 0);
  await db.query("rollback");
  console.log("All QA fixtures rolled back.");
} finally {
  await db.query("rollback").catch(() => {});
  await db.end();
}
const failed = checks.filter((check) => !check.passed);
console.log(`${checks.length-failed.length}/${checks.length} database checks passed.`);
if (failed.length) process.exitCode = 1;
