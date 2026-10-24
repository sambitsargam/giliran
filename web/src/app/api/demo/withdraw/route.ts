import { NextResponse } from "next/server";
import { attemptWithdraw } from "@/server/demo";
import { fail, limit, readAddress } from "@/server/http";

export const runtime = "nodejs";
export const maxDuration = 60;

/** The demo organiser tries organiserWithdraw(); the receipt shows it reverted on-chain. */
export async function POST(req: Request) {
  const limited = await limit(req, "demo-withdraw", 10, 60 * 60);
  if (limited) return limited;
  const circle = await readAddress(req, "circle");
  if (!circle) return NextResponse.json({ error: "circle address required" }, { status: 400 });
  try {
    return NextResponse.json(await attemptWithdraw(circle));
  } catch (e) {
    return fail(e, 400);
  }
}
