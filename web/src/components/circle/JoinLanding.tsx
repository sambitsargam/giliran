"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useCircle } from "@/lib/useCircle";
import { CircleState } from "@/lib/contracts";
import { useI18n } from "@/lib/i18n";
import { useTx } from "@/lib/useTx";
import { useWalletState } from "@/lib/useWallet";
import { canAfford, joinCalls } from "@/lib/circleCalls";
import { formatDuration, formatMoney } from "@/lib/format";
import { getLabels, setLabel } from "@/lib/storage";
import { useNow } from "@/hooks/useNow";
import { ConnectButton } from "../ConnectButton";
import { GasHelp } from "../GasHelp";
import { ErrorState, Skeleton } from "../Skeleton";
import { VerifyBadge } from "../VerifyBadge";

const EMOJIS = ["🌺", "🛵", "🌾", "🧵", "☕", "🎒", "🌴", "🐟", "🍚", "🪁", "🌙", "⭐"];

export function JoinLanding({ address, circleName }: { address: string; circleName?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const now = useNow();
  const { address: you } = useAccount();
  const { data: d, isLoading, error, valid } = useCircle(address);
  const wallet = useWalletState(d?.token, d?.address);
  const { send, busy } = useTx();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [prepay, setPrepay] = useState(0);

  useEffect(() => {
    if (!you) return;
    const saved = getLabels()[you.toLowerCase()];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from storage
    if (saved?.name) setName(saved.name);
    if (saved?.emoji) setEmoji(saved.emoji);
  }, [you]);

  if (!valid) return <ErrorState title="This invite link looks broken." body="Ask the organiser to send it again." />;
  if (error) return <ErrorState title="Couldn't load this circle." body="Check your connection and try again." />;
  if (isLoading || !d)
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-64" />
      </div>
    );

  const isMember = !!you && d.members.some((m) => m.address.toLowerCase() === you.toLowerCase());
  const open = d.state === CircleState.Joining && now <= d.joinDeadline && d.memberCount < d.memberCap;
  const needed = d.contribution * BigInt(1 + prepay);
  const freq = d.roundDuration >= 86400 ? `${Math.round(d.roundDuration / 86400)} day${d.roundDuration >= 172800 ? "s" : ""}` : formatDuration(d.roundDuration);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="eyebrow">{t.joinIntro}</p>
        <h1 className="font-display mt-2 text-4xl font-semibold">{circleName || "A Giliran savings circle"}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <VerifyBadge isGiliran={d.isGiliran} address={d.address} />
          {d.demo && <span className="rounded-full bg-marigold/20 px-3 py-1 text-sm font-bold">Demo circle</span>}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [t.perRound, `${formatMoney(d.contribution, d.decimals)} ${d.symbol}`],
          [t.members, `${d.memberCount} / ${d.memberCap}`],
          ["Every", freq],
          [t.pot, `${formatMoney(d.payoutPerRound, d.decimals)} ${d.symbol}`],
        ].map(([k, v]) => (
          <div key={k} className="mat-card p-3">
            <dt className="text-xs font-semibold text-ink-soft">{k}</dt>
            <dd className="font-display tabular text-xl font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <ol className="mat-card space-y-3 p-5">
        {[t.joinHowDeposit, t.joinHowTurns, t.joinHowSafe, t.joinNewcomer].map((s, i) => (
          <li key={i} className="flex gap-3">
            <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-marigold text-sm font-bold text-on-accent">
              {i + 1}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>

      {isMember ? (
        <div className="mat-card p-5">
          <p className="font-semibold">You&apos;re already in this circle.</p>
          <Link className="btn btn-primary mt-3" href={`/c/${d.address}`}>
            Open the circle room →
          </Link>
        </div>
      ) : !open ? (
        <ErrorState title={d.memberCount >= d.memberCap ? t.joinFull : t.joinClosed} action={<Link className="btn btn-ghost" href={`/c/${d.address}`}>View the circle</Link>} />
      ) : (
        <div className="mat-card space-y-4 p-5">
          <div>
            <label className="text-sm font-semibold" htmlFor="display-name">
              Your name in this circle <span className="font-normal text-ink-soft">(saved on this phone only, never on-chain)</span>
            </label>
            <input id="display-name" className="field mt-1" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ate Rosa" />
          </div>
          <fieldset>
            <legend className="text-sm font-semibold">Pick an avatar</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  className={`grid h-11 w-11 place-items-center rounded-full border-2 text-xl ${e === emoji ? "border-ink bg-marigold/30" : "border-sand"}`}
                  onClick={() => setEmoji(e)}
                  aria-pressed={e === emoji}
                  aria-label={`Avatar ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm font-semibold">
            {t.prepay} <span className="font-normal text-ink-soft">({t.prepayHint})</span>
            <select className="field mt-1" value={prepay} onChange={(e) => setPrepay(Number(e.target.value))}>
              <option value={0}>No, I&apos;ll pay each round</option>
              {Array.from({ length: d.memberCap }).map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  Prepay {i + 1} round{i ? "s" : ""} ({formatMoney(d.contribution * BigInt(i + 1), d.decimals)} {d.symbol})
                </option>
              ))}
            </select>
          </label>
          {!you ? (
            <ConnectButton />
          ) : (
            <>
              <GasHelp w={wallet.data} />
              <button
                className="btn btn-accent w-full text-lg"
                disabled={busy || !canAfford(d.token, needed, wallet.data)}
                onClick={async () => {
                  if (name.trim()) setLabel(you, { name: name.trim(), emoji });
                  const r = await send("Join circle", joinCalls(d.address, d.token, d.contribution, prepay, wallet.data));
                  if (r.ok) router.push(`/c/${d.address}`);
                }}
              >
                {busy ? t.joining : `${prepay ? t.joinWithPrepay : t.join} · ${formatMoney(needed, d.decimals)} ${d.symbol}`}
              </button>
              {!canAfford(d.token, needed, wallet.data) && (
                <p className="text-sm text-terracotta">Not enough {d.symbol} in this wallet.</p>
              )}
            </>
          )}
          <p className="text-xs text-ink-soft tabular">Joining closes in {formatDuration(d.joinDeadline - now)}.</p>
        </div>
      )}
    </div>
  );
}
