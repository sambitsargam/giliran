import type { Metadata } from "next";
import { Checker } from "@/components/Checker";

export const metadata: Metadata = { title: "Is this a real circle?" };

export default async function CheckPage({ searchParams }: { searchParams: Promise<{ address?: string; real?: string }> }) {
  const { address, real } = await searchParams;
  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow">Before you send money</p>
      <h1 className="font-display mt-2 text-4xl font-semibold sm:text-5xl">Is this a real circle?</h1>
      <p className="mt-3 text-ink-soft">
        Fake online arisan look full, pay early rounds on time and promise returns. Paste an address or invite link and
        we&apos;ll read the contract itself — not its website — and explain each check in plain words.
      </p>
      <div className="mt-8">
        <Checker initial={address} realCircle={real} />
      </div>
    </div>
  );
}
