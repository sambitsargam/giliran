"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import type { Address } from "viem";
import { publicClient } from "./chain";
import { addresses, mockUsdcAbi } from "./contracts";

export type WalletState = {
  eth: bigint;
  balance: bigint;
  allowance: bigint;
  faucetAvailableAt: number;
};

/** The connected account's balances relevant to one circle and token. */
export function useWalletState(token?: Address, spender?: Address) {
  const { address } = useAccount();
  return useQuery({
    queryKey: ["wallet", address, token, spender],
    enabled: !!address && !!token,
    refetchInterval: 5_000,
    queryFn: async (): Promise<WalletState> => {
      const isTest = token!.toLowerCase() === addresses.tusdc.toLowerCase();
      const [eth, reads] = await Promise.all([
        publicClient.getBalance({ address: address! }),
        publicClient.multicall({
          allowFailure: true,
          contracts: [
            { address: token!, abi: mockUsdcAbi, functionName: "balanceOf", args: [address!] },
            { address: token!, abi: mockUsdcAbi, functionName: "allowance", args: [address!, spender ?? address!] },
            ...(isTest
              ? [{ address: token!, abi: mockUsdcAbi, functionName: "faucetAvailableAt", args: [address!] } as const]
              : []),
          ] as never,
        }) as Promise<{ result?: unknown }[]>,
      ]);
      return {
        eth,
        balance: (reads[0]?.result as bigint) ?? 0n,
        allowance: (reads[1]?.result as bigint) ?? 0n,
        faucetAvailableAt: isTest ? Number((reads[2]?.result as bigint) ?? 0n) : -1,
      };
    },
  });
}
