import "server-only";
import {
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  encodeFunctionData,
  fallback,
  http,
  keccak256,
  nonceManager,
  parseEther,
  parseEventLogs,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { createHmac } from "node:crypto";
import { baseSepolia } from "viem/chains";
import { addresses, circleAbi, circleFactoryAbi, mockUsdcAbi, CircleState } from "@/lib/contracts";
import { decrypt, encrypt, kvGet, kvSet } from "./store";

export const DEMO = {
  members: 5,
  contribution: 1_000_000n, // 1 tUSDC
  roundDuration: 120,
  graceDuration: 30,
  joinWindow: 60 * 60,
  // Judges' smart wallets get a small gas drip when no paymaster is configured.
  ethDrip: parseEther("0.0004"),
  ethDripBelow: parseEther("0.0001"),
};

export const BOT_PROFILES = [
  { name: "Ate Rosa", emoji: "🌺" },
  { name: "Kuya Ben", emoji: "🛵" },
  { name: "Bu Sari", emoji: "🌾" },
  { name: "Mbak Dewi", emoji: "🧵" },
];

// Public endpoints throttle datacenter IPs now and then; fall through several with retries.
const RPCS = [
  process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org",
  "https://base-sepolia-rpc.publicnode.com",
  "https://base-sepolia.drpc.org",
];
const transport = () => fallback(RPCS.map((u) => http(u, { retryCount: 2, retryDelay: 400, timeout: 20_000 })));
export const server = createPublicClient({ chain: baseSepolia, transport: transport(), pollingInterval: 1_000 });

function normKey(k: string): Hex {
  const t = k.trim();
  return (t.startsWith("0x") ? t : `0x${t}`) as Hex;
}

const g = globalThis as unknown as { __giliranAccounts?: { deployer: PrivateKeyAccount; bots: PrivateKeyAccount[] } };

export function accounts() {
  if (g.__giliranAccounts) return g.__giliranAccounts;
  const dk = process.env.DEPLOYER_PRIVATE_KEY;
  const bk = process.env.BOT_PRIVATE_KEYS;
  if (!dk || !bk) throw new Error("Demo server is not configured (missing keys).");
  const deployer = privateKeyToAccount(normKey(dk), { nonceManager });
  const bots = bk
    .split(",")
    .filter(Boolean)
    .slice(0, DEMO.members - 1)
    .map((k) => privateKeyToAccount(normKey(k), { nonceManager }));
  if (bots.length < DEMO.members - 1) throw new Error("Demo server needs four bot keys.");
  g.__giliranAccounts = { deployer, bots };
  return g.__giliranAccounts;
}

export function wallet(account: PrivateKeyAccount) {
  return createWalletClient({ account, chain: baseSepolia, transport: transport() });
}

async function confirm(hash: Hash) {
  const r = await server.waitForTransactionReceipt({ hash, timeout: 60_000 });
  if (r.status !== "success") throw new Error(`Transaction reverted: ${hash}`);
  return r;
}

type DemoRecord = { secret: Hex; judge?: Address; createdAt: number };

/**
 * Demo secrets are derived, not stored: HMAC(DEMO_SECRET_KEY, joinDeadline). The server picks the
 * deadline and can read it back from the circle, so any serverless instance can reveal, while
 * nobody without the key can predict the secret.
 */
export function demoSecret(joinDeadline: bigint): Hex {
  const key = process.env.DEMO_SECRET_KEY || process.env.DEPLOYER_PRIVATE_KEY || "";
  if (!key) throw new Error("Demo server is not configured (missing DEMO_SECRET_KEY).");
  return `0x${createHmac("sha256", key).update(`giliran-demo:${joinDeadline}`).digest("hex")}`;
}

export async function saveDemo(circle: Address, rec: DemoRecord) {
  await kvSet(`demo:${circle.toLowerCase()}`, encrypt(JSON.stringify(rec)), 60 * 60 * 24 * 7);
}

export async function loadDemo(circle: Address): Promise<DemoRecord | null> {
  const blob = await kvGet(`demo:${circle.toLowerCase()}`);
  if (!blob) return null;
  try {
    return JSON.parse(decrypt(blob)) as DemoRecord;
  } catch {
    return null;
  }
}

/** Make sure a bot can cover deposit + all prepaid rounds; top up from the faucet if needed. */
async function readyBot(bot: PrivateKeyAccount, needed: bigint) {
  const bal = await server.readContract({ address: addresses.tusdc, abi: mockUsdcAbi, functionName: "balanceOf", args: [bot.address] });
  if (bal >= needed) return;
  const availableAt = await server.readContract({ address: addresses.tusdc, abi: mockUsdcAbi, functionName: "faucetAvailableAt", args: [bot.address] });
  if (availableAt !== 0n) throw new Error("A demo bot is out of tUSDC until its faucet cools down. Try again later.");
  await confirm(await wallet(bot).writeContract({ address: addresses.tusdc, abi: mockUsdcAbi, functionName: "faucet" }));
}

async function botJoin(bot: PrivateKeyAccount, circle: Address) {
  const rounds = DEMO.members;
  const needed = DEMO.contribution * BigInt(1 + rounds);
  await readyBot(bot, needed);
  const w = wallet(bot);
  await confirm(await w.writeContract({ address: addresses.tusdc, abi: mockUsdcAbi, functionName: "approve", args: [circle, needed] }));
  return confirm(await w.writeContract({ address: circle, abi: circleAbi, functionName: "joinWithPrepay", args: [rounds] }));
}

/** Gives a judge's fresh smart wallet enough Base Sepolia ETH for a handful of calls. */
export async function dripEth(to: Address): Promise<Hash | null> {
  if (process.env.NEXT_PUBLIC_PAYMASTER_URL) return null;
  const bal = await server.getBalance({ address: to });
  if (bal >= DEMO.ethDripBelow) return null;
  const { deployer } = accounts();
  const hash = await wallet(deployer).sendTransaction({ to, value: DEMO.ethDrip });
  await confirm(hash);
  return hash;
}

/** Creates a 5-seat demo circle, seats four prepaid bots, and leaves the last seat for the judge. */
export async function createDemoCircle(judge?: Address) {
  const { deployer, bots } = accounts();
  const now = Math.floor(Date.now() / 1000);
  const joinDeadline = BigInt(now + DEMO.joinWindow);
  const secret = demoSecret(joinDeadline);
  const commit = keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "address" }], [secret, deployer.address]));

  const [createHash, dripHash] = await Promise.all([
    wallet(deployer).writeContract({
      address: addresses.factory,
      abi: circleFactoryAbi,
      functionName: "createCircle",
      args: [
        {
          token: addresses.tusdc,
          contribution: DEMO.contribution,
          memberCap: DEMO.members,
          roundDuration: DEMO.roundDuration,
          graceDuration: DEMO.graceDuration,
          joinDeadline,
          demo: true,
        },
        commit,
      ],
    }),
    judge ? dripEth(judge).catch(() => null) : Promise.resolve(null),
  ]);
  const receipt = await confirm(createHash);
  const created = parseEventLogs({ abi: circleFactoryAbi, logs: receipt.logs, eventName: "CircleCreated" })[0];
  if (!created) throw new Error("CircleCreated event missing");
  const circle = created.args.circle;
  await saveDemo(circle, { secret, judge, createdAt: Date.now() });

  const joins = await Promise.all(bots.map((b) => botJoin(b, circle)));
  return {
    circle,
    createHash,
    dripHash,
    botJoins: joins.map((r) => r.transactionHash),
    bots: bots.map((b, i) => ({ address: b.address, ...BOT_PROFILES[i] })),
  };
}

async function circleState(circle: Address) {
  const [state, fillBlock] = await Promise.all([
    server.readContract({ address: circle, abi: circleAbi, functionName: "state" }),
    server.readContract({ address: circle, abi: circleAbi, functionName: "fillBlock" }),
  ]);
  return { state: Number(state) as CircleState, fillBlock };
}

/** Reveals the order for a full demo circle using the server-held commit secret. */
export async function revealDemo(circle: Address): Promise<{ hash?: Hash; status: string }> {
  const { state, fillBlock } = await circleState(circle);
  if (state === CircleState.Active || state === CircleState.Completed) return { status: "already-drawn" };
  if (state !== CircleState.Drawing) return { status: "not-full" };
  const { deployer } = accounts();
  const [joinDeadline, commit] = await Promise.all([
    server.readContract({ address: circle, abi: circleAbi, functionName: "joinDeadline" }),
    server.readContract({ address: circle, abi: circleAbi, functionName: "orderCommit" }),
  ]);
  let secret = demoSecret(joinDeadline);
  if (keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "address" }], [secret, deployer.address])) !== commit) {
    const rec = await loadDemo(circle);
    if (!rec) throw new Error("This server doesn't hold the secret for that circle. Use the fallback draw after the timeout.");
    secret = rec.secret;
  }

  // blockhash(fillBlock + 1) must exist, so wait for one more block.
  for (let i = 0; i < 20; i++) {
    if ((await server.getBlockNumber()) > fillBlock + 1n) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  const hash = await wallet(deployer).writeContract({ address: circle, abi: circleAbi, functionName: "revealOrder", args: [secret] });
  await confirm(hash);
  return { hash, status: "revealed" };
}

/** Nudges settleRound when a demo round is ready, so the demo never stalls. */
export async function settleDemo(circle: Address): Promise<{ hash?: Hash; status: string }> {
  const isDemo = await server.readContract({ address: circle, abi: circleAbi, functionName: "demo" });
  if (!isDemo) throw new Error("Only demo circles are nudged by the server.");
  const { state } = await circleState(circle);
  if (state === CircleState.Drawing) return revealDemo(circle);
  if (state !== CircleState.Active) return { status: "idle" };
  try {
    await server.simulateContract({ address: circle, abi: circleAbi, functionName: "settleRound", account: accounts().deployer.address });
  } catch {
    return { status: "not-ready" };
  }
  const hash = await wallet(accounts().deployer).writeContract({ address: circle, abi: circleAbi, functionName: "settleRound" });
  await confirm(hash).catch(() => undefined);
  return { hash, status: "settled" };
}

/**
 * The organiser of every demo circle is the server key, so it really does try to take the pot.
 * Gas is fixed to skip estimation (which would refuse a reverting call), so the attempt lands
 * on-chain as a failed transaction anyone can inspect.
 */
export async function attemptWithdraw(circle: Address): Promise<{ hash: Hash; status: "reverted" | "success" }> {
  const isDemo = await server.readContract({ address: circle, abi: circleAbi, functionName: "demo" });
  if (!isDemo) throw new Error("Only demo circles.");
  const { deployer } = accounts();
  const hash = await wallet(deployer).sendTransaction({
    to: circle,
    data: encodeFunctionData({ abi: circleAbi, functionName: "organiserWithdraw" }),
    gas: 60_000n,
  });
  const r = await server.waitForTransactionReceipt({ hash, timeout: 60_000 });
  return { hash, status: r.status };
}
