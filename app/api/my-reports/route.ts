import { createHash } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../lib/supabase-admin";

export const runtime = "nodejs";

const fields = "id,provider,provider_other,issue_type,area,trip_month,details,driver_name,driver_contact,review_status,created_at";
const receiptPattern = /^([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([0-9a-f]{64})$/i;

function reply(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET() {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return reply({ error: "Log in to see reports linked to your account." }, 401);
  const admin = getSupabaseAdmin();
  if (!admin) return reply({ error: "Reports are temporarily unavailable." }, 503);
  const { data, error } = await admin.from("ride_reports").select(fields)
    .eq("owner_user_id", userId).order("created_at", { ascending: false }).limit(100);
  if (error) return reply({ error: "Could not load your reports." }, 503);
  return reply({ reports: data ?? [] }, 200);
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 4096) return reply({ error: "Too many receipts." }, 400);
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return reply({ error: "Invalid receipt request." }, 400); }
  const receipts = input && typeof input === "object" ? (input as Record<string, unknown>).receipts : null;
  if (!Array.isArray(receipts) || receipts.length > 20 || !receipts.every((item) => typeof item === "string")) {
    return reply({ error: "Send up to 20 private receipts." }, 400);
  }
  const hashToId = new Map<string, string>();
  for (const receipt of receipts as string[]) {
    const match = receiptPattern.exec(receipt);
    if (!match) continue;
    hashToId.set(createHash("sha256").update(match[2].toLowerCase()).digest("hex"), match[1].toLowerCase());
  }
  if (hashToId.size === 0) return reply({ reports: [] }, 200);
  const admin = getSupabaseAdmin();
  if (!admin) return reply({ error: "Reports are temporarily unavailable." }, 503);
  const { data, error } = await admin.from("ride_reports")
    .select(`${fields},manage_token_hash`)
    .is("owner_user_id", null)
    .in("manage_token_hash", [...hashToId.keys()])
    .order("created_at", { ascending: false });
  if (error) return reply({ error: "Could not load your anonymous reports." }, 503);
  const reports = (data ?? []).filter((row) => hashToId.get(row.manage_token_hash) === row.id.toLowerCase())
    .map(({ manage_token_hash: secret, ...report }) => { void secret; return report; });
  return reply({ reports }, 200);
}
