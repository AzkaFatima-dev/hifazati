const storageKey = "hifazati-private-report-receipts";
export const receiptPattern = /^([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([0-9a-f]{64})$/i;

export function getGuestReceipts(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(saved) ? saved.filter((value): value is string => typeof value === "string" && receiptPattern.test(value)).slice(0, 20) : [];
  } catch { return []; }
}

export function saveGuestReceipt(receipt: string) {
  if (!receiptPattern.test(receipt)) return;
  try {
    const saved = [receipt, ...getGuestReceipts().filter((value) => value !== receipt)].slice(0, 20);
    localStorage.setItem(storageKey, JSON.stringify(saved));
  } catch { /* The receipt is still shown to the rider for manual saving. */ }
}

export function forgetGuestReceipt(receipt: string) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(getGuestReceipts().filter((value) => value !== receipt)));
  } catch { /* Storage may be unavailable in private browsing. */ }
}
