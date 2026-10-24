# Threat model

Scope: the `Circle`, `CircleFactory` and `SavingsRegistry` contracts on Base Sepolia, the web app, and the demo server. This is a hackathon prototype; it has not been audited.

## Organiser theft

**Threat:** the person who set up the circle disappears with the pot (the Kedah and East Java cases).

**Mitigation:** there is no key to steal with. `Circle` has no owner, admin, pause, upgrade, or withdraw function. `receive()`, `fallback()` and `organiserWithdraw()` revert with `NoOneCanWithdraw()`. Tokens leave a circle only as (a) a round's pot to that round's recipient, (b) a member's own deposit at completion, or (c) a member's own refund if the circle never fills. The organiser's only extra ability is revealing the order they committed to.

**Tested:** `test_OrganiserWithdrawAlwaysReverts`, `test_ReceiveReverts`, `test_FallbackReverts`, invariant `invariant_PaidOutNeverExceedsPaidIn`.

## Made-up members

**Threat:** a scheme pads its member list so it looks full and safe (East Java).

**Mitigation:** every seat requires a funded deposit pulled at `join()`. The checker reads `members()` and `depositOf()` for any `ICircleView` contract and flags zero-deposit members. Non-factory contracts fail the "created by the Giliran factory" check regardless of what they claim.

## Early-collect default

**Threat:** a member collects an early pot and then stops paying.

**Mitigation (reduces, does not eliminate):**
- Order is tiered by reputation: members with a record take early slots; tier-0 newcomers always take the last slots, where they are net savers.
- Each member's one-round deposit covers a missed payment.
- Every missed payment increments `missedPayments` and writes a public, non-revocable EAS attestation, which follows the address to future circles and lenders.
- If the deposit runs out, the recipient receives what was collected and a `Shortfall` is recorded; the circle still completes.

**Residual risk:** a determined defaulter in an early slot can still cost later recipients up to (rounds remaining − 1) × contribution. Roadmap: guarantor stake for early slots.

## Order manipulation

**Threat:** the organiser rigs the payout order.

**Mitigation:** commit-reveal. The organiser commits `keccak256(secret, organiser)` before anyone joins. The seed mixes the secret with `blockhash(fillBlock + 1)`, which nobody knows at commit time. Revealing after 256 blocks is refused (the hash would read as zero and be predictable). If the organiser stalls, anyone can `fallbackDraw()` after the timeout, and the organiser loses the right to reveal.

**Residual risk:** a block producer could influence `blockhash`; the organiser could choose not to reveal if they dislike the outcome (falling back to a later-block draw they also can't control). Commit-reveal is weaker than VRF; Chainlink VRF is on the roadmap.

## Reentrancy

All state-changing functions are `nonReentrant` (OpenZeppelin `ReentrancyGuard`). State (`currentRound`, deposits, counters) is updated before token transfers. Tokens are restricted to tUSDC and Circle's USDC at the factory, so no hook-bearing tokens.

## Griefing settle

**Threat:** someone calls `settleRound()` to force a default or stall a circle.

**Mitigation:** `settleRound()` only succeeds when the round is genuinely due: after deadline + grace, or after the round opens with every member already paid. Otherwise it reverts with `NothingToSettle`. A recipient whose transfer fails (e.g. a blacklisted address) is credited in `owed` instead of reverting, so nobody can freeze the circle by being an unpayable recipient.

## Lost phone

Passkeys sync through the platform keychain (iCloud Keychain / Google Password Manager), so a new phone usually restores access. If not, the member's funds stay in the circle and their wallet cannot act. Roadmap: guardian recovery with circle members as 2-of-3 guardians.

## Privacy leakage

- Names, avatars and circle names are never on-chain; they live in `localStorage` and invite-link parameters.
- The Passport shows counts only: no amounts, names, or circle lists.
- Amounts and membership are visible on-chain to anyone who knows a circle address. Circles are invite-only with no discovery view, but addresses are not secret. Coinbase Smart Wallet uses one account per passkey, so the same account appears across circles.

## Demo server keys

The demo server holds a funded deployer key and four bot keys **on testnet only**. They can create demo circles, join with bots, reveal demo orders, nudge settlement, and send the deliberately failing withdraw. They have no special power over any circle; the deployer is an ordinary organiser. Routes are rate-limited per IP; commit secrets are AES-256-GCM encrypted at rest. Keys are read from server-only environment variables and never shipped to the client.

## Out of scope / known limitations

- No audit. Not for real money.
- A legal opinion per country is required before any pilot.
- Off-ramps to local currency require a licensed partner and KYC.
