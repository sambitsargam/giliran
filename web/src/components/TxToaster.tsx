"use client";

import { AnimatePresence, motion } from "framer-motion";
import { toastStore, useToasts, type Toast } from "@/lib/toasts";
import { txUrl } from "@/lib/chain";

const ICON: Record<Toast["status"], string> = {
  wallet: "◔",
  pending: "◌",
  success: "✓",
  error: "!",
  info: "i",
};

export function TxToaster() {
  const toasts = useToasts();
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
      aria-live="polite"
      role="status"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <TxToast key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}

export function TxToast({ toast: t }: { toast: Toast }) {
  const tone =
    t.status === "success"
      ? "border-pandan"
      : t.status === "error"
        ? t.expected
          ? "border-marigold"
          : "border-terracotta"
        : "border-sand-deep";
  const iconBg =
    t.status === "success"
      ? "bg-pandan text-white"
      : t.status === "error"
        ? t.expected
          ? "bg-marigold text-on-accent"
          : "bg-terracotta text-white"
        : "bg-surface-2 text-ink";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8 }}
      className={`mat-card pointer-events-auto w-full max-w-sm border-l-4 ${tone} p-3 pr-2`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${iconBg} ${
            t.status === "pending" || t.status === "wallet" ? "animate-pulse" : ""
          }`}
        >
          {ICON[t.status]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">{t.title}</p>
          {t.detail && <p className="mt-0.5 text-sm text-ink-soft break-words">{t.detail}</p>}
          {t.hash && (
            <a href={txUrl(t.hash)} target="_blank" rel="noreferrer" className="link mt-1 inline-block text-sm font-semibold">
              View on BaseScan ↗
            </a>
          )}
        </div>
        <button
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-surface-2"
          onClick={() => toastStore.dismiss(t.id)}
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}
