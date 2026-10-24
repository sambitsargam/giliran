"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect, type Connector } from "wagmi";
import { signIn, useSignInOpen } from "@/lib/signInStore";
import { PasskeyIcon } from "./ConnectButton";
import { LogoMark } from "./Logo";

/**
 * Passkey first (a Coinbase Smart Wallet created with Face ID / fingerprint, no app needed),
 * then any browser wallet the page discovers via EIP-6963.
 */
export function SignInSheet() {
  const open = useSignInOpen();
  const { isConnected } = useAccount();
  const { connectors, connectAsync } = useConnect();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const firstBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isConnected && open) signIn.close();
  }, [isConnected, open]);

  useEffect(() => {
    if (!open) return;
    firstBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && signIn.close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const passkey = connectors.find((c) => c.id === "coinbaseWalletSDK");
  // EIP-6963 wallets appear with their own id; the generic injected connector is the fallback.
  const browser = connectors.filter((c) => c.id !== "coinbaseWalletSDK" && c.id !== "injected");
  const generic = connectors.find((c) => c.id === "injected");
  const others: Connector[] = browser.length ? browser : generic ? [generic] : [];

  const connect = async (c: Connector) => {
    setError(null);
    setPending(c.uid);
    try {
      await connectAsync({ connector: c });
      signIn.close();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(/reject|denied|closed|cancel/i.test(msg) ? "Sign-in was cancelled." : c.id === "injected" ? "No browser wallet found on this device." : "Couldn't sign in. Try again.");
    } finally {
      setPending(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => signIn.close()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="signin-title"
            className="relative w-full max-w-md overflow-hidden rounded-t-[28px] bg-surface shadow-2xl sm:rounded-[28px]"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="weave h-2" aria-hidden />
            <div className="p-6 pb-8">
              <div className="flex items-start justify-between">
                <LogoMark size={40} />
                <button className="grid h-11 w-11 place-items-center rounded-full hover:bg-surface-2" onClick={() => signIn.close()} aria-label="Close">
                  ✕
                </button>
              </div>
              <h2 id="signin-title" className="font-display mt-3 text-3xl font-semibold">
                Sign in to Giliran
              </h2>
              <p className="mt-1 text-ink-soft">Your wallet is your membership card. Pick how you&apos;d like to hold it.</p>

              {passkey && (
                <button
                  ref={firstBtn}
                  className="group mt-6 flex w-full items-center gap-4 rounded-2xl border-2 border-ink bg-ink p-4 text-left text-cream transition hover:shadow-lg disabled:opacity-60"
                  onClick={() => connect(passkey)}
                  disabled={!!pending}
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-marigold text-on-accent">
                    <PasskeyIcon />
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center gap-2 font-bold">
                      Use a passkey
                      <span className="rounded-full bg-marigold px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-on-accent">
                        Recommended
                      </span>
                    </span>
                    <span className="mt-0.5 block text-sm opacity-80">
                      Face ID or fingerprint. No app, no seed phrase. New or returning.
                    </span>
                  </span>
                  <span aria-hidden className="text-xl transition group-hover:translate-x-0.5">
                    {pending === passkey.uid ? "…" : "→"}
                  </span>
                </button>
              )}

              <div className="mt-6 flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-ink-soft">
                <span className="h-px flex-1 bg-sand" />
                Already have a wallet?
                <span className="h-px flex-1 bg-sand" />
              </div>

              <ul className="mt-4 space-y-2">
                {others.map((c) => (
                  <li key={c.uid}>
                    <button
                      className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border border-sand-deep px-4 py-2.5 text-left font-semibold hover:bg-surface-2 disabled:opacity-60"
                      onClick={() => connect(c)}
                      disabled={!!pending}
                    >
                      {c.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element -- wallet icons are data URIs from EIP-6963
                        <img src={c.icon} alt="" className="h-8 w-8 rounded-lg" />
                      ) : (
                        <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2">
                          ◎
                        </span>
                      )}
                      <span className="flex-1">{c.id === "injected" ? "Browser wallet" : c.name}</span>
                      <span aria-hidden>{pending === c.uid ? "…" : "→"}</span>
                    </button>
                  </li>
                ))}
              </ul>

              {error && (
                <p className="mt-3 text-sm font-semibold text-terracotta" role="alert">
                  {error}
                </p>
              )}

              <p className="mt-6 text-xs leading-relaxed text-ink-soft">
                Passkey wallets are Coinbase Smart Wallets: the key stays in your phone&apos;s secure chip and the sign-in
                window opens on keys.coinbase.com. Giliran never sees it. This prototype runs on Base Sepolia with test
                money.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
