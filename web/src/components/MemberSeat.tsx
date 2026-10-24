import { initials } from "@/lib/format";
import type { BeadStatus } from "./ring/types";

const STATUS = {
  paid: { icon: "✓", text: "Paid", cls: "bg-pandan text-white" },
  pending: { icon: "…", text: "Waiting", cls: "bg-surface-2 text-ink-soft border border-sand-deep" },
  overdue: { icon: "!", text: "Overdue", cls: "bg-terracotta text-white" },
} as const;

const TIER = ["Newcomer", "Trusted", "Anchor"];

export function MemberSeat({
  label,
  emoji,
  status,
  statusText,
  slot,
  tier,
  isRecipient,
  isYou,
  received,
  note,
}: {
  label: string;
  emoji?: string;
  status: BeadStatus;
  statusText?: string;
  slot?: number;
  tier?: number;
  isRecipient?: boolean;
  isYou?: boolean;
  received?: boolean;
  note?: string;
}) {
  const s = STATUS[status];
  return (
    <li
      className={`flex min-h-[56px] items-center gap-3 rounded-2xl border px-3 py-2 ${
        isRecipient ? "border-marigold bg-marigold/10" : "border-sand"
      } ${isYou ? "ring-2 ring-ink/20" : ""}`}
    >
      <span
        aria-hidden
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-extrabold ${
          status === "paid" ? "bg-pandan text-white" : "border-2 border-ink bg-surface"
        }`}
      >
        {emoji || initials(label)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {label}
          {isRecipient && <span className="ml-2 rounded-full bg-marigold px-2 py-0.5 text-xs font-bold text-on-accent">Pot this round</span>}
        </p>
        <p className="text-xs text-ink-soft">
          {slot != null ? `Slot #${slot}` : "Slot not drawn yet"}
          {tier != null ? ` · ${TIER[tier] ?? "Tier " + tier}` : ""}
          {received ? " · received" : ""}
          {note ? ` · ${note}` : ""}
        </p>
      </div>
      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${s.cls}`}>
        <span aria-hidden>{s.icon}</span>
        {statusText ?? s.text}
      </span>
    </li>
  );
}
