export function privateJson(body: Record<string, unknown>, status = 200, extraHeaders: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store", ...extraHeaders } });
}

// Bound bytes while reading, rather than checking after buffering an arbitrary body.
export async function readJsonObject(request: Request, maxBytes = 16_384): Promise<
  { data: Record<string, unknown>; response?: never } | { response: Response; data?: never }
> {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") {
    return { response: privateJson({ error: "Send this request from Hifazati." }, 403) };
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return { response: privateJson({ error: "Send a JSON request." }, 415) };
  }
  const tooLarge = () => ({ response: privateJson({ error: "Request is too large." }, 413) });
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) return tooLarge();
  const reader = request.body?.getReader();
  if (!reader) return { response: privateJson({ error: "Invalid request." }, 400) };
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) { await reader.cancel(); return tooLarge(); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const data: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Not an object");
    return { data: data as Record<string, unknown> };
  } catch {
    return { response: privateJson({ error: "Invalid request." }, 400) };
  } finally { reader.releaseLock(); }
}
