import { getRuntimeEnv } from "@/lib/runtime-env";

function toHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function hashIdentity(scope: string, identity: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${scope}:${identity}`)));
}

export async function consumeRateLimit(scope: string, identity: string, limit: number, windowMs: number) {
  const runtime = getRuntimeEnv();
  if (!runtime.DB || !runtime.RATE_LIMIT_SECRET || !identity) return false;
  const now = Date.now();
  const windowStartedAt = Math.floor(now / windowMs) * windowMs;
  const identityHash = await hashIdentity(scope, identity, runtime.RATE_LIMIT_SECRET);
  const id = `${scope}:${identityHash}:${windowStartedAt}`;
  await runtime.DB.prepare("DELETE FROM rate_limits WHERE expires_at < ?").bind(now).run();
  await runtime.DB.prepare(
    "INSERT INTO rate_limits (id, scope, identity_hash, window_started_at, count, expires_at) VALUES (?, ?, ?, ?, 1, ?) ON CONFLICT(id) DO UPDATE SET count = count + 1",
  ).bind(id, scope, identityHash, windowStartedAt, windowStartedAt + windowMs * 2).run();
  const row = await runtime.DB.prepare("SELECT count FROM rate_limits WHERE id = ?").bind(id).first<{ count: number }>();
  return Number(row?.count ?? limit + 1) <= limit;
}

export function requestNetworkIdentity(request: Request) {
  // Cloudflare supplies this header at the trusted dispatch boundary. An
  // arbitrary X-Forwarded-For must never create a fresh rate-limit identity.
  return request.headers.get("cf-connecting-ip")?.trim() || "";
}
