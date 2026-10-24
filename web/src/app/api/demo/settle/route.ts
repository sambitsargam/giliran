import { NextResponse } from "next/server";
import { settleDemo } from "@/server/demo";
import { fail, limit, readAddress } from "@/server/http";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const limited = await limit(req, "demo-settle", 120, 60 * 60);
  if (limited) return limited;
  const circle = await readAddress(req, "circle");
  if (!circle) return NextResponse.json({ error: "circle address required" }, { status: 400 });
  try {
    return NextResponse.json(await settleDemo(circle));
  } catch (e) {
    return fail(e, 400);
  }
}
