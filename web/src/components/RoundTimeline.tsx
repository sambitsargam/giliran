import { txUrl } from "@/lib/chain";
import { formatMoney } from "@/lib/format";
import type { Payout } from "@/lib/useCircle";

type Props = {
  rounds: number;
  currentRound: number;
  completed: boolean;
  recipients: { label: string; emoji?: string }[];
  payouts: Payout[];
  decimals: number;
  symbol: string;
  expectedPot: bigint;
};

/** A horizontal woven strip of rounds; past rounds show who received the pot. */
export function RoundTimeline({ rounds, currentRound, completed, recipients, payouts, decimals, symbol, expectedPot }: Props) {
  const byRound = new Map(payouts.map((p) => [p.round, p]));
  return (
    <div className="mat-card p-4">
      <h3 className="eyebrow">Rounds</h3>
      <ol className="mt-3 flex gap-2 overflow-x-auto pb-2" aria-label="Payout timeline">
        {Array.from({ length: rounds }).map((_, i) => {
          const r = i + 1;
          const done = completed || r < currentRound;
          const now = !completed && r === currentRound;
          const p = byRound.get(r);
          const who = recipients[i];
          return (
            <li
              key={r}
              className={`relative min-w-[132px] flex-1 overflow-hidden rounded-xl border p-3 ${
                now ? "border-marigold" : done ? "border-pandan/50" : "border-sand"
              }`}
              aria-current={now ? "step" : undefined}
            >
              <div className={`absolute inset-x-0 top-0 h-1.5 ${done ? "ribbon-pass" : now ? "weave" : "ribbon-unknown opacity-40"}`} aria-hidden />
              <p className="eyebrow mt-1 tabular">
                Round {r} {now ? "· now" : done ? "· paid" : ""}
              </p>
              <p className="mt-1 truncate font-semibold">
                {who ? (
                  <>
                    <span aria-hidden>{who.emoji ? who.emoji + " " : ""}</span>
                    {who.label}
                  </>
                ) : (
                  <span className="text-ink-soft">To be drawn</span>
                )}
              </p>
              <p className="tabular text-sm text-ink-soft">
                {done ? `${formatMoney(p?.amount ?? expectedPot, decimals)} ${symbol}` : `${formatMoney(expectedPot, decimals)} ${symbol}`}
                {done && !p?.amount && " (est.)"}
              </p>
              {p?.hash && (
                <a href={txUrl(p.hash)} target="_blank" rel="noreferrer" className="link text-xs font-semibold">
                  Payout tx ↗
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
