import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { createClerkClient } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";

const [envPath = ".env.qa.local", base = "http://localhost:3100"] = process.argv.slice(2);
const env = parseEnv(readFileSync(envPath, "utf8"));
const local = parseEnv(readFileSync(".env.local", "utf8"));
if (!env.CLERK_SECRET_KEY && local.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) env.CLERK_SECRET_KEY = local.CLERK_SECRET_KEY;
assert(env.CLERK_SECRET_KEY?.startsWith("sk_test_"), "This QA script only creates users in a Clerk development instance.");
const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const storage = createClient(env.SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const users = [], reportIds = [], paths = [];
let passed = 0;
function check(name, condition) { assert(condition, name); passed++; console.log(`PASS ${name}`); }
async function request(path, { method = "POST", body, session, headers = {} } = {}) {
  if (session) headers.Authorization = `Bearer ${(await clerk.sessions.getToken(session.id)).jwt}`;
  const response = await fetch(`${base}${path}`, { method, headers: { "Content-Type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { data = null; }
  return { status: response.status, data, headers: response.headers, text };
}
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6K1cAAAAASUVORK5CYII=", "base64");
async function upload(id, kind = "evidence") {
  const r = await request("/api/reports/upload-url", { body: { reportId: id, kind, contentType: "image/png", size: png.length } });
  check("Signed private upload URL issued", r.status === 200 && r.data?.path && r.data?.token);
  check("Upload token response is not cached", r.headers.get("cache-control")?.includes("no-store"));
  paths.push(r.data.path);
  const uploaded = await storage.storage.from("report-evidence").uploadToSignedUrl(r.data.path, r.data.token, png, { contentType: "image/png" });
  check("Proof uploads to the private bucket", !uploaded.error);
  return r.data.path;
}
function fixture(id, evidence) {
  return { reportId: id, provider: "Other", providerOther: "Automated QA fixture, not a real ride", issueType: "Other", area: "QA isolated", tripMonth: "", driverContact: "000000000", driverName: `QA fixture ${id}`, details: "Automated temporary QA record. Not a real allegation. Removed after this test.", evidencePaths: [evidence], driverPhotoPath: null };
}
try {
  check("Homepage serves successfully", (await fetch(base)).status === 200);
  check("Guest driver search is denied", (await request("/api/drivers/search", { body: { method: "phone", value: "000000000" } })).status === 401);
  check("Guest account-report read is denied", (await request("/api/my-reports", { method: "GET" })).status === 401);
  check("Cross-site writes are rejected", (await request("/api/reports", { body: {}, headers: { Origin: "https://example.invalid" } })).status === 403);
  check("Non-JSON writes are rejected", (await request("/api/reports", { body: {}, headers: { "Content-Type": "text/plain" } })).status === 415);
  check("Oversized payloads are rejected", (await request("/api/reports", { body: { details: "x".repeat(17000) } })).status === 413);
  check("Array request bodies are rejected", (await request("/api/reports", { body: [] })).status === 400);
  const direct = await storage.from("ride_reports").select("id");
  check("Browser key cannot read raw reports", !!direct.error);

  for (let i = 0; i < 2; i++) {
    const user = await clerk.users.createUser({ emailAddress: [`hifazati-qa-${randomUUID()}+clerk_test@example.com`], password: `Qa!${randomBytes(24).toString("base64url")}`, privateMetadata: { automatedQa: true } });
    users.push(user);
  }
  const owner = await clerk.sessions.createSession({ userId: users[0].id });
  const stranger = await clerk.sessions.createSession({ userId: users[1].id });
  check("Real Clerk session is accepted by the app", (await request("/api/my-reports", { method: "GET", session: owner })).status === 200);

  const accountId = randomUUID(); reportIds.push(accountId);
  check("Oversized upload is rejected", (await request("/api/reports/upload-url", { body: { reportId: accountId, kind: "evidence", contentType: "image/png", size: 20971521 } })).status === 400);
  check("Active HTML upload is rejected", (await request("/api/reports/upload-url", { body: { reportId: accountId, kind: "evidence", contentType: "text/html", size: 10 } })).status === 400);
  const evidence = await upload(accountId);
  const photo = await upload(accountId, "driver-photo");
  const payload = { ...fixture(accountId, evidence), driverPhotoPath: photo };
  for (const field of ["driverName", "driverContact", "details", "area", "providerOther"]) check(`${field} is required server-side`, (await request("/api/reports", { body: { ...payload, [field]: "" }, session: owner })).status === 400);
  check("Proof is required server-side", (await request("/api/reports", { body: { ...payload, evidencePaths: [] }, session: owner })).status === 400);
  const created = await request("/api/reports", { body: { ...payload, owner_user_id: users[1].id, review_status: "reviewed" }, session: owner });
  check("Account report saves with optional month blank", created.status === 201 && created.data?.receipt === null);
  const row = await admin.from("ride_reports").select("owner_user_id,review_status,driver_photo_sha256").eq("id", accountId).single();
  check("Server controls ownership and review status", row.data?.owner_user_id === users[0].id && row.data?.review_status === "pending");
  check("Photo fingerprint matches uploaded bytes", row.data?.driver_photo_sha256 === createHash("sha256").update(png).digest("hex"));
  const mine = await request("/api/my-reports", { method: "GET", session: owner });
  check("Owner can list their report without secret fields", mine.data?.reports?.length === 1 && mine.data.reports[0].id === accountId && !JSON.stringify(mine.data).includes("manage_token_hash") && !JSON.stringify(mine.data).includes("evidence_paths"));
  check("Other account cannot list owner's report", (await request("/api/my-reports", { method: "GET", session: stranger })).data?.reports?.length === 0);
  check("Pending reports are excluded from searches", (await request("/api/drivers/search", { body: { method: "name", value: payload.driverName }, session: stranger })).data?.count === 0);
  await admin.from("ride_reports").update({ review_status: "reviewed" }).eq("id", accountId).throwOnError();
  for (const [method, value] of [["name", `  ${payload.driverName.toUpperCase()}  `], ["phone", "000000000"], ["photo", createHash("sha256").update(png).digest("hex")]]) {
    const result = await request("/api/drivers/search", { body: { method, value }, session: stranger });
    check(`Reviewed ${method} lookup returns only a count`, result.status === 200 && result.data?.count >= 1 && Object.keys(result.data).sort().join(",") === "count,method");
  }
  const publicProof = await fetch(`${env.SUPABASE_URL}/storage/v1/object/public/report-evidence/${evidence}`);
  check("Proof cannot be read through the public storage URL", !publicProof.ok);
  const wrongReceipt = `${accountId}.${"f".repeat(64)}`;
  check("Wrong guest receipt cannot delete account report", (await request(`/api/my-reports/${accountId}`, { method: "DELETE", body: { receipt: wrongReceipt } })).status === 404);
  check("Wrong account cannot delete account report", (await request(`/api/my-reports/${accountId}`, { method: "DELETE", body: {}, session: stranger })).status === 404);

  const guestId = randomUUID(); reportIds.push(guestId);
  const guestEvidence = await upload(guestId);
  const guest = await request("/api/reports", { body: fixture(guestId, guestEvidence) });
  check("Guest report receives a private receipt", guest.status === 201 && /^[0-9a-f-]{36}\.[0-9a-f]{64}$/.test(guest.data?.receipt));
  check("Private receipt retrieves guest report", (await request("/api/my-reports", { body: { receipts: [guest.data.receipt] } })).data?.reports?.[0]?.id === guestId);
  check("Wrong private receipt reveals nothing", (await request("/api/my-reports", { body: { receipts: [`${guestId}.${"f".repeat(64)}`] } })).data?.reports?.length === 0);
  check("Signed-in stranger cannot delete guest report", (await request(`/api/my-reports/${guestId}`, { method: "DELETE", body: {}, session: stranger })).status === 404);
  check("Owner deletes account report", (await request(`/api/my-reports/${accountId}`, { method: "DELETE", body: {}, session: owner })).data?.deleted === true);
  check("Guest deletes report using the matching receipt", (await request(`/api/my-reports/${guestId}`, { method: "DELETE", body: { receipt: guest.data.receipt } })).data?.deleted === true);
  for (const path of paths) check("Deleted report proof is removed from storage", !!(await admin.storage.from("report-evidence").info(path)).error);
  check("Deleted report disappears from profile", (await request("/api/my-reports", { method: "GET", session: owner })).data?.reports?.length === 0);
  await admin.from("driver_lookup_attempts").insert(Array.from({ length: 20 }, () => ({ clerk_user_id: users[0].id }))).throwOnError();
  check("Daily driver-search quota is enforced through API", (await request("/api/drivers/search", { body: { method: "phone", value: "000000000" }, session: owner })).status === 429);
  console.log(`${passed} API checks passed.`);
} finally {
  // Only IDs generated by this run are eligible for cleanup.
  if (paths.length) await admin.storage.from("report-evidence").remove(paths).then(({ error }) => { if (error) throw error; });
  if (reportIds.length) {
    await admin.from("ride_reports").delete().in("id", reportIds).throwOnError();
    await admin.from("report_deletion_jobs").delete().in("report_id", reportIds).throwOnError();
  }
  if (users.length) await admin.from("driver_lookup_attempts").delete().in("clerk_user_id", users.map((user) => user.id)).throwOnError();
  for (const user of users) await clerk.users.deleteUser(user.id);
  console.log("Temporary QA users, reports, files, and lookup attempts cleaned up.");
}
