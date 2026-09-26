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

// Suggestions only: riders can enter any Lahore area that is not listed.
export const areas = [
  "Allama Iqbal Town", "Anarkali", "Awan Town", "Aziz Bhatti", "Badami Bagh",
  "Baghbanpura", "Bahria Orchard", "Bahria Town", "Bedian", "Barki",
  "Canal View", "Cantt", "Cavalry Ground", "Central Park", "Chung",
  "Chungi Amar Sidhu", "DHA", "DHA Phase 1", "DHA Phase 2", "DHA Phase 3",
  "DHA Phase 4", "DHA Phase 5", "DHA Phase 6", "DHA Phase 7", "DHA Phase 8",
  "DHA Phase 9", "Dharampura", "Eden", "EME Society", "Faisal Town",
  "Ferozepur Road", "Gajju Matta", "Garden Town", "Garhi Shahu", "Gawalmandi",
  "Ghaziabad", "Green Town", "Gulberg", "Gulberg 1", "Gulberg 2", "Gulberg 3",
  "Gulberg 4", "Gulberg 5", "Gulshan-e-Ravi", "Hanjarwal", "Harbanspura",
  "Ichhra", "Islampura", "Izmir Town", "Jallo", "Johar Town",
  "Kahna", "Kot Lakhpat", "Lake City", "LDA Avenue", "Liberty Market",
  "Mall Road", "Manga", "Manawan", "Marghazar Colony", "Model Town",
  "Mozang", "Mughalpura", "Muslim Town", "Mustafa Town", "Nishtar Colony",
  "Old Anarkali", "PIA Society", "Qila Gujjar Singh", "Raiwind", "Ravi Road",
  "Rewaz Garden", "Sabzazar", "Samanabad", "Shadbagh", "Shadman",
  "Shahdara", "Shalimar", "Thokar Niaz Baig", "Township", "Valencia Town",
  "Walled City", "Wapda Town", "Wahga", "Youhanabad",
] as const;

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
