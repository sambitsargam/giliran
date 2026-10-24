"use client";

import { ETH_FAUCET } from "@/lib/chain";
import { PAYMASTER_URL } from "@/lib/wagmi";
import type { WalletState } from "@/lib/useWallet";

/** Without a paymaster, an empty wallet needs a little test ETH for gas. */
export function GasHelp({ w }: { w?: WalletState }) {
  if (PAYMASTER_URL || !w || w.eth > 0n) return null;
  return (
    <div className="rounded-2xl border border-marigold bg-marigold/10 p-4 text-sm">
      <p className="font-semibold">Get test ETH for gas</p>
      <p className="mt-1 text-ink-soft">
        This wallet has no Base Sepolia ETH yet. Grab a little from the official faucet, then come back. (Gas
        sponsorship removes this step when a paymaster is configured.)
      </p>
      <a className="btn btn-ghost mt-3 !min-h-[44px]" href={ETH_FAUCET} target="_blank" rel="noreferrer">
        Open Base Sepolia faucet ↗
      </a>
    </div>
  );
}
