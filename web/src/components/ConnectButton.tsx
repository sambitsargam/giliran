"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { signIn } from "@/lib/signInStore";
import { shortAddress } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export function ConnectButton({ compact = false }: { compact?: boolean }) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (isConnected && address) {
    return (
      <div className="relative" ref={ref}>
        <button
          className="btn btn-ghost !px-3 tabular"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-pandan" />
          {shortAddress(address)}
        </button>
        {open && (
          <div role="menu" className="mat-card absolute right-0 z-40 mt-2 w-56 p-2 text-sm">
            <Link role="menuitem" href={`/passport/${address}`} className="block rounded-lg px-3 py-3 hover:bg-surface-2" onClick={() => setOpen(false)}>
              My Savings Passport
            </Link>
            <button
              role="menuitem"
              className="block w-full rounded-lg px-3 py-3 text-left hover:bg-surface-2"
              onClick={() => navigator.clipboard?.writeText(address).catch(() => {})}
            >
              Copy address
            </button>
            <button
              role="menuitem"
              className="block w-full rounded-lg px-3 py-3 text-left text-terracotta hover:bg-surface-2"
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button className="btn btn-primary" onClick={() => signIn.open()}>
      <PasskeyIcon />
      {compact ? "Sign in" : t.connect}
    </button>
  );
}

export function PasskeyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M2 21c0-3.9 3.1-7 7-7 1.4 0 2.6.4 3.7 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="18" cy="14" r="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M18 16.5V22M18 19.5h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
