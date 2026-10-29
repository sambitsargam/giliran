"use client";

import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import type { Address } from "viem";
import { CircleRing } from "../ring/CircleRing";
import type { Bead } from "../ring/types";
import { MemberSeat } from "../MemberSeat";
import { RoundTimeline } from "../RoundTimeline";
import { TrustPanel } from "../TrustPanel";
import { VerifyBadge } from "../VerifyBadge";
import { CircleActions } from "./CircleActions";
import { ErrorState, RingSkeleton, Skeleton } from "../Skeleton";
import { useNow } from "@/hooks/useNow";
import { useCircle, useCircleDerived, usePayoutHistory, memberRoundStatus, type CircleData } from "@/lib/useCircle";
import { CircleState, STATE_LABEL } from "@/lib/contracts";
import { formatDuration, formatMoney, shortAddress } from "@/lib/format";
import { avatarFor, labelFor } from "@/lib/labels";
import { useI18n } from "@/lib/i18n";
import { txUrl } from "@/lib/chain";

export function useRing(d: CircleData | undefined, now: number, you?: string) {
  const derived = useCircleDerived(d, now);
  // Labels come from localStorage, so build them after mount to keep hydration stable.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount flag
  useEffect(() => setMounted(true), []);
  if (!d || !derived) return null;

  const ordered: Address[] = d.order.length ? d.order : d.members.map((m) => m.address);
  const byAddr = new Map(d.members.map((m) => [m.address.toLowerCase(), m]));
  const beads: Bead[] = ordered.map((a, i) => {
    const m = byAddr.get(a.toLowerCase())!;
    const l = mounted ? labelFor(a, you) : { label: shortAddress(a, 3), emoji: avatarFor(a) };
    return {
      address: a,
      label: l.label,
      emoji: l.emoji,
      status: memberRoundStatus(d, m, now),
      isRecipient: !!derived.recipient && derived.recipient.toLowerCase() === a.toLowerCase(),
      isYou: !!you && you.toLowerCase() === a.toLowerCase(),
      slot: d.order.length ? i + 1 : undefined,
      received: d.order.length > 0 && (d.state === CircleState.Completed || i + 1 < d.currentRound),
    };
  });

  const target = d.contribution * BigInt(d.memberCap);
  const collected =
    d.state === CircleState.Completed
      ? target
      : d.state === CircleState.Active
        ? d.contribution * BigInt(derived.paidCount)
        : d.contribution * BigInt(d.memberCount);
  return { beads, derived, target, collected };
}

export function CircleRoom({ address, compact = false }: { address: string; compact?: boolean }) {
  const { address: you } = useAccount();
  const now = useNow();
  const { t } = useI18n();
  const { data: d, isLoading, error, lastPayout, refetch, valid } = useCircle(address);
  const ring = useRing(d, now, you);
  const history = usePayoutHistory(address, d?.fillBlock, d?.currentRound);

  if (!valid) return <ErrorState title="That doesn't look like an address." body="Check the invite link and try again." />;
  if (error)
    return (
      <ErrorState
        title="Couldn't read this circle."
        body="It may not be a Giliran circle, or the network is busy. Try again in a moment."
        action={
          <button className="btn btn-ghost" onClick={() => refetch()}>
            Retry
          </button>
        }
      />
    );
  if (isLoading || !d || !ring)
    return (
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <RingSkeleton />
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-40" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );

  const { beads, derived, target, collected } = ring;
  const crown = derived.recipient && you && derived.recipient.toLowerCase() === you.toLowerCase() ? t.yourTurn : "Giliran mo!";
  const timelineRecipients = d.order.map((a) => labelFor(a, you));

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-start">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <VerifyBadge isGiliran={d.isGiliran} address={d.address} />
          {d.demo && (
            <span className="inline-flex min-h-[32px] items-center rounded-full bg-marigold/20 px-3 py-1 text-sm font-bold">
              Demo circle · {d.roundDuration}s rounds
            </span>
          )}
          <span className="inline-flex min-h-[32px] items-center rounded-full border border-sand px-3 py-1 text-sm font-semibold">
            {STATE_LABEL[d.state]}
            {d.state === CircleState.Active ? ` · ${t.round} ${d.currentRound}/${d.memberCap}` : ""}
          </span>
        </div>
        <CircleRing
          beads={beads}
          openSeats={d.state === CircleState.Joining ? d.memberCap - d.memberCount : 0}
          collected={formatMoney(collected, d.decimals)}
          target={formatMoney(target, d.decimals)}
          symbol={`${d.symbol}`}
          fraction={target > 0n ? Number(collected) / Number(target) : 0}
          clock={derived.clock ? { now, ...derived.clock } : undefined}
          potCaption={
            d.state === CircleState.Joining
              ? "DEPOSITS IN"
              : d.state === CircleState.Completed
                ? "ALL PAID OUT"
                : d.state === CircleState.Drawing
                  ? "DRAWING ORDER"
                  : `ROUND ${d.currentRound} POT`
          }
          crownLabel={crown}
          payoutKey={lastPayout ? lastPayout.round : null}
          payoutTo={lastPayout?.recipient ?? null}
        />
        <p className="text-center text-xs text-ink-soft">
          {d.symbol === "tUSDC" ? "tUSDC is a test stand-in for an S$-equivalent stablecoin." : "USDC on Base Sepolia."}
        </p>
        {lastPayout && (
          <div className="mat-card flex flex-wrap items-center gap-3 border-l-4 !border-l-marigold p-4" role="status">
            <span className="text-2xl" aria-hidden>
              🧺
            </span>
            <p className="flex-1 font-semibold">
              Round {lastPayout.round} paid out: {formatMoney(lastPayout.amount, d.decimals)} {d.symbol} to{" "}
              {labelFor(lastPayout.recipient, you).label}.
            </p>
            {lastPayout.hash && (
              <a className="link text-sm font-semibold" href={txUrl(lastPayout.hash)} target="_blank" rel="noreferrer">
                See the transfer on BaseScan ↗
              </a>
            )}
          </div>
        )}
        {!compact && d.order.length > 0 && (
          <RoundTimeline
            rounds={d.memberCap}
            currentRound={d.currentRound}
            completed={d.state === CircleState.Completed}
            recipients={timelineRecipients}
            payouts={history.data ?? []}
            decimals={d.decimals}
            symbol={d.symbol}
            expectedPot={target}
          />
        )}
      </div>

      <div className="space-y-4">
        <section className="mat-card p-5" aria-labelledby="members-heading">
          <div className="flex items-baseline justify-between gap-2">
            <h3 id="members-heading" className="font-display text-xl font-semibold">
              {t.members}{" "}
              <span className="tabular text-ink-soft">
                {d.memberCount}/{d.memberCap}
              </span>
            </h3>
            <p className="tabular text-sm text-ink-soft">
              {formatMoney(d.contribution, d.decimals)} {d.symbol} {t.perRound}
            </p>
          </div>
          {derived.clock && (
            <p className="mt-1 text-sm text-ink-soft tabular">
              {now < derived.clock.deadline
                ? `${t.contributeDue} ${formatDuration(derived.clock.deadline - now)}`
                : now < derived.clock.graceEnd
                  ? `${t.graceLeft} ${formatDuration(derived.clock.graceEnd - now)}`
                  : "Grace period over — ready to settle"}
            </p>
          )}
          <ul className="mt-3 space-y-2">
            {beads.map((b) => {
              const m = d.members.find((x) => x.address.toLowerCase() === b.address.toLowerCase())!;
              return (
                <MemberSeat
                  key={b.address}
                  label={b.label}
                  emoji={b.emoji}
                  status={b.status}
                  statusText={
                    d.state === CircleState.Joining || d.state === CircleState.Drawing
                      ? b.status === "paid"
                        ? "Prepaid"
                        : "Deposit in"
                      : undefined
                  }
                  slot={b.slot}
                  tier={m.tier}
                  isRecipient={b.isRecipient}
                  isYou={b.isYou}
                  received={b.received && !b.isRecipient}
                  note={m.hadShortfall ? "shortfall" : m.paidRounds > d.currentRound && d.state === CircleState.Active ? `prepaid to R${m.paidRounds}` : undefined}
                />
              );
            })}
          </ul>
          {d.state === CircleState.Joining && d.memberCap > d.memberCount && (
            <p className="mt-3 text-sm text-ink-soft">
              {d.memberCap - d.memberCount} seat{d.memberCap - d.memberCount === 1 ? "" : "s"} open · joining closes in{" "}
              {formatDuration(d.joinDeadline - now)}
            </p>
          )}
        </section>
        <CircleActions d={d} now={now} onDone={() => refetch()} />
        {!compact && <TrustPanel d={d} />}
      </div>
    </div>
  );
}
