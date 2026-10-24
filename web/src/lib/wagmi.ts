import { createConfig, http } from "wagmi";
import { coinbaseWallet, injected } from "wagmi/connectors";
import { chain, RPC_URL } from "./chain";

export const PAYMASTER_URL = process.env.NEXT_PUBLIC_PAYMASTER_URL || "";

export const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [
    // Passkey-first: Coinbase Smart Wallet only, no browser-extension flow on the main path.
    coinbaseWallet({ appName: "Giliran", preference: "smartWalletOnly" }),
    injected({ shimDisconnect: true }),
  ],
  transports: { [chain.id]: http(RPC_URL) },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
