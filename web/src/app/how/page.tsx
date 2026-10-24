import type { Metadata } from "next";
import Link from "next/link";
import { addresses, schemaUID } from "@/lib/contracts";
import { codeUrl, easSchemaUrl } from "@/lib/chain";

export const metadata: Metadata = { title: "How it works" };

const LIFECYCLE = [
  ["Joining", "Members join with one contribution as a security deposit (optionally prepaying rounds). At most 20 members; invite-only."],
  ["Drawing", "When the last seat fills, the organiser reveals a secret they committed to before anyone joined. Mixed with the next block's hash, it shuffles the order — highest reputation tier first, newcomers last. If the organiser stalls, anyone can draw from a later block."],
  ["Active", "Each round everyone pays in. The last payment sends the whole pot to that round's member in the same transaction. After the deadline plus grace, anyone can settle: unpaid members are covered from their deposit and a missed payment is recorded."],
  ["Completed", "After the last round, every remaining deposit goes back to its member automatically, and members without a shortfall get a completed circle on their Passport."],
];

const THREATS = [
  ["Organiser theft", "Impossible: there is no owner, admin, upgrade, pause or withdraw function. organiserWithdraw() exists only to revert."],
  ["Made-up members", "Every seat needs a funded deposit, and the checker counts members with zero deposit."],
  ["Collect early, then default", "Newcomers take the last slots; early slots go to members with a record. Deposits cover a missed round, and every miss is a public attestation."],
  ["Order manipulation", "Commit-reveal with the hash of the block after the circle filled; reveal expires after 256 blocks; fallback draw after a timeout."],
  ["Reentrancy", "Every state-changing function is nonReentrant; state is updated before transfers; only allowlisted tokens."],
  ["Griefing settle", "settleRound only works when the round is genuinely due; a blocked recipient is credited to claim later rather than freezing the circle."],
  ["Lost phone", "Passkeys sync through the phone's keychain. Roadmap: circle members as 2-of-3 guardians."],
  ["Privacy", "Names and avatars stay on the device and in invite links. The Passport shows counts only. Amounts are visible on-chain, not linked to identities."],
  ["Demo server keys", "Testnet only, rate-limited, and they can only create demo circles. They hold no special power over any circle."],
];

const LIMITS = [
  "A legal opinion per country is needed before any real pilot.",
  "Cash-out to pesos, ringgit or rupiah needs a licensed off-ramp partner, which requires KYC.",
  "Amounts are visible on-chain, though not linked to identities.",
  "Commit-reveal is weaker than verifiable randomness (Chainlink VRF is on the roadmap).",
  "A member can still default after collecting their pot. The deposit, tiering and public attestations reduce this but cannot eliminate it.",
  "Coinbase Smart Wallet reuses one account per passkey, so members don't yet get a fresh account per circle.",
  "Without a paymaster, the demo server drips a little test ETH to new wallets for gas.",
];

export default function HowPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-14">
      <header>
        <p className="eyebrow">How it works</p>
        <h1 className="font-display mt-2 text-4xl font-semibold sm:text-5xl">A paluwagan with no one in the middle</h1>
        <p className="mt-4 text-lg text-ink-soft">
          Giliran keeps the shape of the rotating savings circle people already trust — same members, same pot, same turns
          — and moves the one risky part, holding the money, into a contract nobody controls.
        </p>
      </header>

      <section aria-labelledby="life">
        <h2 id="life" className="font-display text-3xl font-semibold">
          Life of a circle
        </h2>
        <ol className="mt-5 space-y-3">
          {LIFECYCLE.map(([k, v], i) => (
            <li key={k} className="mat-card flex gap-4 p-5">
              <span className="font-display tabular text-3xl font-semibold text-marigold-deep">{i + 1}</span>
              <div>
                <p className="font-bold">{k}</p>
                <p className="mt-1 text-ink-soft">{v}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="legal">
        <h2 id="legal" className="font-display text-3xl font-semibold">
          Legal by design
        </h2>
        <p className="mt-3 text-ink-soft">
          Singapore&apos;s Chit Funds Act and Malaysia&apos;s Kootu Funds (Prohibition) Act draw the line at fees, profit and
          public promotion. So the contract enforces: a hard-coded 0% organiser fee; payouts that can never exceed what
          members paid in; invite-only circles with no public directory; at most 20 members. A legal opinion per country
          is still required before any real pilot.
        </p>
      </section>

      <section aria-labelledby="web3">
        <h2 id="web3" className="font-display text-3xl font-semibold">
          What each piece does
        </h2>
        <dl className="mt-5 divide-y divide-sand rounded-2xl border border-sand">
          {[
            ["Circle contract", "Holds the pot and enforces every rule."],
            ["CircleFactory", "Deploys circles and vouches for them (isCircle)."],
            ["SavingsRegistry", "The Passport: counts per member, writable only by factory circles."],
            ["EAS attestations", "A portable, verifiable record of each payment outcome."],
            ["Passkey smart wallet", "Sign in with Face ID or fingerprint; batch approve + pay in one tap."],
            ["Paymaster (optional)", "Sponsors gas so members never buy ETH."],
            ["Token", "None. Circles use stablecoins (test USDC here)."],
          ].map(([k, v]) => (
            <div key={k} className="grid gap-1 p-4 sm:grid-cols-[200px_1fr]">
              <dt className="font-semibold">{k}</dt>
              <dd className="text-ink-soft">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm">
          <a className="link" href={codeUrl(addresses.factory)} target="_blank" rel="noreferrer">
            Factory source ↗
          </a>{" "}
          ·{" "}
          <a className="link" href={codeUrl(addresses.registry)} target="_blank" rel="noreferrer">
            Registry source ↗
          </a>{" "}
          ·{" "}
          <a className="link" href={easSchemaUrl(schemaUID)} target="_blank" rel="noreferrer">
            EAS schema ↗
          </a>
        </p>
      </section>

      <section aria-labelledby="threats">
        <h2 id="threats" className="font-display text-3xl font-semibold">
          Threat model, in short
        </h2>
        <ul className="mt-5 space-y-2">
          {THREATS.map(([k, v]) => (
            <li key={k} className="rounded-2xl border border-sand p-4">
              <p className="font-semibold">{k}</p>
              <p className="mt-1 text-ink-soft">{v}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="limits">
        <h2 id="limits" className="font-display text-3xl font-semibold">
          Limitations, honestly
        </h2>
        <ul className="mt-5 list-disc space-y-2 pl-5 text-ink-soft">
          {LIMITS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="prior">
        <h2 id="prior" className="font-display text-3xl font-semibold">
          Prior work
        </h2>
        <p className="mt-3 text-ink-soft">
          WeTrust (2017) put lending circles on Ethereum and proved people would use them, but required crypto wallets
          and its own token. Giliran builds on that idea with passkeys, sponsored gas, no token, reputation-tiered order,
          zero-fee rules in code and the Savings Passport.
        </p>
        <Link href="/demo" className="btn btn-accent mt-6">
          Try it live →
        </Link>
      </section>
    </article>
  );
}
