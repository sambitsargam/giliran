import Link from "next/link";
import { CASES, OFW_SOURCE } from "@/lib/sources";
import { HeroRing } from "@/components/HeroRing";

const STEPS = [
  {
    n: "1",
    title: "Join with your phone",
    body: "Face ID or fingerprint creates your wallet. No seed phrase, no app to install, no gas to buy.",
  },
  {
    n: "2",
    title: "The contract holds the pot",
    body: "Everyone pays in each round. The moment the last payment lands, the whole pot goes to that round's member — automatically.",
  },
  {
    n: "3",
    title: "Your discipline becomes a record",
    body: "Every on-time payment stamps your Savings Passport, an on-chain record a lender can check.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-20 sm:gap-28">
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="eyebrow">Paluwagan · Arisan · Kutu · Chit · Susu · Tanda</p>
          <h1 className="font-display mt-4 text-[2.6rem] font-semibold leading-[1.02] sm:text-6xl">
            Savings circles nobody can run away with.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-soft">
            Giliran — “your turn” in Malay and Indonesian — is a rotating savings circle where a smart contract
            holds the pot instead of an organiser. Join with a passkey. Every on-time payment builds a portable
            Savings Passport.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/demo" className="btn btn-accent text-base !px-6">
              Start the 3-minute demo →
            </Link>
            <Link href="/circle/new" className="btn btn-ghost text-base !px-6">
              Create a circle
            </Link>
          </div>
          <p className="mt-4 text-sm text-ink-soft">Runs on Base Sepolia testnet with test money. No token, ever.</p>
        </div>
        <HeroRing />
      </section>

      <section aria-labelledby="how-heading">
        <h2 id="how-heading" className="font-display text-3xl font-semibold sm:text-4xl">
          How it works
        </h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="mat-card relative overflow-hidden p-6">
              <span className="font-display tabular text-5xl font-semibold text-marigold-deep" aria-hidden>
                {s.n}
              </span>
              <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-ink-soft">{s.body}</p>
              <div className="weave absolute inset-x-0 bottom-0 h-1.5" aria-hidden />
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="problem-heading" className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="eyebrow">The problem</p>
          <h2 id="problem-heading" className="font-display mt-3 text-3xl font-semibold sm:text-4xl">
            The organiser holds the money, so the organiser is the single point of failure.
          </h2>
          <ul className="mt-6 space-y-4 text-ink-soft">
            <li>
              <strong className="text-ink">No credit for discipline.</strong> Years of saving on time leave no record
              at any lender.
            </li>
            <li>
              <strong className="text-ink">No shared savings pool across borders.</strong> Circles of overseas workers
              span Singapore, Hong Kong, Dubai and home.
            </li>
            <li>
              <strong className="text-ink">Built for the people already doing this.</strong> 2.19 million overseas
              Filipino workers in 2024, 57% of them women (
              <a className="link" href={OFW_SOURCE.url} target="_blank" rel="noreferrer">
                {OFW_SOURCE.label}
              </a>
              ).
            </li>
          </ul>
        </div>
        <ul className="grid gap-4">
          {CASES.map((c) => (
            <li key={c.place} className="mat-card flex gap-4 p-5">
              <div className="w-1.5 shrink-0 rounded-full bg-terracotta" aria-hidden />
              <div>
                <p className="eyebrow">
                  {c.place} · {c.when}
                </p>
                <p className="font-display mt-1 text-xl font-semibold">{c.headline}</p>
                <p className="mt-1 text-ink-soft">{c.detail}</p>
                <p className="mt-2 text-sm">
                  Sources:{" "}
                  {c.sources.map((s, i) => (
                    <span key={s.url}>
                      {i > 0 && " · "}
                      <a className="link" href={s.url} target="_blank" rel="noreferrer">
                        {s.label}
                      </a>
                    </span>
                  ))}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="rules-heading" className="weave rounded-[var(--radius-mat)] p-1.5">
        <div className="rounded-[calc(var(--radius-mat)-4px)] bg-surface p-6 sm:p-10">
          <p className="eyebrow">Legal by design</p>
          <h2 id="rules-heading" className="font-display mt-3 text-3xl font-semibold">
            The rules chit-fund law cares about are written into the contract.
          </h2>
          <dl className="mt-6 grid gap-4 sm:grid-cols-4">
            {[
              ["0%", "Organiser fee — a hard-coded constant"],
              ["0%", "Returns — payouts can never exceed what members paid in"],
              ["Invite-only", "No public listing or directory of circles"],
              ["≤ 20", "Members per circle"],
            ].map(([k, v]) => (
              <div key={v} className="rounded-2xl border border-sand p-4">
                <dt className="font-display tabular text-3xl font-semibold">{k}</dt>
                <dd className="mt-1 text-sm text-ink-soft">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-sm text-ink-soft">
            Singapore&apos;s Chit Funds Act and Malaysia&apos;s Kootu Funds (Prohibition) Act draw the line at fees,
            profit and public promotion. A legal opinion per country is still required before any real pilot.
          </p>
        </div>
      </section>

      <section aria-labelledby="prior-heading" className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="eyebrow">What&apos;s different from 2017</p>
          <h2 id="prior-heading" className="font-display mt-3 text-3xl font-semibold">
            Credit where it&apos;s due.
          </h2>
        </div>
        <div className="text-ink-soft">
          <p>
            <strong className="text-ink">WeTrust</strong> put lending circles on Ethereum in 2017. It showed the idea
            works, but asked members to hold crypto wallets and its own token.
          </p>
          <p className="mt-3">
            Giliran uses phone passkeys and sponsored gas, has no token, sets payout order by reputation so newcomers
            can&apos;t default on anyone, enforces zero-fee rules in code, and adds the Savings Passport.
          </p>
          <Link href="/how" className="link mt-4 inline-block font-semibold text-ink">
            Read how it works, the threat model and limitations →
          </Link>
        </div>
      </section>
    </div>
  );
}
