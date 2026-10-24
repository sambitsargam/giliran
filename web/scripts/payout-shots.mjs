// Captures the circle room during a live payout and the reverted-withdraw demo step.
//   node scripts/payout-shots.mjs https://… <judgePrivateKey>
import { chromium, devices } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const [base, pk] = process.argv.slice(2);
const dep = JSON.parse(readFileSync(new URL("../src/config/deployments.json", import.meta.url), "utf8"));
const out = new URL("../../docs/screenshots/", import.meta.url).pathname;
const rpc = "https://sepolia.base.org";
const cast = (...a) => execFileSync("cast", a, { encoding: "utf8" }).trim();
const me = cast("wallet", "address", "--private-key", pk);
const post = (p, b) => fetch(base + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }).then((r) => r.json());

const { circle } = await post("/api/demo/new", { member: me });
console.log("circle", circle);
cast("send", dep.MockUSDC, "faucet()", "--private-key", pk, "--rpc-url", rpc);
cast("send", dep.MockUSDC, "approve(address,uint256)", circle, "2000000", "--private-key", pk, "--rpc-url", rpc);
cast("send", circle, "join()", "--private-key", pk, "--rpc-url", rpc);
console.log("reveal", await post("/api/demo/reveal", { circle }));
while (cast("call", circle, "state()(uint8)", "--rpc-url", rpc) !== "2") await new Promise((r) => setTimeout(r, 2000));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${base}/c/${circle}`, { waitUntil: "load" });
await page.waitForSelector("text=Rules locked on-chain");
await page.waitForTimeout(2000);
await page.screenshot({ path: `${out}circle-room-before-payout-desktop.png` });
const tx = JSON.parse(cast("send", circle, "contribute()", "--private-key", pk, "--rpc-url", rpc, "--json")).transactionHash;
console.log("payout tx", tx);
await page.waitForSelector("text=paid out:", { timeout: 30_000 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}circle-room-payout-desktop.png` });

const w = await post("/api/demo/withdraw", { circle });
console.log("withdraw", w);
const m = await browser.newContext({ ...devices["iPhone 13"], viewport: { width: 390, height: 844 } });
await m.addInitScript(
  ([c, h]) => localStorage.setItem("giliran.demo", JSON.stringify({ circle: c, step: 2, withdrawHash: h })),
  [circle, w.hash],
);
const mp = await m.newPage();
await mp.goto(`${base}/demo`, { waitUntil: "load" });
await mp.waitForSelector("text=Transaction failed. The pot didn't move.");
await mp.waitForTimeout(800);
await mp.screenshot({ path: `${out}withdraw-reverted-mobile.png` });
await browser.close();
console.log(JSON.stringify({ circle, payoutTx: tx, withdrawTx: w.hash, judge: me }));
