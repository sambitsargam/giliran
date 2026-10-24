import { NextResponse } from "next/server";
import { createDemoCircle } from "@/server/demo";
import { fail, limit, readAddress } from "@/server/http";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Creates a fresh demo circle (always demo: true) and seats four prepaid bots. */
export async function POST(req: Request) {
  const limited = await limit(req, "demo-new", 5, 60 * 60);
  if (limited) return limited;
  const judge = await readAddress(req, "member");
  try {
    const out = await createDemoCircle(judge ?? undefined);
    return NextResponse.json(out);
  } catch (e) {
    return fail(e);
  }
}
