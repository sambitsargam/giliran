export const TIER_LABELS = ["Newcomer", "Trusted saver", "Anchor saver"] as const;

export function tierLabel(tier: number): string {
  return TIER_LABELS[tier] ?? `Tier ${tier}`;
}

/** Rows for showing a drawn order: slot number, tier label, and whether it's a newcomer slot. */
export function orderRows(order: readonly string[], tiers: readonly number[]) {
  return order.map((address, i) => ({
    slot: i + 1,
    address,
    tier: tiers[i] ?? 0,
    label: tierLabel(tiers[i] ?? 0),
    newcomerSlot: (tiers[i] ?? 0) === 0,
  }));
}

/** True when tiers never increase along the payout order (the contract's guarantee). */
export function isTierOrdered(tiers: readonly number[]): boolean {
  for (let i = 1; i < tiers.length; i++) if (tiers[i] > tiers[i - 1]) return false;
  return true;
}
