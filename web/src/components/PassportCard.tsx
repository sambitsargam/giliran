"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { Passport } from "@/lib/usePassport";
import { percent, shortAddress } from "@/lib/format";

const MAX_STAMPS = 24;

function Stamp({ kind, i }: { kind: "on" | "late" | "missed"; i: number }) {
  // Deterministic tilt so stamps look hand-pressed but render the same on server and client.
  const tilt = ((i * 37) % 21) - 10;
  const styles =
    kind === "on"
      ? "border-pandan text-pandan-ink"
      : kind === "late"
        ? "border-marigold-deep text-marigold-deep"
        : "border-terracotta text-terracotta";
  const label = kind === "on" ? "PAID" : kind === "late" ? "LATE" : "MISS";
  return (
    <li
      className={`grid aspect-square place-items-center rounded-full border-[2.5px] border-dashed ${styles}`}
      style={{ transform: `rotate(${tilt}deg)` }}
      aria-hidden
    >
      <span className="text-center text-[10px] font-black leading-none tracking-wider">
        {kind === "on" ? "✓" : kind === "late" ? "◔" : "✕"}
        <br />
        {label}
      </span>
    </li>
  );
}

export function PassportCard({ address, p, sample = false }: { address: string; p: Passport; sample?: boolean }) {
  const { t } = useI18n();
  const [url, setUrl] = useState("");
  // eslint-disable-next-line react-hooks/set-state-in-effect -- needs window.location
  useEffect(() => setUrl(`${window.location.origin}/passport/${address}`), [address]);

  const total = p.onTime + p.late + p.missed;
  const tierName = [t.tier0, t.tier1, t.tier2][p.tier] ?? `Tier ${p.tier}`;
  const stamps: ("on" | "late" | "missed")[] = [
    ...Array(p.onTime).fill("on"),
    ...Array(p.late).fill("late"),
    ...Array(p.missed).fill("missed"),
  ].slice(0, MAX_STAMPS);
  const since = p.firstSeen ? new Date(p.firstSeen * 1000).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—";

  return (
    <article
      className="relative overflow-hidden rounded-[26px] bg-ink p-2 text-cream shadow-2xl"
      aria-label={`${t.passport} for ${shortAddress(address)}: ${p.onTime} on time, ${p.late} late, ${p.missed} missed, ${tierName}`}
    >
      <div className="weave absolute inset-0 opacity-25" aria-hidden />
      <div className="relative grid gap-0 overflow-hidden rounded-[20px] bg-surface text-ink md:grid-cols-[1fr_1.25fr]">
        {/* Left page: holder */}
        <div className="relative border-b border-dashed border-sand-deep p-5 md:border-b-0 md:border-r">
          <p className="eyebrow">Republic of Savers · {sample ? "Sample" : "Passbook"}</p>
          <h2 className="font-display mt-2 text-3xl font-semibold leading-none">{t.passport}</h2>
          <p className="mt-2 text-sm text-ink-soft">{t.passportSub}</p>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs font-semibold text-ink-soft">Holder</dt>
              <dd className="font-mono font-semibold">{shortAddress(address)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-ink-soft">{t.memberSince}</dt>
              <dd className="font-semibold">{since}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-ink-soft">{t.tier}</dt>
              <dd>
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                    p.tier === 2 ? "bg-marigold text-on-accent" : p.tier === 1 ? "bg-pandan text-white" : "bg-surface-2"
                  }`}
                >
                  {tierName}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-ink-soft">{t.onTimeRate}</dt>
              <dd className="font-display tabular text-2xl font-semibold">{percent(p.onTime, total)}</dd>
            </div>
          </dl>
          <div className="mt-5 flex items-end gap-3">
            <div className="rounded-xl bg-white p-2">
              {url ? <QRCodeSVG value={url} size={92} fgColor="#1E1B4B" level="M" /> : <div className="h-[92px] w-[92px]" />}
            </div>
            <p className="text-xs text-ink-soft">{t.lenderScan}</p>
          </div>
        </div>

        {/* Right page: stamps */}
        <div className="weave-soft p-5">
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              [t.onTime, p.onTime, "text-pandan-ink"],
              [t.late, p.late, "text-marigold-deep"],
              [t.missed, p.missed, "text-terracotta"],
            ].map(([k, v, cls]) => (
              <div key={k as string} className="rounded-xl bg-surface p-2">
                <dd className={`font-display tabular text-3xl font-semibold ${cls}`}>{v as number}</dd>
                <dt className="text-xs font-semibold text-ink-soft">{k as string}</dt>
              </div>
            ))}
          </dl>
          {stamps.length ? (
            <ul className="mt-4 grid grid-cols-6 gap-2">
              {stamps.map((k, i) => (
                <Stamp key={i} kind={k} i={i} />
              ))}
            </ul>
          ) : (
            <p className="mt-6 rounded-xl border border-dashed border-sand-deep bg-surface p-4 text-center text-sm text-ink-soft">{t.noStamps}</p>
          )}
          {total > MAX_STAMPS && <p className="mt-2 text-xs text-ink-soft">+{total - MAX_STAMPS} more</p>}
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-surface p-2">
              <dt className="text-xs text-ink-soft">{t.circlesCompleted}</dt>
              <dd className="font-display tabular text-xl font-semibold">{p.completed}</dd>
            </div>
            <div className="rounded-xl bg-surface p-2">
              <dt className="text-xs text-ink-soft">{t.circlesJoined}</dt>
              <dd className="font-display tabular text-xl font-semibold">{p.joined}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-ink-soft">{t.passportPrivacy}</p>
        </div>
      </div>
    </article>
  );
}
