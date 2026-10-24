import { addressUrl, codeUrl } from "@/lib/chain";
import { addresses } from "@/lib/contracts";
import { formatMoney } from "@/lib/format";
import type { CircleData } from "@/lib/useCircle";

/** "Rules locked on-chain": the values a member should be able to check before paying in. */
export function TrustPanel({ d }: { d: CircleData }) {
  const rows: { k: string; v: string; ok: boolean }[] = [
    { k: "Organiser fee", v: `${Number(d.feeBps) / 100}%`, ok: d.feeBps === 0n },
    { k: "Promised return", v: `${Number(d.promisedReturnBps) / 100}%`, ok: d.promisedReturnBps === 0n },
    {
      k: "Pot per round",
      v: `${formatMoney(d.payoutPerRound, d.decimals)} ${d.symbol} = contributions only`,
      ok: d.payoutPerRound === d.contribution * BigInt(d.memberCap),
    },
    { k: "Deposit per member", v: `${formatMoney(d.contribution, d.decimals)} ${d.symbol}, returned at the end`, ok: true },
    { k: "Who can withdraw", v: "Nobody. No owner, no admin, no withdraw path", ok: true },
    { k: "Listing", v: "Invite-only. No public directory", ok: true },
  ];
  return (
    <section className="mat-card overflow-hidden" aria-labelledby="trust-heading">
      <div className="weave h-2" aria-hidden />
      <div className="p-5">
        <h3 id="trust-heading" className="font-display text-xl font-semibold">
          Rules locked on-chain
        </h3>
        <ul className="mt-3 divide-y divide-sand">
          {rows.map((r) => (
            <li key={r.k} className="flex items-start gap-3 py-2.5">
              <span
                aria-hidden
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black ${
                  r.ok ? "bg-pandan text-white" : "bg-terracotta text-white"
                }`}
              >
                {r.ok ? "✓" : "!"}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{r.k}</p>
                <p className="text-sm text-ink-soft tabular">
                  <span className="sr-only">{r.ok ? "Passes: " : "Fails: "}</span>
                  {r.v}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <a className="link font-semibold" href={addressUrl(d.address)} target="_blank" rel="noreferrer">
            This circle on BaseScan ↗
          </a>
          <a className="link font-semibold" href={codeUrl(addresses.factory)} target="_blank" rel="noreferrer">
            Verified factory source ↗
          </a>
        </div>
      </div>
    </section>
  );
}
