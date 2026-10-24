import { getLabels } from "./storage";
import { shortAddress } from "./format";

/** A friendly label for an address: "You", a locally saved name, or a short address. */
export function labelFor(address: string, you?: string): { label: string; emoji?: string } {
  if (you && address.toLowerCase() === you.toLowerCase()) {
    const mine = getLabels()[address.toLowerCase()];
    return { label: mine?.name ? `${mine.name} (you)` : "You", emoji: mine?.emoji };
  }
  const l = getLabels()[address.toLowerCase()];
  if (l?.name) return { label: l.name, emoji: l.emoji };
  return { label: shortAddress(address, 3) };
}
