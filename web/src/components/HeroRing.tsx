"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { CircleRing } from "./ring/CircleRing";
import type { Bead } from "./ring/types";

const PEOPLE = [
  { label: "Ate Rosa", emoji: "🌺" },
  { label: "Kuya Ben", emoji: "🛵" },
  { label: "Bu Sari", emoji: "🌾" },
  { label: "Mbak Dewi", emoji: "🧵" },
  { label: "Tita Luz", emoji: "☕" },
  { label: "Joy", emoji: "🎒" },
];

/** A looping, illustrative round: members pay one by one, then the pot pays out. */
export function HeroRing() {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(reduce ? PEOPLE.length : 0);
  const round = Math.floor(tick / (PEOPLE.length + 2));
  const step = tick % (PEOPLE.length + 2);
  const recipient = round % PEOPLE.length;

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setTick((t) => t + 1), 1100);
    return () => clearInterval(id);
  }, [reduce]);

  const paidCount = Math.min(step, PEOPLE.length);
  const beads: Bead[] = PEOPLE.map((p, i) => ({
    address: `0x${i}`,
    label: p.label,
    emoji: p.emoji,
    status: i < paidCount ? "paid" : "pending",
    isRecipient: i === recipient,
    slot: ((i - recipient + PEOPLE.length) % PEOPLE.length) + round + 1,
  }));
  const paidOut = step === PEOPLE.length + 1 || (step === PEOPLE.length && !reduce);

  return (
    <div className="relative">
      <div className="weave-soft absolute inset-6 -z-10 rounded-full opacity-60" aria-hidden />
      <CircleRing
        beads={beads}
        collected={`${paidCount * 50}`}
        target={`${PEOPLE.length * 50}`}
        symbol="S$"
        fraction={paidCount / PEOPLE.length}
        potCaption={paidOut ? "PAID OUT" : "THIS ROUND"}
        crownLabel="Giliran mo!"
        payoutKey={step === PEOPLE.length ? tick : null}
        payoutTo={`0x${recipient}`}
        ariaLabel="Illustration: six members pay into a woven ring; when everyone has paid, the whole pot goes to the member whose turn it is."
        size={480}
      />
      <p className="mt-2 text-center text-sm text-ink-soft">Illustration · 6 members × S$50 a month</p>
    </div>
  );
}
