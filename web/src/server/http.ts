import "server-only";
import { NextResponse } from "next/server";
import { isAddress, getAddress, type Address } from "viem";
import { kvIncr } from "./store";

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] || req.headers.get("x-real-ip") || "local").trim();
}

/** Fixed-window limit per IP and bucket. Returns a 429 response when exceeded. */
export async function limit(req: Request, bucket: string, max: number, windowSeconds: number) {
  const n = await kvIncr(`rl:${bucket}:${clientIp(req)}`, windowSeconds);
  if (n > max) {
    return NextResponse.json(
      { error: `Rate limit: ${max} per ${Math.round(windowSeconds / 60)} minutes. Try again later.` },
      { status: 429 },
    );
  }
  return null;
}

export async function readAddress(req: Request, field: string): Promise<Address | null> {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const v = body[field];
    return typeof v === "string" && isAddress(v) ? getAddress(v) : null;
  } catch {
    return null;
  }
}

export function fail(err: unknown, status = 500) {
  const msg = err instanceof Error ? err.message.split("\n")[0] : "Unexpected error";
  return NextResponse.json({ error: msg.slice(0, 300) }, { status });
}
