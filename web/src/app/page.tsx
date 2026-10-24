import Link from "next/link";
import { CASES, OFW_SOURCE } from "@/lib/sources";
import { HeroRing } from "@/components/HeroRing";
import { WhoHolds } from "@/components/landing/WhoHolds";
import { ProofPreviews } from "@/components/landing/ProofPreviews";
import { LogoMark } from "@/components/Logo";

const STEPS = [
  {
    n: "01",
    title: "Join with your phone",
    body: "Face ID or fingerprint creates your wallet. No seed phrase, no app to install, no gas to buy.",
  },
  {
    n: "02",
    title: "The contract holds the pot",
    body: "Everyone pays in each round. The moment the last payment lands, the whole pot goes to that round's member.",
  },
  {
    n: "03",
    title: "Discipline becomes credit",
    body: "Every on-time payment stamps your Savings Passport — a record a lender can check on-chain.",
  },
];

const FIGURES = ["RM1.7M", "₱800M+", "Rp71B"];

export default function Home() {
  return (
    <div className="flex flex-col gap-24 sm:gap-32">
      {/* Hero */}
      <section className="relative grid items-center gap-10 pt-2 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="eyebrow">Paluwagan · Arisan · Kutu · Chit · Susu · Tanda</p>
          <h1 className="font-display mt-5 text-[2.75rem] font-semibold leading-[0.98] tracking-tight sm:text-7xl">
            Savings circles nobody can{" "}
            <span className="relative inline-block">
              <span className="relative z-10">run away</span>
              <span className="weave absolute inset-x-0 bottom-1 -z-0 h-4 rounded-full sm:h-5" aria-hidden />
            </span>{" "}
            with.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft sm:text-xl">
            <strong className="font-semibold text-ink">Giliran</strong> — “your turn” in Malay and Indonesian — keeps the
            pot in a smart contract instead of an organiser&apos;s pocket. Join with a passkey. Every on-time payment
            builds a portable Savings Passport.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/demo" className="btn btn-accent !px-7 !py-3.5 text-base shadow-[0_10px_30px_-12px_var(--marigold)]">
              Try it live →
            </Link>
            <Link href="/circle/new" className="btn btn-primary !px-7 !py-3.5 text-base">
              Start a circle
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-2 text-sm font-semibold" aria-label="Guarantees">
            {["0% organiser fee", "No admin key", "Passkey sign-in", "No token", "Built on Base"].map((c) => (
              <li key={c} className="inline-flex items-center gap-1.5 rounded-full border border-sand-deep bg-surface px-3 py-1.5">
                <span aria-hidden className="text-pandan-ink">✓</span>
                {c}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="absolute inset-4 -z-10 rounded-[40px] bg-surface-2 sm:rotate-3" aria-hidden />
          <div className="weave-soft absolute inset-4 -z-10 rounded-[40px] opacity-70 sm:rotate-3" aria-hidden />
          <div className="p-4 sm:p-8">
            <HeroRing />
          </div>
          <div className="mat-card absolute -left-2 top-6 hidden items-center gap-3 p-3 pr-4 shadow-xl sm:flex" aria-hidden>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-pandan text-white">✓</span>
            <div className="text-sm">
              <p className="font-bold">Pot paid out</p>
              <p className="tabular text-ink-soft">300 S$ → Ate Rosa</p>
            </div>
          </div>
          <div className="mat-card absolute -right-2 bottom-16 hidden items-center gap-3 p-3 pr-4 shadow-xl sm:flex" aria-hidden>
            <span className="grid h-9 w-9 place-items-center rounded-full border-[2.5px] border-dashed border-pandan text-xs font-black text-pandan-ink">
              PAID
            </span>
            <div className="text-sm">
              <p className="font-bold">Passport stamped</p>
              <p className="text-ink-soft">14 on time · 0 missed</p>
            </div>
          </div>
        </div>
      </section>

      {/* Cases */}
      <section aria-labelledby="problem-heading">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-end">
          <div>
            <p className="eyebrow !text-terracotta">Why this exists</p>
            <h2 id="problem-heading" className="font-display mt-3 text-3xl font-semibold sm:text-5xl">
              The organiser holds the money. So the organiser is the single point of failure.
            </h2>
          </div>
          <p className="text-lg text-ink-soft">
            2.19 million overseas Filipino workers in 2024, 57% of them women (
            <a className="link" href={OFW_SOURCE.url} target="_blank" rel="noreferrer">
              {OFW_SOURCE.label}
            </a>
            ), save with friends and family across Singapore, Hong Kong, Dubai and home — with no shared savings pool and
            no credit for years of discipline.
          </p>
        </div>
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {CASES.map((c, i) => (
            <li key={c.place} className="mat-card relative flex flex-col overflow-hidden p-6">
              <div className="ribbon-fail absolute inset-x-0 top-0 h-1.5" aria-hidden />
              <p className="eyebrow">
                {c.place} · {c.when}
              </p>
              <p className="font-display tabular mt-3 text-5xl font-semibold text-terracotta">{FIGURES[i]}</p>
              <p className="mt-2 font-bold">{c.headline}</p>
              <p className="mt-2 flex-1 text-ink-soft">{c.detail}</p>
              <p className="mt-4 text-sm">
                {c.sources.map((s, k) => (
                  <span key={s.url}>
                    {k > 0 && " · "}
                    <a className="link" href={s.url} target="_blank" rel="noreferrer">
                      {s.label} ↗
                    </a>
                  </span>
                ))}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <WhoHolds />

      {/* How it works */}
      <section aria-labelledby="how-heading">
        <p className="eyebrow">How it works</p>
        <h2 id="how-heading" className="font-display mt-3 text-3xl font-semibold sm:text-5xl">
          Same circle you already know. No one in the middle.
        </h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="mat-card relative overflow-hidden p-7">
              <span className="font-display tabular text-6xl font-semibold text-marigold-deep/80" aria-hidden>
                {s.n}
              </span>
              <h3 className="mt-4 text-xl font-bold">{s.title}</h3>
              <p className="mt-2 text-ink-soft">{s.body}</p>
              <div className="weave absolute inset-x-0 bottom-0 h-1.5" aria-hidden />
            </li>
          ))}
        </ol>
        <p className="mt-6 text-ink-soft">
          Newcomers are placed last in the payout order — they save before they collect, so they can&apos;t default on
          anyone. Trusted savers with a record move up.
        </p>
      </section>

      <ProofPreviews />

      {/* Legal by design */}
      <section aria-labelledby="rules-heading" className="weave rounded-[28px] p-1.5">
        <div className="rounded-[24px] bg-surface p-6 sm:p-10">
          <p className="eyebrow">Legal by design</p>
          <h2 id="rules-heading" className="font-display mt-3 max-w-3xl text-3xl font-semibold sm:text-4xl">
            The lines chit-fund law draws are written into the contract.
          </h2>
          <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["0%", "Organiser fee — a hard-coded constant"],
              ["0%", "Returns — payouts never exceed what members paid in"],
              ["Invite", "Only. No public listing or directory of circles"],
              ["≤ 20", "Members per circle"],
            ].map(([k, v]) => (
              <div key={v} className="rounded-2xl border border-sand bg-cream/60 p-5">
                <dt className="font-display tabular text-4xl font-semibold">{k}</dt>
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

      {/* Prior work */}
      <section aria-labelledby="prior-heading" className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <p className="eyebrow">What&apos;s different from 2017</p>
          <h2 id="prior-heading" className="font-display mt-3 text-3xl font-semibold sm:text-4xl">
            Credit where it&apos;s due.
          </h2>
        </div>
        <div className="text-lg text-ink-soft">
          <p>
            <strong className="text-ink">WeTrust</strong> put lending circles on Ethereum in 2017 and showed the idea
            works — but members needed crypto wallets and its own token.
          </p>
          <p className="mt-3">
            Giliran uses phone passkeys and sponsored gas, has no token, orders payouts by reputation, enforces zero-fee
            rules in code, and adds the Savings Passport.
          </p>
          <Link href="/how" className="link mt-4 inline-block font-semibold text-ink">
            How it works, threat model and limitations →
          </Link>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative overflow-hidden rounded-[28px] bg-ink p-8 text-cream sm:p-14">
        <div className="weave absolute inset-0 opacity-20" aria-hidden />
        <div className="relative grid items-center gap-8 md:grid-cols-[auto_1fr_auto]">
          <LogoMark size={72} />
          <div>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">Giliran mo. Your turn.</h2>
            <p className="mt-2 max-w-xl opacity-80">
              Join a live demo circle on Base Sepolia, watch the pot pay out, try to steal it, and leave with a stamped
              Passport.
            </p>
          </div>
          <Link href="/demo" className="btn btn-accent !px-7 !py-3.5 text-base">
            Try it live →
          </Link>
        </div>
      </section>
    </div>
  );
}
