import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import {
  driverPhotoTypes, evidenceBucket, evidenceTypes, issues,
  maxDriverPhotoBytes, maxEvidenceBytes, maxEvidenceFiles, providers,
} from "../../lib/report-options";
import { getSupabaseAdmin } from "../../lib/supabase-admin";
import { normalizeDriverName, normalizeDriverPhone } from "../../lib/driver-lookup";

export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const pathPattern = /^([0-9a-f-]{36})\/(evidence|driver-photo)-([0-9a-f-]{36})\.([a-z0-9]+)$/i;

function isChoice<T extends string>(value: unknown, choices: readonly T[]): value is T {
  return typeof value === "string" && choices.includes(value as T);
}

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Reporting is temporarily unavailable." }, { status: 503 });

  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!input || typeof input !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const data = input as Record<string, unknown>;
  const reportId = data.reportId;
  const providerOther = typeof data.providerOther === "string" ? data.providerOther.trim() : "";
  const driverContact = typeof data.driverContact === "string" ? data.driverContact.trim() : "";
  const driverName = typeof data.driverName === "string" ? data.driverName.trim().replace(/\s+/gu, " ") : "";
  const details = typeof data.details === "string" ? data.details.trim() : "";
  const area = typeof data.area === "string" ? data.area.trim().replace(/\s+/g, " ") : "";
  const evidencePaths = data.evidencePaths;
  const driverPhotoPath = data.driverPhotoPath;
  const month = typeof data.tripMonth === "string" ? data.tripMonth.trim() : "";

  if (typeof reportId !== "string" || !uuidPattern.test(reportId) ||
      !isChoice(data.provider, providers) || !isChoice(data.issueType, issues) ||
      area.length < 2 || area.length > 80 || !/[\p{L}\p{N}]/u.test(area) || /[\u0000-\u001f\u007f]/u.test(area) ||
      (data.provider === "Other" && (providerOther.length < 3 || providerOther.length > 160)) ||
      !/^[+0-9() -]{9,24}$/.test(driverContact) ||
      !/^\d{9,15}$/.test(driverContact.replace(/\D/g, "")) ||
      driverName.length < 2 || driverName.length > 100 || /[\u0000-\u001f\u007f]/u.test(driverName) ||
      details.length < 1 || details.length > 2000 ||
      (month !== "" && (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) ||
        `${month}-01` > new Date().toISOString().slice(0, 10))) ||
      !Array.isArray(evidencePaths) || evidencePaths.length < 1 || evidencePaths.length > maxEvidenceFiles ||
      !evidencePaths.every((path) => typeof path === "string") ||
      (driverPhotoPath !== null && driverPhotoPath !== undefined && typeof driverPhotoPath !== "string")) {
    return NextResponse.json({ error: "Check the required fields and proof files." }, { status: 400 });
  }

  const paths = [...evidencePaths, ...(driverPhotoPath ? [driverPhotoPath] : [])] as string[];
  if (new Set(paths).size !== paths.length || paths.some((path, index) => {
    const match = pathPattern.exec(path);
    return !match || match[1] !== reportId || !uuidPattern.test(match[3]) ||
      match[2] !== (index < evidencePaths.length ? "evidence" : "driver-photo");
  })) return NextResponse.json({ error: "Invalid proof file reference." }, { status: 400 });

  for (const [index, path] of paths.entries()) {
    const { data: file, error } = await admin.storage.from(evidenceBucket).info(path);
    const allowed = index < evidencePaths.length ? evidenceTypes : driverPhotoTypes;
    const maxBytes = index < evidencePaths.length ? maxEvidenceBytes : maxDriverPhotoBytes;
    if (error || !file || !allowed.has(file.contentType ?? "") || typeof file.size !== "number" || file.size < 1 || file.size > maxBytes) {
      return NextResponse.json({ error: "A proof file is missing or unsupported. Please upload it again." }, { status: 400 });
    }
  }

  let driverPhotoSha256: string | null = null;
  if (driverPhotoPath) {
    const { data: photo, error: photoError } = await admin.storage.from(evidenceBucket).download(driverPhotoPath);
    if (photoError || !photo) return NextResponse.json({ error: "The driver photo could not be checked. Please upload it again." }, { status: 400 });
    driverPhotoSha256 = createHash("sha256").update(Buffer.from(await photo.arrayBuffer())).digest("hex");
  }

  const { error } = await admin.from("ride_reports").insert({
    id: reportId,
    provider: data.provider,
    provider_other: data.provider === "Other" ? providerOther : null,
    issue_type: data.issueType,
    area,
    trip_month: month ? `${month}-01` : null,
    details,
    driver_name: driverName,
    driver_name_key: normalizeDriverName(driverName),
    driver_contact: driverContact,
    driver_phone_key: normalizeDriverPhone(driverContact),
    evidence_paths: evidencePaths,
    driver_photo_path: driverPhotoPath || null,
    driver_photo_sha256: driverPhotoSha256,
  });
  if (error) return NextResponse.json({ error: error.code === "23505" ? "This report was already submitted." : "Could not save the report. Please try again." }, { status: error.code === "23505" ? 409 : 503 });
  return NextResponse.json({ reportId }, { status: 201 });
}
