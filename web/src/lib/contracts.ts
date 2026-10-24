import type { Address } from "viem";
import deployments from "@/config/deployments.json";
import { circleAbi, circleFactoryAbi, mockUsdcAbi, savingsRegistryAbi, fakeCircleDemoAbi } from "@/config/abis";

export { circleAbi, circleFactoryAbi, mockUsdcAbi, savingsRegistryAbi, fakeCircleDemoAbi };

export const addresses = {
  factory: deployments.CircleFactory as Address,
  registry: deployments.SavingsRegistry as Address,
  tusdc: deployments.MockUSDC as Address,
  usdc: deployments.USDC as Address,
  fake: deployments.FakeCircleDemo as Address,
  eas: deployments.EAS as Address,
  deployer: deployments.deployer as Address,
};

export const schemaUID = deployments.schemaUID as `0x${string}`;
export const deployBlock = BigInt(deployments.deployBlock);

export const TOKENS = {
  [addresses.tusdc.toLowerCase()]: { symbol: "tUSDC", name: "Test USD Coin", decimals: 6, faucet: true },
  [addresses.usdc.toLowerCase()]: { symbol: "USDC", name: "USDC (Circle)", decimals: 6, faucet: false },
} as Record<string, { symbol: string; name: string; decimals: number; faucet: boolean }>;

export function tokenInfo(token?: string) {
  return (token && TOKENS[token.toLowerCase()]) || { symbol: "tokens", name: "Unknown", decimals: 6, faucet: false };
}

export enum CircleState {
  Joining = 0,
  Drawing = 1,
  Active = 2,
  Completed = 3,
  Cancelled = 4,
}

export const STATE_LABEL: Record<CircleState, string> = {
  [CircleState.Joining]: "Gathering members",
  [CircleState.Drawing]: "Drawing the order",
  [CircleState.Active]: "Active",
  [CircleState.Completed]: "Completed",
  [CircleState.Cancelled]: "Cancelled",
};
