"use client";

import { motion } from "framer-motion";
import type { RoundClock } from "./types";
import { formatDuration } from "@/lib/format";

type Props = {
  cx: number;
  cy: number;
  r: number;
  collected: string;
  target: string;
  symbol: string;
  fraction: number;
  clock?: RoundClock;
  caption?: string;
};

function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
  const a0 = from * 2 * Math.PI - Math.PI / 2;
  const a1 = Math.min(to, 0.9999) * 2 * Math.PI - Math.PI / 2;
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const large = to - from > 0.5 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/**
 * The woven basket at the centre of the ring. It fills as contributions arrive; around it a
 * countdown ring shows time left to the deadline (marigold) and then through grace (terracotta).
 */
export function PotMeter({ cx, cy, r, collected, target, symbol, fraction, clock, caption }: Props) {
  const f = Math.max(0, Math.min(1, fraction));
  const level = cy + r - 2 * r * f;

  let remaining: { frac: number; tone: "deadline" | "grace" | "over"; label: string } | null = null;
  if (clock && clock.deadline > clock.start) {
    const { now, start, deadline, graceEnd } = clock;
    if (now < deadline) {
      remaining = {
        frac: (deadline - Math.max(now, start)) / (deadline - start),
        tone: "deadline",
        label: now < start ? `opens in ${formatDuration(start - now)}` : `due in ${formatDuration(deadline - now)}`,
      };
    } else if (now < graceEnd) {
      remaining = {
        frac: (graceEnd - now) / Math.max(1, graceEnd - deadline),
        tone: "grace",
        label: `grace ${formatDuration(graceEnd - now)}`,
      };
    } else {
      remaining = { frac: 0, tone: "over", label: "ready to settle" };
    }
  }
  const ringR = r + 12;

  return (
    <g>
      <defs>
        <clipPath id="basket-clip">
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
        <pattern id="basket-weave" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="12" height="12" fill="var(--marigold)" />
          <rect width="6" height="12" fill="var(--terracotta)" opacity="0.35" />
          <rect y="5" width="12" height="2" fill="var(--cream)" opacity="0.35" />
        </pattern>
      </defs>
      <circle cx={cx} cy={cy} r={ringR} fill="none" stroke="var(--sand)" strokeWidth="5" />
      {remaining && remaining.frac > 0 && (
        <path
          d={arcPath(cx, cy, ringR, 1 - remaining.frac, 1)}
          fill="none"
          stroke={remaining.tone === "grace" ? "var(--terracotta)" : "var(--marigold)"}
          strokeWidth="5"
          strokeLinecap="round"
        />
      )}
      <circle cx={cx} cy={cy} r={r} fill="var(--surface)" stroke="var(--sand-deep)" strokeWidth="2" />
      <g clipPath="url(#basket-clip)">
        <motion.rect
          x={cx - r}
          width={2 * r}
          height={2 * r + 4}
          fill="url(#basket-weave)"
          initial={false}
          animate={{ y: level }}
          transition={{ type: "spring", stiffness: 60, damping: 16 }}
        />
      </g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--ink)" strokeOpacity="0.15" strokeWidth="1" />
      <text
        x={cx}
        y={cy - 18}
        textAnchor="middle"
        fill="var(--ink-soft)"
        style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em" }}
      >
        {caption ?? "POT"}
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        className="font-display tabular"
        fill="var(--ink)"
        style={{ fontSize: 30, fontWeight: 600 }}
      >
        {collected}
      </text>
      <text x={cx} y={cy + 30} textAnchor="middle" className="tabular" fill="var(--ink-soft)" style={{ fontSize: 11.5, fontWeight: 600 }}>
        of {target} {symbol}
      </text>
      {remaining && (
        <text
          x={cx}
          y={cy + 48}
          textAnchor="middle"
          className="tabular"
          style={{ fontSize: 11, fontWeight: 700 }}
          fill={remaining.tone === "deadline" ? "var(--ink-soft)" : "var(--terracotta)"}
        >
          {remaining.label}
        </text>
      )}
    </g>
  );
}
