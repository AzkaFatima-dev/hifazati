export const providers = ["inDrive", "Yango", "Bykea", "Uber", "Careem", "Other"] as const;
export type Provider = (typeof providers)[number];

export const issues = [
  "Harassment",
  "Fraud or scam",
  "Unsafe driving",
  "Route concern",
  "Fare or payment",
  "Unprofessional conduct",
  "Other",
] as const;

export const areas = ["Gulberg", "DHA", "Johar Town", "Model Town", "Cantt", "Walled City", "Other Lahore"] as const;

export const evidenceBucket = "report-evidence";
export const maxEvidenceFiles = 3;
export const maxEvidenceBytes = 20 * 1024 * 1024;
export const maxDriverPhotoBytes = 8 * 1024 * 1024;

export const evidenceTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
  "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/x-wav", "audio/ogg", "audio/webm",
  "video/mp4", "video/webm", "video/quicktime", "application/pdf",
]);
export const driverPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export const extensionByType: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif",
  "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/wav": "wav", "audio/x-wav": "wav", "audio/ogg": "ogg", "audio/webm": "webm",
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov", "application/pdf": "pdf",
};
