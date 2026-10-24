# Judge walkthrough (3 minutes)

**Live app:** https://giliran-umber.vercel.app/demo — open it on your phone. No wallet or app needs to be installed.

Everything runs on Base Sepolia with test money. Each run creates a fresh circle for you.

| Time | Step | What to do | What to look for |
| --- | --- | --- | --- |
| 0:00 | **1. Join the circle** | Tap **Sign in to start** → **Use a passkey** (Face ID / fingerprint creates a Coinbase Smart Wallet). Tap **Open my demo circle** (~10 s: four members join and prepay). Tap **Join the last seat** and confirm once. | One confirmation covers faucet + approve + join (an EIP-5792 batch). The ring shows 5/5 seats. The order is drawn by commit-reveal and **you are slot #5**: the other four have completed circles before; you're a newcomer, so you save first and collect last and can't default on anyone. |
| 0:50 | **2. Watch the pot pay out** | Tap **Pay round 1 · 1 tUSDC**. | Your payment is the last one, so in the *same transaction* the contract sends the 5 tUSDC pot to round 1's member. The basket empties, threads fly to the crowned bead, and a "Round 1 paid out" card links to BaseScan. Optional: prepay the remaining rounds. |
| 1:30 | **3. Try to run with the money** | Tap **Try to run with the money**. | The demo organiser's key really sends `organiserWithdraw()`. It lands on-chain as a **failed transaction** with `NoOneCanWithdraw()` — open it on BaseScan. There is no owner, admin, pause, upgrade or withdraw path. |
| 2:00 | **4. Spot the fake circle** | Read the left column, then tap **Check my circle**. | The fake (`FakeCircleDemo`, a teaching contract) gets red ribbons: not from the factory, 5% fee, promised 20% return, pot larger than contributions, 7 of 10 members with no deposit, owner can withdraw. Your circle is all green. |
| 2:30 | **5. Open your Passport** | Scroll the Passport. | A passbook with a **PAID** stamp for your on-time payment, your tier (Newcomer), and a QR code a lender can scan. "For lenders" lists the EAS attestations (they appear on base-sepolia.easscan.org within about a minute). Counts only: no amounts, no names. |

## If something stalls

- **Wallet popup didn't open:** allow pop-ups for the site; the passkey window opens on keys.coinbase.com.
- **"Not enough test ETH":** the demo server drips a little gas to new wallets; wait a few seconds and retry, or use the faucet link shown.
- **Order not drawn after joining:** tap **Nudge it**. Anyone can also call `fallbackDraw()` after 10 minutes.
- **Rate limit:** 5 new demo circles per hour per IP.
- **Start over:** "Start over with a new circle" at the top of /demo.

## Verify the claims yourself

- Contracts (verified on Sourcify and BaseScan): see the README's address table.
- The rules: `Circle.sol` has `FEE_BPS = 0`, `promisedReturnBps() = 0`, and `organiserWithdraw()`, `receive()` and `fallback()` all revert with `NoOneCanWithdraw()`.
- Tests: `cd contracts && forge test` — 46 tests, including fuzzing (newcomers always last, payouts never exceed contributions) and invariants.
- Any circle address can be pasted into https://giliran-umber.vercel.app/check.
