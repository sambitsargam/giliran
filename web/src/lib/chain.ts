import { createPublicClient, fallback, http } from "viem";
import { baseSepolia } from "viem/chains";

export const chain = baseSepolia;
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org";
export const EXPLORER = "https://sepolia.basescan.org";
export const EASSCAN = "https://base-sepolia.easscan.org";
export const ETH_FAUCET = "https://docs.base.org/base-chain/tools/network-faucets";

export const publicClient = createPublicClient({
  chain,
  transport: fallback([http(RPC_URL), http("https://sepolia.base.org")]),
  batch: { multicall: true },
  pollingInterval: 2_000,
});

export const txUrl = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const addressUrl = (address: string) => `${EXPLORER}/address/${address}`;
export const codeUrl = (address: string) => `${EXPLORER}/address/${address}#code`;
export const sourcifyUrl = (address: string) =>
  `https://repo.sourcify.dev/contracts/full_match/${chain.id}/${address}/`;
export const easAddressUrl = (address: string) => `${EASSCAN}/address/${address}`;
export const easSchemaUrl = (uid: string) => `${EASSCAN}/schema/view/${uid}`;
