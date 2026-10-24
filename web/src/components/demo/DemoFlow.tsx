"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import type { Address, Hash } from "viem";
import { AnimatePresence, motion } from "framer-motion";
import { addresses, CircleState, circleAbi } from "@/lib/contracts";
import { useCircle, useCircleDerived } from "@/lib/useCircle";
import { useWalletState } from "@/lib/useWallet";
import { useTx } from "@/lib/useTx";
import { joinCalls, contributeCalls, prepayCalls } from "@/lib/circleCalls";
import { readJSON, setLabel, setLabels, writeJSON } from "@/lib/storage";
import { txUrl } from "@/lib/chain";
import { formatDuration } from "@/lib/format";
import { toastStore } from "@/lib/toasts";
import { useI18n } from "@/lib/i18n";
import { signIn } from "@/lib/signInStore";
import { publicClient } from "@/lib/chain";
import { errorName } from "@/lib/errors";
import { useNow } from "@/hooks/useNow";
import { CircleRoom } from "../circle/CircleRoom";
import { CheckerResults } from "../Checker";
import { PassportView } from "../PassportView";
import { PasskeyIcon } from "../ConnectButton";

type Saved = { circle?: Address; step?: number; withdrawHash?: Hash; checkedReal?: boolean };
const KEY = "giliran.demo";

const STEPS = [
  { title: "Join the circle", short: "Join" },
  { title: "Watch the pot pay out", short: "Payout" },
  { title: "Try to run with the money", short: "Steal" },
  { title: "Spot the fake circle", short: "Check" },
  { title: "Open your Passport", short: "Pass" },
];

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((j as { error?: string }).error || `Request failed (${res.status})`);
  return j as T;
}

export function DemoFlow() {
  const { address } = useAccount();
  const [saved, setSaved] = useState<Saved>({});
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const s = readJSON<Saved>(KEY, {});
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore progress after mount
    setSaved(s);
    setStep(s.step ?? 0);
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<Saved>) => {
    setSaved((prev) => {
      const next = { ...prev, ...patch };
      writeJSON(KEY, next);
      return next;
    });
  }, []);

  const go = (n: number) => {
    setStep(n);
    update({ step: n });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const { data: d } = useCircle(saved.circle);
  const isMember = !!address && !!d?.members.some((m) => m.address.toLowerCase() === address.toLowerCase());
  const paidOut = !!d && (d.currentRound > 1 || d.state === CircleState.Completed);
  const reached = [true, isMember, isMember && paidOut, isMember && paidOut, isMember && paidOut];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Live on Base Sepolia · test money</p>
          <h1 className="font-display mt-2 text-4xl font-semibold sm:text-5xl">Try Giliran live</h1>
          <p className="mt-2 max-w-2xl text-ink-soft">
            Join a real circle with four other members, watch the pot pay out, try to steal it, catch a fake, and leave
            with a stamped Savings Passport.
          </p>
        </div>
        {saved.circle && (
          <button
            className="text-sm font-semibold text-ink-soft link"
            onClick={() => {
              update({ circle: undefined, step: 0, withdrawHash: undefined, checkedReal: false });
              setStep(0);
            }}
          >
            Start over with a new circle
          </button>
        )}
      </div>

      <nav aria-label="Demo steps" className="mt-8">
        <ol className="grid grid-cols-5 gap-1.5 sm:gap-3">
          {STEPS.map((s, i) => {
            const active = i === step;
            const done = i < step || (i === 0 && isMember);
            const enabled = reached[i];
            return (
              <li key={s.title}>
                <button
                  className={`group flex w-full flex-col items-start gap-1.5 text-left disabled:cursor-not-allowed ${enabled ? "" : "opacity-50"}`}
                  onClick={() => enabled && go(i)}
                  disabled={!enabled}
                  aria-current={active ? "step" : undefined}
                >
                  <span className={`h-2 w-full rounded-full ${active ? "weave" : done ? "bg-pandan" : "bg-sand"}`} aria-hidden />
                  <span className="flex min-h-[44px] w-full flex-col items-center gap-1 sm:flex-row sm:items-center sm:gap-2">
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${
                        active ? "bg-ink text-cream" : done ? "bg-pandan text-white" : "bg-surface-2 text-ink-soft"
                      }`}
                    >
                      {done && !active ? "✓" : i + 1}
                    </span>
                    <span className={`hidden text-sm font-semibold sm:inline ${active ? "" : "text-ink-soft"}`}>{s.title}</span>
                    <span className={`max-w-full truncate text-[11px] font-semibold sm:hidden ${active ? "" : "text-ink-soft"}`}>{s.short}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mt-8">
        {!hydrated ? (
          <div className="skeleton h-80" />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {step === 0 && <StepJoin saved={saved} update={update} onNext={() => go(1)} />}
              {step === 1 && saved.circle && <StepPayout circle={saved.circle} onNext={() => go(2)} />}
              {step === 2 && saved.circle && <StepSteal circle={saved.circle} saved={saved} update={update} onNext={() => go(3)} />}
              {step === 3 && saved.circle && <StepCheck circle={saved.circle} onNext={() => go(4)} />}
              {step === 4 && address && <StepPassport address={address} />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function StepCard({ n, title, children, aside }: { n: number; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mat-card overflow-hidden">
      <div className="weave h-2" aria-hidden />
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="eyebrow">Step {n} of 5</p>
          <h2 className="font-display mt-1 text-3xl font-semibold">{title}</h2>
          <div className="mt-4 space-y-4">{children}</div>
        </div>
        {aside}
      </div>
    </div>
  );
}

/* ---------------- Step 1 ---------------- */

function StepJoin({ saved, update, onNext }: { saved: Saved; update: (p: Partial<Saved>) => void; onNext: () => void }) {
  const { address } = useAccount();
  const { t } = useI18n();
  const { data: d, refetch } = useCircle(saved.circle);
  const wallet = useWalletState(d?.token ?? addresses.tusdc, saved.circle);
  const { send, busy } = useTx();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const isMember = !!address && !!d?.members.some((m) => m.address.toLowerCase() === address.toLowerCase());

  const create = async () => {
    if (!address) return;
    setCreating(true);
    setError(null);
    const id = toastStore.push({ title: "Setting up your demo circle", status: "pending", detail: "Four members are joining and prepaying…" });
    try {
      const out = await post<{ circle: Address; createHash: Hash; bots: { address: string; name: string; emoji: string }[] }>("/api/demo/new", {
        member: address,
      });
      setLabels(Object.fromEntries(out.bots.map((b) => [b.address, { name: b.name, emoji: b.emoji }])));
      setLabel(address, { name: "You", emoji: "⭐" });
      update({ circle: out.circle, step: 0, withdrawHash: undefined, checkedReal: false });
      toastStore.update(id, { status: "success", detail: "4 of 5 seats filled. The last seat is yours.", hash: out.createHash });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Couldn't create the demo circle.";
      setError(msg);
      toastStore.update(id, { status: "error", detail: msg });
    } finally {
      setCreating(false);
    }
  };

  const reveal = useCallback(async () => {
    if (!saved.circle) return;
    setRevealing(true);
    try {
      await post("/api/demo/reveal", { circle: saved.circle });
    } catch (e) {
      toastStore.push({ title: "Reveal", status: "error", detail: e instanceof Error ? e.message : "Reveal failed" });
    } finally {
      setRevealing(false);
      refetch();
    }
  }, [saved.circle, refetch]);

  // As soon as the judge's join fills the circle, the demo organiser reveals the order;
  // keep asking every few seconds in case the first request raced the join.
  const lastAsk = useRef(0);
  useEffect(() => {
    if (d?.state !== CircleState.Drawing || revealing) return;
    const wait = Math.max(0, 6000 - (Date.now() - lastAsk.current));
    const id = setTimeout(() => {
      lastAsk.current = Date.now();
      reveal();
    }, wait);
    return () => clearTimeout(id);
  }, [d?.state, revealing, reveal]);

  const join = async () => {
    if (!d) return;
    const r = await send("Join the last seat", joinCalls(d.address, d.token, d.contribution, 0, wallet.data));
    if (r.ok) refetch();
  };

  const myslot = address && d?.order.findIndex((a) => a.toLowerCase() === address.toLowerCase());

  return (
    <div className="space-y-6">
      <StepCard n={1} title={STEPS[0].title}>
        {!address ? (
          <>
            <p className="text-ink-soft">
              First, sign in. A passkey creates a smart wallet on your phone in seconds — no app, no seed phrase, nothing
              to install.
            </p>
            <button className="btn btn-accent text-base" onClick={() => signIn.open()}>
              <PasskeyIcon /> Sign in to start
            </button>
          </>
        ) : !saved.circle ? (
          <>
            <p className="text-ink-soft">
              We&apos;ll open a fresh 5-seat circle: <strong className="text-ink">1 tUSDC</strong> per round,{" "}
              <strong className="text-ink">2-minute rounds</strong> with a 30-second grace period. Four members — Ate Rosa,
              Kuya Ben, Bu Sari and Mbak Dewi — join first and prepay every round, like paying ahead on payday.
            </p>
            <button className="btn btn-accent text-base" onClick={create} disabled={creating}>
              {creating ? "Opening the circle… (about 15 seconds)" : "Open my demo circle"}
            </button>
            {error && (
              <p className="text-sm text-terracotta" role="alert">
                {error}
              </p>
            )}
          </>
        ) : !d ? (
          <div className="skeleton h-24" />
        ) : !isMember ? (
          <>
            <p className="text-ink-soft">
              {d.memberCount} of {d.memberCap} seats are taken. Take the last one: one tap gets free test money from the
              faucet, approves it, and pays your <strong className="text-ink">1 tUSDC deposit</strong> — all in a single
              passkey confirmation.
            </p>
            <div className="rounded-2xl border border-marigold bg-marigold/10 p-4">
              <p className="font-semibold">{t.joinNewcomer}</p>
              <p className="mt-1 text-sm text-ink-soft">
                The four others have completed circles before, so they rank higher. You save first and collect last.
              </p>
            </div>
            <button className="btn btn-accent text-base" onClick={join} disabled={busy || d.state !== CircleState.Joining}>
              {busy ? t.joining : "Join the last seat"}
            </button>
          </>
        ) : (
          <>
            <p className="flex items-center gap-2 font-semibold text-pandan-ink">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-pandan text-white" aria-hidden>
                ✓
              </span>
              You&apos;re in. Your join filled the circle.
            </p>
            {d.state === CircleState.Drawing ? (
              <p className="text-ink-soft" role="status">
                {revealing ? "The organiser is revealing the payout order…" : "Waiting for the payout order to be drawn…"}{" "}
                <button className="link font-semibold" onClick={reveal} disabled={revealing}>
                  Nudge it
                </button>
              </p>
            ) : (
              <>
                <p className="text-ink-soft">
                  Order drawn by commit-reveal. You&apos;re in{" "}
                  <strong className="text-ink">
                    slot #{(myslot ?? -1) + 1} of {d.memberCap}
                  </strong>
                  {myslot === d.memberCap - 1 ? " — last, as a newcomer." : "."}
                </p>
                <button className="btn btn-primary text-base" onClick={onNext}>
                  Next: pay round 1 →
                </button>
              </>
            )}
          </>
        )}
      </StepCard>
      {saved.circle && <CircleRoom address={saved.circle} compact />}
    </div>
  );
}

/* ---------------- Step 2 ---------------- */

function useSettleNudge(circle: Address) {
  const { data: d } = useCircle(circle);
  const now = useNow();
  const derived = useCircleDerived(d, now);
  const last = useRef(0);
  useEffect(() => {
    if (!d || !d.demo) return;
    const needsReveal = d.state === CircleState.Drawing;
    if (!(derived?.canSettle || needsReveal)) return;
    if (Date.now() - last.current < 12_000) return;
    last.current = Date.now();
    post("/api/demo/settle", { circle }).catch(() => undefined);
  }, [d, derived?.canSettle, circle, now]);
}

function StepPayout({ circle, onNext }: { circle: Address; onNext: () => void }) {
  const { address } = useAccount();
  const { data: d, lastPayout, refetch } = useCircle(circle);
  const wallet = useWalletState(d?.token, circle);
  const { send, busy } = useTx();
  const now = useNow();
  useSettleNudge(circle);

  if (!d) return <div className="skeleton h-80" />;
  const me = d.members.find((m) => m.address.toLowerCase() === address?.toLowerCase());
  const round1Done = d.currentRound > 1 || d.state === CircleState.Completed;
  const remaining = me ? d.memberCap - me.paidRounds : 0;
  const recipient1 = d.order[0];

  return (
    <div className="space-y-6">
      <StepCard n={2} title={STEPS[1].title}>
        {!round1Done ? (
          <>
            <p className="text-ink-soft">
              Everyone else prepaid. You&apos;re the last payment of round 1 — when it lands, the contract sends the whole
              pot to this round&apos;s member <em>in the same transaction</em>. Watch the threads.
            </p>
            {me && me.paidRounds < 1 ? (
              <button
                className="btn btn-accent text-base"
                disabled={busy}
                onClick={async () => {
                  const r = await send("Pay round 1", contributeCalls(circle, d.token, d.contribution, wallet.data));
                  if (r.ok) refetch();
                }}
              >
                Pay round 1 · 1 tUSDC
              </button>
            ) : (
              <p className="text-ink-soft" role="status">
                Waiting for the round to open…
              </p>
            )}
          </>
        ) : (
          <>
            <p className="flex items-center gap-2 font-semibold text-pandan-ink">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-pandan text-white" aria-hidden>
                ✓
              </span>
              Round 1 paid out automatically.
            </p>
            <p className="text-ink-soft">
              5 tUSDC went straight from the contract to {recipient1 ? "this round's member" : "the recipient"}. No organiser
              touched it.
              {lastPayout?.hash && (
                <>
                  {" "}
                  <a className="link font-semibold text-ink" href={txUrl(lastPayout.hash)} target="_blank" rel="noreferrer">
                    See the transfer on BaseScan ↗
                  </a>
                </>
              )}
            </p>
            {me && remaining > 0 && d.state === CircleState.Active && (
              <div className="rounded-2xl border border-sand p-4">
                <p className="font-semibold">Optional: prepay your remaining {remaining} rounds</p>
                <p className="mt-1 text-sm text-ink-soft">
                  Rounds advance every 2 minutes. Prepaying keeps your Passport spotless and lets the circle finish on its
                  own — you&apos;ll collect the last pot and get your deposit back.
                </p>
                <button
                  className="btn btn-ghost mt-3"
                  disabled={busy}
                  onClick={() => send(`Prepay ${remaining} rounds`, prepayCalls(circle, d.token, d.contribution, remaining, wallet.data))}
                >
                  Prepay {remaining} tUSDC
                </button>
              </div>
            )}
            <button className="btn btn-primary text-base" onClick={onNext}>
              Next: try to steal it →
            </button>
          </>
        )}
        {d.state === CircleState.Active && (
          <p className="tabular text-xs text-ink-soft">
            Round {d.currentRound} · closes in {formatDuration(d.startTime + d.currentRound * d.roundDuration - now)}
          </p>
        )}
      </StepCard>
      <CircleRoom address={circle} compact />
    </div>
  );
}

/* ---------------- Step 3 ---------------- */

function StepSteal({ circle, saved, update, onNext }: { circle: Address; saved: Saved; update: (p: Partial<Saved>) => void; onNext: () => void }) {
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useSettleNudge(circle);

  const attempt = async () => {
    setBusy(true);
    setError(null);
    const id = toastStore.push({ title: "Organiser tries organiserWithdraw()", status: "pending", detail: "Sending a real transaction…" });
    try {
      const r = await post<{ hash: Hash; status: string }>("/api/demo/withdraw", { circle });
      update({ withdrawHash: r.hash });
      toastStore.update(id, {
        status: r.status === "reverted" ? "error" : "success",
        expected: true,
        detail: r.status === "reverted" ? "Reverted on-chain: NoOneCanWithdraw()." : "Unexpected success",
        hash: r.hash,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      setError(msg);
      toastStore.update(id, { status: "error", detail: msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <StepCard
      n={3}
      title={STEPS[2].title}
      aside={
        <div className="hidden w-56 lg:block" aria-hidden>
          <div className="grid aspect-square place-items-center rounded-full border-4 border-dashed border-terracotta/40">
            <span className="text-7xl">{saved.withdrawHash ? "🔒" : "🏃"}</span>
          </div>
        </div>
      }
    >
      <p className="text-ink-soft">
        In the Kedah and East Java cases, the organiser simply left with the money. Here, the organiser of your demo circle
        is our server&apos;s key — and we&apos;ll use it, for real, to call the contract&apos;s{" "}
        <code className="rounded bg-surface-2 px-1">organiserWithdraw()</code>.
      </p>
      {!saved.withdrawHash ? (
        <button className="btn btn-danger !min-h-[56px] !px-8 text-lg" onClick={attempt} disabled={busy}>
          {busy ? "Trying to take the pot…" : "Try to run with the money"}
        </button>
      ) : (
        <div className="rounded-2xl border-2 border-terracotta bg-terracotta/10 p-5" role="status">
          <p className="font-display text-2xl font-semibold">Transaction failed. The pot didn&apos;t move.</p>
          <p className="mt-2">
            The contract reverted with <code className="rounded bg-surface px-1 font-bold">NoOneCanWithdraw()</code>.{" "}
            <strong>There is no key that can take the pot</strong> — no owner, no admin, no upgrade, no pause. Money only
            leaves as a round&apos;s payout to that round&apos;s member, or as a member&apos;s own deposit.
          </p>
          <a className="btn btn-ghost mt-4" href={txUrl(saved.withdrawHash)} target="_blank" rel="noreferrer">
            See the failed transaction on BaseScan ↗
          </a>
        </div>
      )}
      {error && (
        <p className="text-sm text-terracotta" role="alert">
          {error}
        </p>
      )}
      <div className="border-t border-sand pt-4">
        <button
          className="link text-sm font-semibold"
          onClick={async () => {
            try {
              await publicClient.readContract({ address: circle, abi: circleAbi, functionName: "organiserWithdraw" });
              setMine("Unexpected: it didn't revert.");
            } catch (e) {
              setMine(`From your wallet too: reverts with ${errorName(e) ?? "an error"}(). Your wallet refuses to even send it.`);
            }
          }}
        >
          Try it from your own wallet (simulation)
        </button>
        {mine && <p className="mt-2 text-sm text-ink-soft">{mine}</p>}
      </div>
      {saved.withdrawHash && (
        <button className="btn btn-primary text-base" onClick={onNext}>
          Next: spot the fake circle →
        </button>
      )}
    </StepCard>
  );
}

/* ---------------- Step 4 ---------------- */

function StepCheck({ circle, onNext }: { circle: Address; onNext: () => void }) {
  const [showReal, setShowReal] = useState(false);
  return (
    <div className="space-y-6">
      <StepCard n={4} title={STEPS[3].title}>
        <p className="text-ink-soft">
          The East Java arisan looked full, paid early rounds on time and promised returns. We deployed a contract that
          does the same, as a teaching example. The checker reads it directly from the chain:
        </p>
      </StepCard>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="font-display mb-3 text-xl font-semibold">The fake circle</h3>
          <CheckerResults address={addresses.fake} />
        </div>
        <div>
          <h3 className="font-display mb-3 text-xl font-semibold">Your demo circle</h3>
          {showReal ? (
            <CheckerResults address={circle} />
          ) : (
            <div className="mat-card grid min-h-64 place-items-center p-6 text-center">
              <div>
                <p className="text-ink-soft">Now paste the circle you just joined.</p>
                <button className="btn btn-accent mt-4" onClick={() => setShowReal(true)}>
                  Check my circle
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {showReal && (
        <button className="btn btn-primary text-base" onClick={onNext}>
          Next: open your Passport →
        </button>
      )}
    </div>
  );
}

/* ---------------- Step 5 ---------------- */

function StepPassport({ address }: { address: Address }) {
  return (
    <div className="space-y-6">
      <StepCard n={5} title={STEPS[4].title}>
        <p className="text-ink-soft">
          Your on-time payment stamped your Savings Passport. It lives in the SavingsRegistry and as an EAS attestation, so
          a lender can scan the QR code and verify it without trusting us. Counts only — no amounts, no names.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link className="btn btn-ghost" href={`/passport/${address}`}>
            Open the public Passport page
          </Link>
          <Link className="btn btn-ghost" href="/circle/new">
            Start a real circle
          </Link>
        </div>
      </StepCard>
      <PassportView address={address} />
    </div>
  );
}
