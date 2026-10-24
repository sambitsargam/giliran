import type { Address } from "viem";
import { addresses, circleAbi, mockUsdcAbi } from "./contracts";
import type { ContractCall } from "./useTx";
import type { WalletState } from "./useWallet";

/**
 * Prepends whatever a payment needs: a faucet drip for tUSDC when the balance is short, and an
 * approval when the allowance is short. With a smart wallet these ride in the same batch.
 */
export function fundingCalls(token: Address, spender: Address, needed: bigint, w?: WalletState): ContractCall[] {
  const calls: ContractCall[] = [];
  const isTest = token.toLowerCase() === addresses.tusdc.toLowerCase();
  if (isTest && w && w.balance < needed && w.faucetAvailableAt === 0) {
    calls.push({ address: token, abi: mockUsdcAbi, functionName: "faucet" });
  }
  if (!w || w.allowance < needed) {
    calls.push({ address: token, abi: mockUsdcAbi, functionName: "approve", args: [spender, needed] });
  }
  return calls;
}

export function joinCalls(circle: Address, token: Address, contribution: bigint, prepayRounds: number, w?: WalletState) {
  const needed = contribution * BigInt(1 + prepayRounds);
  const action: ContractCall =
    prepayRounds > 0
      ? { address: circle, abi: circleAbi, functionName: "joinWithPrepay", args: [prepayRounds] }
      : { address: circle, abi: circleAbi, functionName: "join" };
  return [...fundingCalls(token, circle, needed, w), action];
}

export function contributeCalls(circle: Address, token: Address, contribution: bigint, w?: WalletState) {
  return [...fundingCalls(token, circle, contribution, w), { address: circle, abi: circleAbi, functionName: "contribute" } as ContractCall];
}

export function prepayCalls(circle: Address, token: Address, contribution: bigint, rounds: number, w?: WalletState) {
  return [
    ...fundingCalls(token, circle, contribution * BigInt(rounds), w),
    { address: circle, abi: circleAbi, functionName: "prepay", args: [rounds] } as ContractCall,
  ];
}

/** Whether the wallet can cover `needed` now (counting a faucet drip that would be batched in). */
export function canAfford(token: Address, needed: bigint, w?: WalletState) {
  if (!w) return true;
  const isTest = token.toLowerCase() === addresses.tusdc.toLowerCase();
  const drip = isTest && w.faucetAvailableAt === 0 ? 100_000_000n : 0n;
  return w.balance + drip >= needed;
}
