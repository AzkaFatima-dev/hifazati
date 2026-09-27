import "server-only";
import { createHmac } from "node:crypto";
import { getSupabaseAdmin } from "./supabase-admin";
import { privateJson } from "./api-request";

export async function checkIntakeLimit(request: Request, action: "upload" | "report" | "receipt") {
  const admin = getSupabaseAdmin();
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!admin || !secret) return privateJson({ error: "Reporting is temporarily unavailable." }, 503);
  // Vercel overwrites this header. Never trust arbitrary proxy headers off Vercel.
  const address = process.env.VERCEL === "1"
    ? request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown"
    : "local-development";
  const subject = createHmac("sha256", secret).update(`intake:${address}`).digest("hex");
  const { data: allowed, error } = await admin.rpc("reserve_intake_attempt", { p_subject_hash: subject, p_action: action });
  if (error) return privateJson({ error: "Reporting is temporarily unavailable." }, 503);
  if (!allowed) return privateJson({ error: "Too many requests from this connection. Please try again in an hour." }, 429, { "Retry-After": "3600" });
  return null;
}
