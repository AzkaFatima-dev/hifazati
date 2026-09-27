export function normalizeDriverPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return `92${digits.slice(1)}`;
  if (digits.length === 14 && digits.startsWith("0092")) return digits.slice(2);
  return digits;
}

export function normalizeDriverName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("en");
}
