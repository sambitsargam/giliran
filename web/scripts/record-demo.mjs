// Records the demo video: a real run of the live app with a scripted test wallet, captured as
// high-quality CDP screencast frames, with narration timing taken from pre-rendered clips.
//   node scripts/record-demo.mjs <base-url> <work-dir>
// <work-dir> must contain script.json and audio/<id>.mp3 + audio/<id>.srt.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, createWalletClient, fallback, http, nonceManager } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const [BASE, WORK] = process.argv.slice(2);
const FRAMES = join(WORK, "frames");
mkdirSync(FRAMES, { recursive: true });

const dur = (id) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", join(WORK, "audio", `${id}.mp3`)]).toString());
const srt = (id) =>
  readFileSync(join(WORK, "audio", `${id}.srt`), "utf8")
    .trim()
    .split(/\n\s*\n/)
    .map((b) => {
      const lines = b.split("\n");
      const [a, z] = lines[1].split(" --> ").map((t) => {
        const [h, m, s] = t.replace(",", ".").split(":");
        return +h * 3600 + +m * 60 + +s;
      });
      return { start: a, end: z, text: lines.slice(2).join(" ") };
    });

/** Splits sentence cues into short caption lines, timing each by its share of characters. */
function captionLines(cues) {
  const out = [];
  for (const c of cues) {
    const words = c.text.split(/\s+/);
    const chunks = [];
    let cur = [];
    for (const w of words) {
      cur.push(w);
      const text = cur.join(" ");
      if (cur.length >= 10 || (cur.length >= 5 && /[,;—:]$/.test(w)) || text.length > 62) {
        chunks.push(text);
        cur = [];
      }
    }
    if (cur.length) {
      // Fold a tiny tail into the previous line rather than flashing two words.
      if (cur.length <= 2 && chunks.length) chunks[chunks.length - 1] += " " + cur.join(" ");
      else chunks.push(cur.join(" "));
    }
    const total = chunks.reduce((n, x) => n + x.length, 0);
    let t = c.start;
    for (const x of chunks) {
      const d = ((c.end - c.start) * x.length) / total;
      out.push({ start: t, end: t + d, text: x });
      t += d;
    }
  }
  return out;
}

// ---- Scripted test wallet (EIP-1193 + EIP-6963), backed by a throwaway key ----
const RPCS = ["https://sepolia.base.org", "https://base-sepolia-rpc.publicnode.com", "https://base-sepolia.drpc.org"];
const transport = fallback(RPCS.map((u) => http(u, { retryCount: 2 })));
const account = privateKeyToAccount(generatePrivateKey(), { nonceManager });
const pub = createPublicClient({ chain: baseSepolia, transport });
const wallet = createWalletClient({ account, chain: baseSepolia, transport });
console.log("test wallet", account.address);

let authorized = false;
async function handle(method, params = []) {
  switch (method) {
    // Like a real wallet: no accounts until the user connects.
    case "eth_requestAccounts":
      authorized = true;
      return [account.address];
    case "eth_accounts":
      return authorized ? [account.address] : [];
    case "eth_chainId":
      return "0x14a34";
    case "net_version":
      return "84532";
    case "wallet_switchEthereumChain":
    case "wallet_addEthereumChain":
      return null;
    case "wallet_requestPermissions":
    case "wallet_getPermissions":
      return [{ parentCapability: "eth_accounts" }];
    case "wallet_getCapabilities":
    case "wallet_sendCalls":
      throw new Error("unsupported method");
    case "eth_sendTransaction": {
      const tx = params[0];
      return wallet.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value ? BigInt(tx.value) : undefined,
      });
    }
    case "personal_sign":
      return account.signMessage({ message: { raw: params[0] } });
    default:
      return pub.request({ method, params });
  }
}

const PROVIDER = `(() => {
  const listeners = {};
  const provider = {
    request: async ({ method, params }) => {
      try { return await window.__wallet(method, params || []); }
      catch (e) {
        const err = new Error((e && e.message) || String(e));
        err.code = /unsupported/.test(err.message) ? 4200 : -32603;
        throw err;
      }
    },
    on: (e, f) => { (listeners[e] = listeners[e] || []).push(f); return provider; },
    removeListener: (e, f) => { listeners[e] = (listeners[e] || []).filter((x) => x !== f); return provider; },
  };
  window.ethereum = provider;
  const icon = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#2F8F6B"/><path d="M8 12h16v10H8z" fill="#fff"/><circle cx="21" cy="17" r="2" fill="#2F8F6B"/></svg>');
  const info = { uuid: "5b4d8a0e-1c6f-4a3b-9e2d-7f1a0c9b8e11", name: "Test wallet", icon, rdns: "app.giliran.testwallet" };
  const announce = () => window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: Object.freeze({ info, provider }) }));
  window.addEventListener("eip6963:requestProvider", announce);
  announce();
})();`;

// Visible cursor and caption bar, re-created on every page load.
const OVERLAY = `(() => {
  const mount = () => {
    if (document.getElementById("__cursor")) return;
    const c = document.createElement("div");
    c.id = "__cursor";
    c.innerHTML = '<svg width="28" height="28" viewBox="0 0 28 28"><path d="M5 3l17 9.5-7.4 1.6L11 21z" fill="#1E1B4B" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, { position: "fixed", left: "0", top: "0", zIndex: 2147483647, pointerEvents: "none", transform: "translate(" + (window.__cx || 800) + "px," + (window.__cy || 450) + "px)", transition: "transform 60ms linear", filter: "drop-shadow(0 2px 3px rgba(0,0,0,.25))" });
    document.documentElement.appendChild(c);
    const ring = document.createElement("div");
    Object.assign(ring.style, { position: "fixed", width: "44px", height: "44px", margin: "-22px 0 0 -22px", borderRadius: "50%", border: "3px solid #F2A93B", zIndex: 2147483646, pointerEvents: "none", opacity: "0", transition: "opacity .35s, transform .35s", left: "0", top: "0" });
    document.documentElement.appendChild(ring);
    document.addEventListener("mousemove", (e) => { window.__cx = e.clientX; window.__cy = e.clientY; c.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)"; }, true);
    document.addEventListener("mousedown", (e) => {
      ring.style.left = e.clientX + "px"; ring.style.top = e.clientY + "px";
      ring.style.transition = "none"; ring.style.opacity = "1"; ring.style.transform = "scale(.4)";
      requestAnimationFrame(() => { ring.style.transition = "opacity .5s, transform .5s"; ring.style.opacity = "0"; ring.style.transform = "scale(1.4)"; });
    }, true);
    const cap = document.createElement("div");
    cap.id = "__cap";
    Object.assign(cap.style, { position: "fixed", left: "50%", bottom: "26px", transform: "translateX(-50%)", maxWidth: "78%", padding: "10px 22px", borderRadius: "14px", background: "rgba(18,16,46,.86)", color: "#FBF6EC", font: "600 21px/1.35 'Plus Jakarta Sans', system-ui, sans-serif", textAlign: "center", zIndex: 2147483645, pointerEvents: "none", opacity: "0", transition: "opacity .2s", boxShadow: "0 8px 30px rgba(0,0,0,.25)" });
    document.documentElement.appendChild(cap);
    window.__setCaption = (t) => { cap.textContent = t || ""; cap.style.opacity = t ? "1" : "0"; };
    if (window.__pendingCaption) window.__setCaption(window.__pendingCaption);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 810 },
  deviceScaleFactor: 4 / 3,
  colorScheme: "light",
  locale: "en-US",
});
await context.exposeFunction("__wallet", handle);
await context.addInitScript(PROVIDER);
await context.addInitScript(OVERLAY);
const page = await context.newPage();

// ---- Screencast capture ----
const cdp = await context.newCDPSession(page);
const frames = [];
const T0 = Date.now() / 1000;
let frameNo = 0;
cdp.on("Page.screencastFrame", async (f) => {
  const name = `f${String(frameNo++).padStart(6, "0")}.jpg`;
  frames.push({ name, t: Date.now() / 1000 - T0 });
  writeFileSync(join(FRAMES, name), Buffer.from(f.data, "base64"));
  await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
const now = () => Date.now() / 1000 - T0;

// ---- Helpers ----
let caption = "";
const setCaption = async (t) => {
  caption = t;
  await page.evaluate((x) => { window.__pendingCaption = x; if (window.__setCaption) window.__setCaption(x); }, t).catch(() => {});
};
let mouse = { x: 720, y: 405 };
async function moveTo(x, y, steps = 28) {
  const from = { ...mouse };
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // ease in-out
    await page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
    await sleep(12);
  }
  mouse = { x, y };
}
async function click(locator, { settle = 250 } = {}) {
  await locator.scrollIntoViewIfNeeded();
  await sleep(150);
  const b = await locator.boundingBox();
  await moveTo(b.x + b.width / 2, b.y + b.height / 2);
  await sleep(settle);
  await page.mouse.down();
  await sleep(70);
  await page.mouse.up();
}
async function goto(path) {
  await page.goto(BASE + path, { waitUntil: "load" });
  await page.mouse.move(mouse.x, mouse.y);
  await setCaption(caption);
}
async function smoothScrollTo(selectorOrY, ms = 1400) {
  await page.evaluate(
    async ([target, ms]) => {
      const el = typeof target === "string" ? document.querySelector(target) : null;
      const to = el ? el.getBoundingClientRect().top + window.scrollY - 90 : target;
      const from = window.scrollY;
      const t0 = performance.now();
      await new Promise((res) => {
        const step = (t) => {
          const k = Math.min(1, (t - t0) / ms);
          const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
          window.scrollTo(0, from + (to - from) * e);
          if (k < 1) requestAnimationFrame(step);
          else res();
        };
        requestAnimationFrame(step);
      });
    },
    [selectorOrY, ms],
  );
}
async function card(html) {
  await page.setContent(`<!doctype html><html><head><link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Plus+Jakarta+Sans:wght@500;700&display=swap" rel="stylesheet"><style>
    body{margin:0;height:100vh;display:grid;place-items:center;background:#1E1B4B;color:#FBF6EC;font-family:'Plus Jakarta Sans',sans-serif;overflow:hidden}
    .w{position:absolute;inset:0;opacity:.18;background-image:repeating-linear-gradient(45deg,#F2A93B 0 10px,transparent 10px 20px),repeating-linear-gradient(-45deg,#C2553B 0 10px,transparent 10px 20px)}
    .c{position:relative;text-align:center;padding:0 80px}
    h1{font-family:Fraunces,serif;font-size:96px;margin:24px 0 8px;letter-spacing:-.02em}
    p{font-size:30px;margin:0;opacity:.88}
    .s{margin-top:28px;font-size:20px;opacity:.7}
    .fade{animation:f 1.2s ease both}@keyframes f{from{opacity:0;transform:translateY(10px)}}
  </style></head><body><div class="w"></div><div class="c fade">${html}</div></body></html>`);
  await page.mouse.move(mouse.x, mouse.y);
  await sleep(600);
  await setCaption(caption);
}
const LOGO = readFileSync(new URL("../../docs/brand/giliran-logo.svg", import.meta.url), "utf8").replace('width="400" height="400"', 'width="150" height="150"');

const timeline = [];
/** Plays scene `id`'s narration from now, runs `actions`, and lasts at least as long as the audio. */
async function scene(id, actions) {
  const start = now();
  const length = dur(id);
  timeline.push({ id, start });
  const lines = captionLines(srt(id));
  const timers = lines.map((l) => setTimeout(() => setCaption(l.text), Math.max(0, l.start * 1000 - 80)));
  const endTimer = setTimeout(() => setCaption(""), length * 1000 + 150);
  await actions(start);
  const left = start + length + 0.5 - now();
  if (left > 0) await sleep(left * 1000);
  timers.forEach(clearTimeout);
  clearTimeout(endTimer);
  await setCaption("");
  console.log(`${id} start ${start.toFixed(1)}s len ${length.toFixed(1)}s took ${(now() - start).toFixed(1)}s`);
}
const until = async (start, sec) => {
  const left = start + sec - now();
  if (left > 0) await sleep(left * 1000);
};

// ---- The film ----
try {
  await card(`${LOGO}<h1>Giliran</h1><p>Savings circles nobody can run away with.</p>`);
  await sleep(1200);

  await scene("s01", async (t) => {
    await until(t, 4.5);
    await goto("/");
    await until(t, 9);
    await smoothScrollTo("#problem-heading", 2200);
    await sleep(2500);
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
  });

  await scene("s02", async () => {
    await smoothScrollTo(0, 1800);
    await sleep(5500);
    await smoothScrollTo("#who-heading", 2400);
  });

  await scene("s03", async () => {
    await goto("/demo");
    await sleep(1200);
    await click(page.getByRole("button", { name: /Sign in to start/ }));
    await sleep(1600);
    const passkey = page.getByRole("button", { name: /Use a passkey/ });
    const pb = await passkey.boundingBox();
    await moveTo(pb.x + pb.width * 0.4, pb.y + pb.height / 2);
    await sleep(2800);
    await click(page.getByRole("button", { name: /Test wallet/ }));
    await page.getByRole("button", { name: /Open my demo circle/ }).waitFor({ timeout: 30_000 });
  });

  await scene("s04", async () => {
    await click(page.getByRole("button", { name: /Open my demo circle/ }));
    await page.getByRole("button", { name: "Join the last seat" }).waitFor({ timeout: 120_000 });
    await sleep(800);
    await smoothScrollTo("figure", 1600);
    await sleep(1500);
    await smoothScrollTo(0, 1200);
  });

  await scene("s05", async () => {
    await click(page.getByRole("button", { name: "Join the last seat" }));
    await page.getByText(/Order drawn by commit-reveal/).waitFor({ timeout: 150_000 });
    await sleep(600);
    await smoothScrollTo("figure", 1800);
    await sleep(3500);
    await smoothScrollTo(0, 1400);
  });

  await scene("s06", async () => {
    await click(page.getByRole("button", { name: /Next: pay round 1/ }));
    await sleep(1200);
    await click(page.getByRole("button", { name: /Pay round 1/ }));
    await sleep(600);
    await smoothScrollTo("figure", 1500);
    await page.getByText(/paid out: /).waitFor({ timeout: 120_000 });
    await sleep(3200);
    await smoothScrollTo(0, 1200);
  });

  await scene("s07", async () => {
    await click(page.getByRole("button", { name: /Next: try to steal it/ }));
    await sleep(2200);
    await click(page.getByRole("button", { name: "Try to run with the money", exact: true }));
    await page.getByText("Transaction failed. The pot didn't move.").waitFor({ timeout: 90_000 });
    await sleep(800);
    await smoothScrollTo("[role=status] .font-display", 1200);
  });

  await scene("s08", async (t) => {
    await click(page.getByRole("button", { name: /Next: spot the fake circle/ }));
    await page.getByText(/red flags?\./).first().waitFor({ timeout: 60_000 });
    await sleep(1200);
    await page.evaluate(() => window.scrollBy({ top: 330, behavior: "smooth" }));
    await sleep(4200);
    await page.evaluate(() => window.scrollBy({ top: 360, behavior: "smooth" }));
    await until(t, 18.5);
    await click(page.getByRole("button", { name: "Check my circle" }));
    await page.getByText("This is a real Giliran circle.").waitFor({ timeout: 60_000 });
    await sleep(800);
  });

  await scene("s09", async () => {
    await smoothScrollTo(0, 900);
    const next = page.getByRole("button", { name: /Next: open your Passport/ });
    await next.scrollIntoViewIfNeeded();
    await click(next);
    await page.locator("article[aria-label*='Savings Passport']").waitFor({ timeout: 60_000 });
    await sleep(1500);
    await smoothScrollTo("article[aria-label*='Savings Passport']", 1800);
    await sleep(4000);
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
  });

  await scene("s10", async (t) => {
    await goto("/");
    await smoothScrollTo("#rules-heading", 2200);
    await until(t, Math.max(8, dur("s10") - 9));
    await card(`${LOGO}<h1>Giliran mo.</h1><p>It's your turn.</p><p class="s">giliran-umber.vercel.app · github.com/sambitsargam/giliran · Base Sepolia · No token</p>`);
  });
  await sleep(2500);
} finally {
  await cdp.send("Page.stopScreencast").catch(() => {});
  const end = now();
  await browser.close();
  writeFileSync(join(WORK, "timeline.json"), JSON.stringify({ end, scenes: timeline, frames }, null, 1));
  console.log(`frames ${frames.length}, length ${end.toFixed(1)}s`);
}
