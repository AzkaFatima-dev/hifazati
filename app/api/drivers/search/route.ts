import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { normalizeDriverName, normalizeDriverPhone } from "../../../lib/driver-lookup";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";
import { readJsonObject } from "../../../lib/api-request";

export const runtime = "nodejs";

function reply(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return reply({ error: "Log in to search reviewed reports." }, 401);

  const parsed = await readJsonObject(request, 1024);
  if (parsed.response) return parsed.response;
  const { method, value } = parsed.data;
  if (typeof value !== "string") return reply({ error: "Enter a search value." }, 400);

  let column: "driver_phone_key" | "driver_name_key" | "driver_photo_sha256";
  let key: string;
  if (method === "phone") {
    const trimmed = value.trim();
    if (!/^[+0-9() -]{9,24}$/.test(trimmed) || !/^\d{9,15}$/.test(trimmed.replace(/\D/g, ""))) {
      return reply({ error: "Enter a valid driver phone number." }, 400);
    }
    column = "driver_phone_key";
    key = normalizeDriverPhone(trimmed);
  } else if (method === "name") {
    key = normalizeDriverName(value);
    if (key.length < 2 || key.length > 100 || /[\u0000-\u001f\u007f]/u.test(key)) {
      return reply({ error: "Enter the driver's name as shown by the ride service." }, 400);
    }
    column = "driver_name_key";
  } else if (method === "photo") {
    if (!/^[0-9a-f]{64}$/i.test(value)) return reply({ error: "Choose a valid photo." }, 400);
    column = "driver_photo_sha256";
    key = value.toLowerCase();
  } else {
    return reply({ error: "Choose phone, name, or photo search." }, 400);
  }

  const admin = getSupabaseAdmin();
  if (!admin) return reply({ error: "Search is temporarily unavailable." }, 503);
  const { data: allowed, error: limitError } = await admin.rpc("reserve_driver_lookup", { p_user_id: userId });
  if (limitError) return reply({ error: "Search is temporarily unavailable." }, 503);
  if (!allowed) return reply({ error: "You have reached the daily limit of 20 searches. Try again tomorrow." }, 429);

  const { count, error } = await admin.from("ride_reports")
    .select("id", { count: "exact", head: true })
    .eq("review_status", "reviewed")
    .eq(column, key);
  if (error) return reply({ error: "Search is temporarily unavailable." }, 503);
  return reply({ count: count ?? 0, method }, 200);
}
