// Captures README screenshots from a running deployment.
//   node scripts/screenshots.mjs https://… <circle> <judge>
import { chromium, devices } from "@playwright/test";
import { readFileSync } from "node:fs";

const [base, circle, judge] = process.argv.slice(2);
const dep = JSON.parse(readFileSync(new URL("../src/config/deployments.json", import.meta.url), "utf8"));
const out = new URL("../../docs/screenshots/", import.meta.url).pathname;

const shots = [
  { name: "landing", path: "/" },
  { name: "circle-room", path: `/c/${circle}`, wait: "text=Rules locked on-chain" },
  { name: "checker-fake", path: `/check?address=${dep.FakeCircleDemo}`, wait: "text=red flags" },
  { name: "checker-real", path: `/check?address=${circle}`, wait: "text=This is a real Giliran circle." },
  { name: "passport", path: `/passport/${judge}`, wait: "text=For lenders: verify it yourself" },
  { name: "demo", path: "/demo", wait: "text=Try Giliran live" },
];

const browser = await chromium.launch();
for (const [label, ctxOpts] of [
  ["mobile", { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } }],
  ["desktop", { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }],
]) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  for (const s of shots) {
    await page.goto(base + s.path, { waitUntil: "load" });
    if (s.wait) await page.waitForSelector(s.wait, { timeout: 30_000 }).catch(() => console.warn(`wait failed: ${s.name}`));
    await page.waitForTimeout(1500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.screenshot({ path: `${out}${s.name}-${label}.png` });
    console.log(`${s.name}-${label}.png  overflow=${overflow}`);
  }
  await ctx.close();
}
await browser.close();
