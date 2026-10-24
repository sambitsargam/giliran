"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import type { Address } from "viem";
import { circleAbi, CircleState } from "@/lib/contracts";
import { formatDuration, formatMoney } from "@/lib/format";
import { findSecret } from "@/lib/storage";
import { useI18n } from "@/lib/i18n";
import { useTx } from "@/lib/useTx";
import { useWalletState } from "@/lib/useWallet";
import { canAfford, contributeCalls, joinCalls, prepayCalls } from "@/lib/circleCalls";
import { roundClock, type CircleData } from "@/lib/useCircle";
import { publicClient } from "@/lib/chain";
import { errorName } from "@/lib/errors";
import { toastStore } from "@/lib/toasts";
import { ConnectButton } from "../ConnectButton";
import { GasHelp } from "../GasHelp";

type Props = { d: CircleData; now: number; onDone?: () => void };

/** Every action a circle supports, each shown only when it is valid right now. */
export function CircleActions({ d, now, onDone }: Props) {
  const { address } = useAccount();
  const { t } = useI18n();
  const { send, busy } = useTx();
  const wallet = useWalletState(d.token, d.address);
  const w = wallet.data;
  const me = address ? d.members.find((m) => m.address.toLowerCase() === address.toLowerCase()) : undefined;
  const [prepayN, setPrepayN] = useState(1);
  const [secretInput, setSecretInput] = useState("");
  const [serverBusy, setServerBusy] = useState(false);

  const run = async (title: string, calls: Parameters<typeof send>[1]) => {
    const r = await send(title, calls);
    wallet.refetch();
    onDone?.();
    return r;
  };

  const clock = d.state === CircleState.Active ? roundClock(d, d.currentRound) : null;
  const allPaid = d.state === CircleState.Active && d.members.every((m) => m.paidRounds >= d.currentRound);
  const canSettle = !!clock && (now > clock.graceEnd || (allPaid && now >= clock.start));
  const fallbackOpen = d.state === CircleState.Drawing && now > d.fillTime + d.revealTimeout;
  const saved = findSecret(d.address);
  const isOrganiser = address?.toLowerCase() === d.organiser.toLowerCase();

  const sections: React.ReactNode[] = [];

  // Joining
  if (d.state === CircleState.Joining && !me) {
    const closed = now > d.joinDeadline;
    const full = d.memberCount >= d.memberCap;
    sections.push(
      <div key="join" className="space-y-3">
        {closed ? (
          <p className="text-ink-soft">{t.joinClosed}</p>
        ) : full ? (
          <p className="text-ink-soft">{t.joinFull}</p>
        ) : !address ? (
          <ConnectButton />
        ) : (
          <>
            <GasHelp w={w} />
            <button
              className="btn btn-accent w-full text-base"
              disabled={busy || !canAfford(d.token, d.contribution, w)}
              onClick={() => run("Join circle", joinCalls(d.address, d.token, d.contribution, 0, w))}
            >
              {busy ? t.joining : `${t.join} · ${formatMoney(d.contribution, d.decimals)} ${d.symbol} ${t.deposit.toLowerCase()}`}
            </button>
            <p className="text-sm text-ink-soft">{t.joinHowDeposit}</p>
          </>
        )}
      </div>,
    );
  }

  if (d.state === CircleState.Joining && me) {
    sections.push(
      <p key="waiting" className="text-ink-soft">
        You&apos;re in. Waiting for {d.memberCap - d.memberCount} more member{d.memberCap - d.memberCount === 1 ? "" : "s"} —
        joining closes in {formatDuration(d.joinDeadline - now)}.
      </p>,
    );
  }

  // Drawing
  if (d.state === CircleState.Drawing) {
    const secret = saved?.secret ?? (secretInput.trim() as `0x${string}`);
    sections.push(
      <div key="draw" className="space-y-3">
        <p className="text-ink-soft">
          The circle is full. The organiser reveals the secret they committed to, mixed with the next block&apos;s hash,
          to draw a fair order. Newcomers always take the last slots.
        </p>
        {d.demo && (
          <button
            className="btn btn-primary w-full"
            disabled={serverBusy}
            onClick={async () => {
              setServerBusy(true);
              const id = toastStore.push({ title: "Reveal order (demo organiser)", status: "pending", detail: "Asking the demo server…" });
              try {
                const res = await fetch("/api/demo/reveal", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ circle: d.address }),
                });
                const j = await res.json();
                toastStore.update(id, res.ok ? { status: "success", detail: "Order drawn.", hash: j.hash } : { status: "error", detail: j.error });
              } catch {
                toastStore.update(id, { status: "error", detail: "Demo server unreachable." });
              } finally {
                setServerBusy(false);
                onDone?.();
              }
            }}
          >
            Reveal order (demo organiser)
          </button>
        )}
        {address && (isOrganiser || saved) && (
          <>
            {!saved && (
              <label className="block text-sm font-semibold">
                Organiser secret
                <input className="field mt-1 font-mono text-sm" value={secretInput} onChange={(e) => setSecretInput(e.target.value)} placeholder="0x…" />
              </label>
            )}
            <button
              className="btn btn-accent w-full"
              disabled={busy || !/^0x[0-9a-fA-F]{64}$/.test(secret ?? "")}
              onClick={() => run("Reveal payout order", [{ address: d.address, abi: circleAbi, functionName: "revealOrder", args: [secret] }])}
            >
              Reveal the order
            </button>
          </>
        )}
        {fallbackOpen ? (
          address && (
            <button
              className="btn btn-ghost w-full"
              disabled={busy}
              onClick={() => run("Fallback draw", [{ address: d.address, abi: circleAbi, functionName: "fallbackDraw" }])}
            >
              Organiser missed the deadline — draw from a later block
            </button>
          )
        ) : (
          <p className="text-sm text-ink-soft">
            If the organiser doesn&apos;t reveal within {formatDuration(d.fillTime + d.revealTimeout - now)}, anyone can draw
            from a later block instead.
          </p>
        )}
      </div>,
    );
  }

  // Active
  if (d.state === CircleState.Active && clock) {
    if (me && me.paidRounds < d.currentRound && now <= clock.graceEnd) {
      const late = now > clock.deadline;
      sections.push(
        <div key="contribute" className="space-y-2">
          <GasHelp w={w} />
          <button
            className={`btn w-full text-base ${late ? "btn-danger" : "btn-accent"}`}
            disabled={busy || !canAfford(d.token, d.contribution, w)}
            onClick={() => run(`Pay round ${d.currentRound}`, contributeCalls(d.address, d.token, d.contribution, w))}
          >
            {late ? t.contributeLate : t.contribute} · {formatMoney(d.contribution, d.decimals)} {d.symbol}
          </button>
          <p className="text-sm text-ink-soft tabular">
            {late ? `${t.graceLeft} ${formatDuration(clock.graceEnd - now)}` : now < clock.start ? `Opens in ${formatDuration(clock.start - now)}` : `${t.contributeDue} ${formatDuration(clock.deadline - now)}`}
          </p>
        </div>,
      );
    } else if (me && me.paidRounds >= d.currentRound) {
      sections.push(
        <p key="paid" className="flex items-center gap-2 font-semibold text-pandan-ink">
          <span aria-hidden className="grid h-6 w-6 place-items-center rounded-full bg-pandan text-xs text-white">✓</span>
          {t.contributed}
          {me.paidRounds > d.currentRound ? ` (prepaid through round ${me.paidRounds})` : ""}
        </p>,
      );
    }
    if (canSettle) {
      sections.push(
        <div key="settle" className="space-y-2">
          <button
            className="btn btn-primary w-full"
            disabled={busy || !address}
            onClick={() => run(`Settle round ${d.currentRound}`, [{ address: d.address, abi: circleAbi, functionName: "settleRound" }])}
          >
            {allPaid ? "Release this round's pot" : "Settle round from deposits"}
          </button>
          <p className="text-sm text-ink-soft">
            {allPaid
              ? "Everyone has paid and the round is open. Anyone can release the pot."
              : "Grace is over. Unpaid members are covered from their deposits; anyone can trigger this."}
          </p>
        </div>,
      );
    }
  }

  // Prepay (members, while rounds remain)
  if (me && (d.state === CircleState.Joining || d.state === CircleState.Drawing || d.state === CircleState.Active) && me.paidRounds < d.memberCap) {
    const max = d.memberCap - me.paidRounds;
    const n = Math.min(prepayN, max);
    sections.push(
      <div key="prepay" className="space-y-2 rounded-2xl border border-sand p-3">
        <p className="font-semibold">{t.prepay}</p>
        <p className="text-sm text-ink-soft">{t.prepayHint}</p>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="prepay-n">
            Rounds to prepay
          </label>
          <select id="prepay-n" className="field !w-24" value={n} onChange={(e) => setPrepayN(Number(e.target.value))}>
            {Array.from({ length: max }).map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
          <button
            className="btn btn-ghost flex-1"
            disabled={busy || !canAfford(d.token, d.contribution * BigInt(n), w)}
            onClick={() => run(`Prepay ${n} round${n > 1 ? "s" : ""}`, prepayCalls(d.address, d.token, d.contribution, n, w))}
          >
            Prepay {formatMoney(d.contribution * BigInt(n), d.decimals)} {d.symbol}
          </button>
        </div>
      </div>,
    );
  }

  // Claims and refunds
  if (me && me.owed > 0n) {
    sections.push(
      <button
        key="claim"
        className="btn btn-accent w-full"
        disabled={busy}
        onClick={() => run("Claim funds", [{ address: d.address, abi: circleAbi, functionName: "claimOwed" }])}
      >
        Claim {formatMoney(me.owed, d.decimals)} {d.symbol}
      </button>,
    );
  }
  if (me && ((d.state === CircleState.Joining && now > d.joinDeadline) || d.state === CircleState.Cancelled) && (me.deposit > 0n || me.paidRounds > 0)) {
    sections.push(
      <button
        key="refund"
        className="btn btn-primary w-full"
        disabled={busy}
        onClick={() => run("Refund (circle never filled)", [{ address: d.address, abi: circleAbi, functionName: "refundUnfilled" }])}
      >
        Circle didn&apos;t fill — take back my money
      </button>,
    );
  }

  if (d.state === CircleState.Completed) {
    sections.push(
      <p key="done" className="text-ink-soft">
        This circle is complete. Every pot was paid out and deposits were returned automatically
        {me ? "; your Passport has the stamps." : "."}
      </p>,
    );
  }

  return (
    <section className="mat-card p-5" aria-labelledby="actions-heading">
      <h3 id="actions-heading" className="font-display text-xl font-semibold">
        {me ? "Your actions" : "Actions"}
      </h3>
      <div className="mt-3 space-y-4">{sections.length ? sections : <p className="text-ink-soft">Nothing to do right now.</p>}</div>
      <WithdrawProbe circle={d.address} />
    </section>
  );
}

/** Lets anyone confirm, without spending gas, that the withdraw path always reverts. */
function WithdrawProbe({ circle }: { circle: Address }) {
  const [result, setResult] = useState<string | null>(null);
  return (
    <div className="mt-5 border-t border-sand pt-4">
      <button
        className="link text-sm font-semibold"
        onClick={async () => {
          try {
            await publicClient.readContract({ address: circle, abi: circleAbi, functionName: "organiserWithdraw" });
            setResult("Unexpected: the call did not revert.");
          } catch (e) {
            setResult(`Simulated: reverts with ${errorName(e) ?? "an error"}(). There is no key that can take the pot.`);
          }
        }}
      >
        Prove nobody can withdraw (free simulation)
      </button>
      {result && (
        <p className="mt-2 text-sm text-ink-soft" role="status">
          {result}
        </p>
      )}
    </div>
  );
}
