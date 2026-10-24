"use client";

import { useCallback, useState } from "react";
import { useAccount, useConfig } from "wagmi";
import {
  getCapabilities,
  sendCalls,
  waitForCallsStatus,
  waitForTransactionReceipt,
  writeContract,
} from "wagmi/actions";
import type { Abi, Address, Hash } from "viem";
import { chain } from "./chain";
import { PAYMASTER_URL } from "./wagmi";
import { toastStore } from "./toasts";
import { friendlyError } from "./errors";

export type ContractCall = {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
};

export type TxResult = { ok: true; hash?: Hash } | { ok: false; error: string };

type Caps = { atomic: boolean; paymaster: boolean };

/**
 * Sends one or more contract calls as a single user action. With a smart wallet this is one
 * EIP-5792 batch (approve + action), sponsored when a paymaster URL is configured; otherwise
 * it falls back to sequential transactions.
 */
export function useTx() {
  const config = useConfig();
  const { address, connector } = useAccount();
  const [busy, setBusy] = useState(false);

  const capabilities = useCallback(async (): Promise<Caps> => {
    try {
      const all = await getCapabilities(config, { account: address, chainId: chain.id });
      const c = (all ?? {}) as Record<string, { supported?: boolean; status?: string } | undefined>;
      const atomic = c.atomic?.status === "supported" || c.atomic?.status === "ready" || !!c.atomicBatch?.supported;
      return { atomic, paymaster: !!c.paymasterService?.supported };
    } catch {
      return { atomic: false, paymaster: false };
    }
  }, [config, address]);

  const send = useCallback(
    async (title: string, calls: ContractCall[]): Promise<TxResult> => {
      if (!address) return { ok: false, error: "Sign in first." };
      setBusy(true);
      const id = toastStore.push({ title, status: "wallet", detail: "Confirm with your passkey…" });
      try {
        const caps = connector?.id === "injected" ? { atomic: false, paymaster: false } : await capabilities();
        let hash: Hash | undefined;
        if (caps.atomic || (PAYMASTER_URL && caps.paymaster)) {
          const { id: callsId } = await sendCalls(config, {
            account: address,
            chainId: chain.id,
            calls: calls.map((c) => ({ to: c.address, abi: c.abi, functionName: c.functionName, args: c.args })),
            capabilities: PAYMASTER_URL && caps.paymaster ? { paymasterService: { url: PAYMASTER_URL } } : undefined,
          });
          toastStore.update(id, { status: "pending", detail: "Waiting for Base Sepolia…" });
          const result = await waitForCallsStatus(config, { id: callsId, timeout: 90_000 });
          hash = result.receipts?.[result.receipts.length - 1]?.transactionHash;
          if (result.status !== "success") {
            toastStore.update(id, { status: "error", detail: "The transaction reverted.", hash });
            return { ok: false, error: "reverted" };
          }
        } else {
          for (const [i, c] of calls.entries()) {
            const h = await writeContract(config, {
              account: address,
              chainId: chain.id,
              address: c.address,
              abi: c.abi,
              functionName: c.functionName,
              args: c.args,
            } as never);
            toastStore.update(id, {
              status: "pending",
              hash: h,
              detail: calls.length > 1 ? `Step ${i + 1} of ${calls.length} sent…` : "Waiting for Base Sepolia…",
            });
            const receipt = await waitForTransactionReceipt(config, { hash: h, chainId: chain.id });
            hash = h;
            if (receipt.status !== "success") {
              toastStore.update(id, { status: "error", detail: "The transaction reverted.", hash: h });
              return { ok: false, error: "reverted" };
            }
          }
        }
        toastStore.update(id, { status: "success", detail: "Confirmed on Base Sepolia.", hash });
        return { ok: true, hash };
      } catch (err) {
        const msg = friendlyError(err);
        toastStore.update(id, { status: "error", detail: msg });
        return { ok: false, error: msg };
      } finally {
        setBusy(false);
      }
    },
    [address, config, connector, capabilities],
  );

  return { send, busy };
}
