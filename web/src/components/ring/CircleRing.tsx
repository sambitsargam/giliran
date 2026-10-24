"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useId } from "react";
import { PotMeter } from "./PotMeter";
import type { Bead, RoundClock } from "./types";
import { initials } from "@/lib/format";

type Props = {
  beads: Bead[];
  /** Empty seats still waiting for members. */
  openSeats?: number;
  collected: string;
  target: string;
  symbol: string;
  fraction: number;
  clock?: RoundClock;
  potCaption?: string;
  crownLabel?: string;
  /** Change this value to play the payout animation toward `payoutTo`. */
  payoutKey?: string | number | null;
  payoutTo?: string | null;
  ariaLabel?: string;
  size?: number;
};

const VB = 420;
const C = VB / 2;
const RING_R = 160;

// Server and client Math.cos can differ in the last bits; round to keep hydration stable.
const r2 = (v: number) => Math.round(v * 100) / 100;

function beadPosition(i: number, n: number) {
  const a = (i / n) * Math.PI * 2 - Math.PI / 2;
  return { x: r2(C + RING_R * Math.cos(a)), y: r2(C + RING_R * Math.sin(a)), a };
}

const STATUS_TEXT = { paid: "paid", pending: "not paid yet", overdue: "overdue" } as const;

/**
 * Members sit as beads around a woven ring. Paid beads fill pandan green, overdue beads glow
 * terracotta, pending beads stay hollow. The current recipient wears a marigold crown.
 */
export function CircleRing({
  beads,
  openSeats = 0,
  collected,
  target,
  symbol,
  fraction,
  clock,
  potCaption,
  crownLabel = "Your turn!",
  payoutKey,
  payoutTo,
  ariaLabel,
  size,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const n = Math.max(beads.length + openSeats, 2);
  const beadR = r2(Math.min(25, ((2 * Math.PI * RING_R) / n) * 0.36));
  const recipientIndex = payoutTo ? beads.findIndex((b) => b.address.toLowerCase() === payoutTo.toLowerCase()) : -1;
  const target_ = recipientIndex >= 0 ? beadPosition(recipientIndex, n) : null;

  const summary =
    ariaLabel ??
    `Savings circle with ${beads.length} members. ${beads.filter((b) => b.status === "paid").length} paid this round. Pot ${collected} of ${target} ${symbol}.`;

  return (
    <figure className="relative mx-auto w-full" style={{ maxWidth: size ?? 520 }}>
      <svg viewBox={`0 0 ${VB} ${VB}`} role="img" aria-label={summary} className="h-auto w-full overflow-visible">
        <defs>
          <pattern id={`weave-${uid}`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="10" height="10" fill="var(--sand)" />
            <rect width="5" height="10" fill="var(--sand-deep)" />
            <rect y="4" width="10" height="2" fill="var(--marigold)" opacity="0.55" />
          </pattern>
          <filter id={`glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        {/* The woven mat ring */}
        <circle cx={C} cy={C} r={RING_R} fill="none" stroke={`url(#weave-${uid})`} strokeWidth="22" />
        <circle cx={C} cy={C} r={RING_R + 11} fill="none" stroke="var(--sand-deep)" strokeWidth="1" />
        <circle cx={C} cy={C} r={RING_R - 11} fill="none" stroke="var(--sand-deep)" strokeWidth="1" />
        <circle
          cx={C}
          cy={C}
          r={RING_R}
          fill="none"
          stroke="var(--terracotta)"
          strokeOpacity="0.35"
          strokeWidth="2"
          strokeDasharray="2 9"
          className={reduce ? "" : "animate-spin-slow"}
          style={{ transformOrigin: `${C}px ${C}px` }}
        />

        <PotMeter
          cx={C}
          cy={C}
          r={88}
          collected={collected}
          target={target}
          symbol={symbol}
          fraction={fraction}
          clock={clock}
          caption={potCaption}
        />

        {/* Payout: a stream of woven threads from the basket to the recipient */}
        <AnimatePresence>
          {payoutKey != null && target_ && !reduce && (
            <motion.g key={String(payoutKey)} initial={{ opacity: 1 }} animate={{ opacity: [1, 1, 0] }} transition={{ duration: 2.6, times: [0, 0.75, 1] }}>
              {[-14, -7, 0, 7, 14].map((off, i) => {
                const mx = (C + target_.x) / 2 + Math.cos(target_.a + Math.PI / 2) * off * 3;
                const my = (C + target_.y) / 2 + Math.sin(target_.a + Math.PI / 2) * off * 3;
                return (
                  <motion.path
                    key={off}
                    d={`M ${C} ${C} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${target_.x.toFixed(1)} ${target_.y.toFixed(1)}`}
                    fill="none"
                    stroke={i % 2 ? "var(--terracotta)" : "var(--marigold)"}
                    strokeWidth={i === 2 ? 4 : 2.5}
                    strokeLinecap="round"
                    strokeDasharray={i % 2 ? "6 5" : undefined}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.1, delay: i * 0.08, ease: "easeOut" }}
                  />
                );
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Open seats */}
        {Array.from({ length: openSeats }).map((_, k) => {
          const p = beadPosition(beads.length + k, n);
          return (
            <g key={`open-${k}`} aria-hidden>
              <circle cx={p.x} cy={p.y} r={beadR} fill="var(--cream)" stroke="var(--sand-deep)" strokeWidth="2" strokeDasharray="4 4" />
              <text x={p.x} y={p.y + 5} textAnchor="middle" fill="var(--ink-soft)" style={{ fontSize: 14, fontWeight: 700 }}>
                +
              </text>
            </g>
          );
        })}

        {beads.map((b, i) => {
          const p = beadPosition(i, n);
          const paid = b.status === "paid";
          const overdue = b.status === "overdue";
          const outward = { x: Math.cos(p.a), y: Math.sin(p.a) };
          const crownStart = p.a - 0.95;
          const crownEnd = p.a + 0.95;
          const cr = beadR + 7;
          const crownPath = `M ${r2(p.x + cr * Math.cos(crownStart))} ${r2(p.y + cr * Math.sin(crownStart))} A ${r2(cr)} ${r2(cr)} 0 0 1 ${r2(
            p.x + cr * Math.cos(crownEnd),
          )} ${r2(p.y + cr * Math.sin(crownEnd))}`;
          const labelX = p.x + outward.x * (beadR + 26);
          const labelY = p.y + outward.y * (beadR + 26);
          return (
            <g key={b.address}>
              {overdue && (
                <circle cx={p.x} cy={p.y} r={beadR + 4} fill="var(--terracotta)" opacity="0.55" filter={`url(#glow-${uid})`}>
                  {!reduce && <animate attributeName="opacity" values="0.25;0.7;0.25" dur="1.8s" repeatCount="indefinite" />}
                </circle>
              )}
              <motion.circle
                cx={p.x}
                cy={p.y}
                r={beadR}
                initial={false}
                animate={{ fill: paid ? "var(--pandan)" : overdue ? "var(--surface)" : "var(--surface)" }}
                stroke={paid ? "var(--pandan)" : overdue ? "var(--terracotta)" : "var(--ink)"}
                strokeWidth={b.isYou ? 3.5 : 2}
                strokeDasharray={b.status === "pending" ? "0" : undefined}
                transition={{ duration: 0.5 }}
              />
              <text
                x={p.x}
                y={p.y + (b.emoji ? 7 : 5)}
                textAnchor="middle"
                fill={paid ? "#fff" : "var(--ink)"}
                style={{ fontSize: b.emoji ? beadR * 0.9 : beadR * 0.62, fontWeight: 800 }}
                aria-hidden
              >
                {b.emoji || initials(b.label)}
              </text>
              {/* Status badge so colour is never the only signal */}
              <g aria-hidden>
                <circle
                  cx={r2(p.x + beadR * 0.72)}
                  cy={r2(p.y + beadR * 0.72)}
                  r={8}
                  fill={paid ? "var(--surface)" : overdue ? "var(--terracotta)" : "var(--surface)"}
                  stroke={paid ? "var(--pandan)" : overdue ? "var(--terracotta)" : "var(--sand-deep)"}
                  strokeWidth="1.5"
                />
                <text
                  x={r2(p.x + beadR * 0.72)}
                  y={r2(p.y + beadR * 0.72 + 3.5)}
                  textAnchor="middle"
                  fill={paid ? "var(--pandan-ink)" : overdue ? "#fff" : "var(--ink-soft)"}
                  style={{ fontSize: 10, fontWeight: 900 }}
                >
                  {paid ? "✓" : overdue ? "!" : "…"}
                </text>
              </g>
              {b.slot != null && (
                <text
                  x={r2(p.x - beadR * 0.75)}
                  y={r2(p.y - beadR * 0.6)}
                  textAnchor="middle"
                  className="tabular"
                  fill="var(--ink-soft)"
                  style={{ fontSize: 10, fontWeight: 800 }}
                  aria-hidden
                >
                  #{b.slot}
                </text>
              )}
              {b.isRecipient && (
                <g>
                  <path d={crownPath} fill="none" stroke="var(--marigold)" strokeWidth="6" strokeLinecap="round" />
                  {[-0.6, 0, 0.6].map((d) => (
                    <circle
                      key={d}
                      cx={r2(p.x + (cr + 6) * Math.cos(p.a + d))}
                      cy={r2(p.y + (cr + 6) * Math.sin(p.a + d))}
                      r={3.2}
                      fill="var(--marigold)"
                    />
                  ))}
                  <g transform={`translate(${labelX.toFixed(1)} ${labelY.toFixed(1)})`}>
                    <rect x={-48} y={-13} width={96} height={24} rx={12} fill="var(--marigold)" />
                    <text x={0} y={4} textAnchor="middle" fill="var(--on-accent)" style={{ fontSize: 12, fontWeight: 800 }}>
                      {crownLabel}
                    </text>
                  </g>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="sr-only">
        <ul>
          {beads.map((b) => (
            <li key={b.address}>
              {b.label}
              {b.isYou ? " (you)" : ""}: {STATUS_TEXT[b.status]}
              {b.slot != null ? `, payout slot ${b.slot}` : ""}
              {b.isRecipient ? ", receives this round's pot" : ""}
            </li>
          ))}
          {openSeats > 0 && <li>{openSeats} open seats</li>}
        </ul>
      </figcaption>
    </figure>
  );
}
