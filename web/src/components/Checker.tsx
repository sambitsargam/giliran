"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { addresses } from "@/lib/contracts";
import { extractAddress, verdict, type CheckResult } from "@/lib/checker";
import { runChecks } from "@/lib/runChecks";
import { addressUrl } from "@/lib/chain";
import { Skeleton } from "./Skeleton";

export function Ribbon({ r, index }: { r: CheckResult; index: number }) {
  const cls = r.status === "pass" ? "ribbon-pass" : r.status === "fail" ? "ribbon-fail" : "ribbon-unknown";
  const icon = r.status === "pass" ? "✓" : r.status === "fail" ? "✕" : "?";
  const word = r.status === "pass" ? "Pass" : r.status === "fail" ? "Red flag" : "Unknown";
  return (
    <motion.li
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07 }}
      className="mat-card flex overflow-hidden"
    >
      <div className={`${cls} flex w-16 shrink-0 flex-col items-center justify-center gap-1 text-white sm:w-24`}>
        <span aria-hidden className="text-2xl font-black drop-shadow">
          {icon}
        </span>
        <span className="text-[11px] font-extrabold uppercase tracking-wider drop-shadow">{word}</span>
      </div>
      <div className="min-w-0 p-4">
        <p className="font-bold">{r.title}</p>
        <p className={`mt-0.5 font-semibold ${r.status === "fail" ? "text-terracotta" : r.status === "pass" ? "text-pandan-ink" : "text-ink-soft"}`}>
          {r.detail}
        </p>
        <p className="mt-1 text-sm text-ink-soft">{r.explain}</p>
      </div>
    </motion.li>
  );
}

export function useChecks(address: `0x${string}` | null) {
  return useQuery({
    queryKey: ["checks", address],
    enabled: !!address,
    staleTime: 15_000,
    queryFn: () => runChecks(address!),
  });
}

export function CheckerResults({ address }: { address: `0x${string}` }) {
  const q = useChecks(address);
  if (q.isLoading)
    return (
      <div className="space-y-3" role="status" aria-label="Running checks">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  if (q.error || !q.data)
    return (
      <p className="mat-card p-5 text-terracotta" role="alert">
        Couldn&apos;t read that address on Base Sepolia. Check it and try again.
      </p>
    );
  const v = verdict(q.data.results);
  const fails = q.data.results.filter((r) => r.status === "fail").length;
  return (
    <div className="space-y-4">
      <div
        className={`rounded-[var(--radius-mat)] p-5 text-white ${v === "real" ? "ribbon-pass" : v === "fake" ? "ribbon-fail" : "ribbon-unknown !text-ink"}`}
        role="status"
      >
        <p className="text-sm font-bold uppercase tracking-widest opacity-90">Verdict</p>
        <p className="font-display mt-1 text-3xl font-semibold drop-shadow-sm">
          {v === "real" ? "This is a real Giliran circle." : v === "fake" ? `Don't send money. ${fails} red flag${fails === 1 ? "" : "s"}.` : "Can't confirm this circle."}
        </p>
        <a className="mt-2 inline-block text-sm font-semibold underline underline-offset-4" href={addressUrl(address)} target="_blank" rel="noreferrer">
          {address.slice(0, 10)}…{address.slice(-6)} on BaseScan ↗
        </a>
      </div>
      <ul className="space-y-3">
        {q.data.results.map((r, i) => (
          <Ribbon key={r.id} r={r} index={i} />
        ))}
      </ul>
    </div>
  );
}

export function Checker({ initial, realCircle }: { initial?: string; realCircle?: string }) {
  const [input, setInput] = useState(initial ?? addresses.fake);
  const [target, setTarget] = useState<`0x${string}` | null>(extractAddress(initial ?? addresses.fake));
  const [error, setError] = useState<string | null>(null);

  const submit = (value: string) => {
    const a = extractAddress(value);
    if (!a) {
      setError("Paste a circle address (0x…) or a Giliran invite link.");
      return;
    }
    setError(null);
    setInput(value);
    setTarget(a);
  };

  return (
    <div className="space-y-5">
      <form
        className="mat-card space-y-3 p-4 sm:p-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <label htmlFor="check-input" className="text-sm font-semibold">
          Circle address or invite link
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="check-input"
            className="field font-mono text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="0x… or https://…/join/0x…"
            aria-invalid={!!error}
            aria-describedby={error ? "check-error" : undefined}
            spellCheck={false}
            autoComplete="off"
          />
          <button className="btn btn-primary sm:!px-8" type="submit">
            Check
          </button>
        </div>
        {error && (
          <p id="check-error" className="text-sm text-terracotta" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2 text-sm">
          <button type="button" className="btn btn-ghost !min-h-[40px] !py-1.5" onClick={() => submit(addresses.fake)}>
            Try the fake circle
          </button>
          {realCircle && (
            <button type="button" className="btn btn-ghost !min-h-[40px] !py-1.5" onClick={() => submit(realCircle)}>
              Try a real circle
            </button>
          )}
        </div>
      </form>
      {target && <CheckerResults address={target} />}
    </div>
  );
}
