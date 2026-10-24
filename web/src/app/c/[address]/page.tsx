import type { Metadata } from "next";
import Link from "next/link";
import { CircleRoom } from "@/components/circle/CircleRoom";
import { ShareInvite } from "@/components/circle/ShareInvite";

export const metadata: Metadata = { title: "Circle room", robots: { index: false } };

export default async function CirclePage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Circle room</p>
          <h1 className="font-display mt-1 text-3xl font-semibold sm:text-4xl">The woven ring</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <ShareInvite address={address} />
          <Link className="btn btn-ghost" href={`/check?address=${address}`}>
            Run the checker
          </Link>
        </div>
      </div>
      <CircleRoom address={address} />
    </div>
  );
}
