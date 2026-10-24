// Demo bot maintenance.
//   pnpm bots:fund [--eth]   faucet tUSDC for each bot; with --eth, top up gas from the deployer
//   pnpm bots:bootstrap      run one bot-only circle to completion so bots reach tier 1
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import {
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  formatEther,
  formatUnits,
  http,
  keccak256,
  nonceManager,
  parseAbi,
  parseEther,
  parseEventLogs,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const dep = JSON.parse(readFileSync(new URL("../src/config/deployments.json", import.meta.url), "utf8"));
const rpc = process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org";
const norm = (k) => (k.trim().startsWith("0x") ? k.trim() : `0x${k.trim()}`);
const pub = createPublicClient({ chain: baseSepolia, transport: http(rpc) });
const deployer = privateKeyToAccount(norm(process.env.DEPLOYER_PRIVATE_KEY), { nonceManager });
const bots = process.env.BOT_PRIVATE_KEYS.split(",").filter(Boolean).map((k) => privateKeyToAccount(norm(k), { nonceManager }));
const w = (a) => createWalletClient({ account: a, chain: baseSepolia, transport: http(rpc) });

const usdcAbi = parseAbi([
  "function faucet()",
  "function balanceOf(address) view returns (uint256)",
  "function faucetAvailableAt(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
]);
const factoryAbi = parseAbi([
  "struct CircleConfig { address token; uint256 contribution; uint8 memberCap; uint32 roundDuration; uint32 graceDuration; uint64 joinDeadline; bool demo; }",
  "function createCircle(CircleConfig cfg, bytes32 orderCommit) returns (address)",
  "event CircleCreated(address indexed circle, address indexed organiser, address token, bool demo)",
]);
const circleAbi = parseAbi([
  "function joinWithPrepay(uint8 rounds)",
  "function revealOrder(bytes32 secret)",
  "function settleRound()",
  "function state() view returns (uint8)",
  "function fillBlock() view returns (uint256)",
  "function currentRound() view returns (uint256)",
  "function roundStart(uint256) view returns (uint256)",
]);
const registryAbi = parseAbi(["function tierOf(address) view returns (uint8)"]);

const done = async (hash) => {
  const r = await pub.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`reverted ${hash}`);
  return r;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fund() {
  const withEth = process.argv.includes("--eth");
  for (const b of bots) {
    const eth = await pub.getBalance({ address: b.address });
    if (withEth && eth < parseEther("0.001")) {
      await done(await w(deployer).sendTransaction({ to: b.address, value: parseEther("0.003") }));
    }
    const at = await pub.readContract({ address: dep.MockUSDC, abi: usdcAbi, functionName: "faucetAvailableAt", args: [b.address] });
    const bal = await pub.readContract({ address: dep.MockUSDC, abi: usdcAbi, functionName: "balanceOf", args: [b.address] });
    if (at === 0n && bal < 50_000_000n && (withEth || eth > 0n)) {
      await done(await w(b).writeContract({ address: dep.MockUSDC, abi: usdcAbi, functionName: "faucet" }));
    }
    const [e2, u2] = await Promise.all([
      pub.getBalance({ address: b.address }),
      pub.readContract({ address: dep.MockUSDC, abi: usdcAbi, functionName: "balanceOf", args: [b.address] }),
    ]);
    console.log(`${b.address}  ${formatEther(e2)} ETH  ${formatUnits(u2, 6)} tUSDC`);
  }
}

async function bootstrap() {
  const n = bots.length;
  const secret = toHex(randomBytes(32));
  const commit = keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "address" }], [secret, deployer.address]));
  const now = Math.floor(Date.now() / 1000);
  const r = await done(
    await w(deployer).writeContract({
      address: dep.CircleFactory,
      abi: factoryAbi,
      functionName: "createCircle",
      args: [{ token: dep.MockUSDC, contribution: 1_000_000n, memberCap: n, roundDuration: 60, graceDuration: 30, joinDeadline: BigInt(now + 3600), demo: true }, commit],
    }),
  );
  const circle = parseEventLogs({ abi: factoryAbi, logs: r.logs, eventName: "CircleCreated" })[0].args.circle;
  console.log("bootstrap circle", circle);
  await Promise.all(
    bots.map(async (b) => {
      await done(await w(b).writeContract({ address: dep.MockUSDC, abi: usdcAbi, functionName: "approve", args: [circle, 1_000_000n * BigInt(n + 1)] }));
      await done(await w(b).writeContract({ address: circle, abi: circleAbi, functionName: "joinWithPrepay", args: [n] }));
    }),
  );
  const fb = await pub.readContract({ address: circle, abi: circleAbi, functionName: "fillBlock" });
  while ((await pub.getBlockNumber()) <= fb + 1n) await sleep(1000);
  await done(await w(deployer).writeContract({ address: circle, abi: circleAbi, functionName: "revealOrder", args: [secret] }));
  while ((await pub.readContract({ address: circle, abi: circleAbi, functionName: "state" })) === 2) {
    const round = await pub.readContract({ address: circle, abi: circleAbi, functionName: "currentRound" });
    const start = await pub.readContract({ address: circle, abi: circleAbi, functionName: "roundStart", args: [round] });
    const wait = Number(start) - Math.floor(Date.now() / 1000) + 3;
    if (wait > 0) {
      console.log(`round ${round} opens in ${wait}s`);
      await sleep(wait * 1000);
    }
    try {
      await done(await w(deployer).writeContract({ address: circle, abi: circleAbi, functionName: "settleRound" }));
      console.log(`round ${round} paid out`);
    } catch {
      await sleep(3000);
    }
  }
  for (const b of bots) {
    const t = await pub.readContract({ address: dep.SavingsRegistry, abi: registryAbi, functionName: "tierOf", args: [b.address] });
    console.log(`${b.address} tier ${t}`);
  }
}

const cmd = process.argv[2];
if (cmd === "fund") await fund();
else if (cmd === "bootstrap") await bootstrap();
else console.log("usage: node scripts/bots.mjs fund [--eth] | bootstrap");
