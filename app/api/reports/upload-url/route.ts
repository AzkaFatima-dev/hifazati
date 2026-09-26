import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  driverPhotoTypes, evidenceBucket, evidenceTypes, extensionByType,
  maxDriverPhotoBytes, maxEvidenceBytes,
} from "../../../lib/report-options";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Reporting is temporarily unavailable." }, { status: 503 });

  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!input || typeof input !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { reportId, kind, contentType, size } = input as Record<string, unknown>;
  const isEvidence = kind === "evidence";
  const isDriverPhoto = kind === "driver-photo";
  if (typeof reportId !== "string" || !uuidPattern.test(reportId) || (!isEvidence && !isDriverPhoto) ||
      typeof contentType !== "string" || !((isEvidence ? evidenceTypes : driverPhotoTypes).has(contentType)) ||
      typeof size !== "number" || !Number.isInteger(size) || size < 1 ||
      size > (isEvidence ? maxEvidenceBytes : maxDriverPhotoBytes)) {
    return NextResponse.json({ error: "Choose a supported file within the size limit." }, { status: 400 });
  }

  const path = `${reportId}/${kind}-${randomUUID()}.${extensionByType[contentType]}`;
  const { data, error } = await admin.storage.from(evidenceBucket).createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: "Could not prepare the private upload." }, { status: 503 });
  return NextResponse.json({ path, token: data.token });
}
