"use client";

import Link from "next/link";
import { evaluateCircle } from "@/lib/checker";
import { addresses } from "@/lib/contracts";
import { PassportCard } from "../PassportCard";
import { Ribbon } from "../Checker";

const sampleChecks = evaluateCircle({
  isContract: true,
  isGiliran: false,
  feeBps: 500n,
  promisedReturnBps: 2000n,
  payoutPerRound: 120_000_000n,
  contribution: 10_000_000n,
  memberCap: 10n,
  members: Array.from({ length: 10 }, (_, i) => `0x${String(i).padStart(40, "0")}` as `0x${string}`),
  deposits: [10n, 10n, 10n, 0n, 0n, 0n, 0n, 0n, 0n, 0n],
  owner: "0x4C92BF08f4672E974dE4dc01806150a977853BfE",
}).filter((r) => r.id !== "factory" && r.id !== "payout");

export function ProofPreviews() {
  return (
    <section aria-labelledby="proof-heading">
      <p className="eyebrow">Proof, not promises</p>
      <h2 id="proof-heading" className="font-display mt-3 max-w-3xl text-3xl font-semibold sm:text-5xl">
        Two things a scammer can&apos;t fake.
      </h2>
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="text-lg font-bold">A checker anyone can run before paying in</h3>
          <p className="mt-1 text-ink-soft">
            It reads the contract, not the website. Here&apos;s what it says about a fake circle we deployed as a teaching
            example.
          </p>
          <ul className="mt-5 space-y-3">
            {sampleChecks.map((r, i) => (
              <Ribbon key={r.id} r={r} index={i} />
            ))}
          </ul>
          <Link href={`/check?address=${addresses.fake}`} className="btn btn-ghost mt-5">
            Run it on the live fake circle →
          </Link>
        </div>
        <div>
          <h3 className="text-lg font-bold">A Savings Passport lenders can verify</h3>
          <p className="mt-1 text-ink-soft">
            Each round writes an attestation on EAS. Counts only — no amounts, no names, no circle lists.
          </p>
          <div className="mt-5 lg:rotate-[-1.2deg]">
            <PassportCard
              sample
              address="0x7d94d2A65ccA20c365cC14f6281426C3b4520B25"
              p={{ onTime: 14, late: 1, missed: 0, completed: 2, joined: 3, firstSeen: 1761264000, tier: 2 }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
