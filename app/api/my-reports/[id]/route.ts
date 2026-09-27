import { createHash } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { evidenceBucket } from "../../../lib/report-options";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const receiptPattern = /^([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([0-9a-f]{64})$/i;

function reply(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidPattern.test(id)) return reply({ error: "Invalid report ID." }, 400);
  const { isAuthenticated, userId } = await auth();

  const raw = await request.text();
  if (raw.length > 256) return reply({ error: "Invalid private receipt." }, 400);
  let receipt: unknown = null;
  if (raw) {
    try { receipt = (JSON.parse(raw) as Record<string, unknown>).receipt; }
    catch { return reply({ error: "Invalid private receipt." }, 400); }
  }
  const match = typeof receipt === "string" ? receiptPattern.exec(receipt) : null;
  const tokenHash = match && match[1].toLowerCase() === id.toLowerCase()
    ? createHash("sha256").update(match[2].toLowerCase()).digest("hex") : null;
  if ((!isAuthenticated || !userId) && !tokenHash) return reply({ error: "Log in or provide the private receipt to delete this report." }, 401);

  const admin = getSupabaseAdmin();
  if (!admin) return reply({ error: "Deletion is temporarily unavailable." }, 503);
  const { data: paths, error } = await admin.rpc("delete_owned_report", {
    p_report_id: id,
    p_owner_user_id: isAuthenticated ? userId : null,
    p_manage_token_hash: tokenHash,
  });
  if (error) return reply({ error: "Could not delete the report. Please try again." }, 503);
  if (!Array.isArray(paths)) return reply({ error: "Report not found for this account or receipt." }, 404);

  if (paths.length > 0) {
    const { error: storageError } = await admin.storage.from(evidenceBucket).remove(paths);
    if (storageError) return reply({ deleted: true, filesPending: true }, 202);
  }
  const { error: cleanupError } = await admin.from("report_deletion_jobs").delete().eq("report_id", id);
  if (cleanupError) return reply({ deleted: true, filesPending: false, cleanupPending: true }, 202);
  return reply({ deleted: true, filesPending: false }, 200);
}
