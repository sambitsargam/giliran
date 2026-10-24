import "server-only";
import { Redis } from "@upstash/redis";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Upstash / Vercel KV when configured; otherwise per-instance memory (fine for a testnet demo,
// but a cold start forgets demo secrets — the fallback draw still unblocks any stuck circle).
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

type Entry = { value: string; expires: number };
const g = globalThis as unknown as { __giliranMem?: Map<string, Entry> };
const mem = (g.__giliranMem ??= new Map<string, Entry>());

export const storeKind = redis ? "kv" : "memory";

export async function kvSet(key: string, value: string, ttlSeconds: number) {
  if (redis) {
    await redis.set(key, value, { ex: ttlSeconds });
    return;
  }
  mem.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
}

export async function kvGet(key: string): Promise<string | null> {
  if (redis) return (await redis.get<string>(key)) ?? null;
  const e = mem.get(key);
  if (!e) return null;
  if (e.expires < Date.now()) {
    mem.delete(key);
    return null;
  }
  return e.value;
}

/** Fixed-window counter; returns the count after incrementing. */
export async function kvIncr(key: string, windowSeconds: number): Promise<number> {
  if (redis) {
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, windowSeconds);
    return n;
  }
  const e = mem.get(key);
  const now = Date.now();
  if (!e || e.expires < now) {
    mem.set(key, { value: "1", expires: now + windowSeconds * 1000 });
    return 1;
  }
  const n = Number(e.value) + 1;
  e.value = String(n);
  return n;
}

function key32(): Buffer {
  const raw = process.env.DEMO_SECRET_KEY || process.env.DEPLOYER_PRIVATE_KEY || "giliran-dev";
  return createHash("sha256").update(raw).digest();
}

/** AES-256-GCM so demo commit secrets are never stored in the clear. */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key32(), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString("base64")).join(".");
}

export function decrypt(blob: string): string {
  const [iv, tag, body] = blob.split(".").map((s) => Buffer.from(s, "base64"));
  const d = createDecipheriv("aes-256-gcm", key32(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(body), d.final()]).toString("utf8");
}
