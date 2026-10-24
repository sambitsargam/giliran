import { getLabels } from "./storage";
import { shortAddress } from "./format";

// Deterministic fallback avatars so unnamed members are still easy to tell apart.
const AVATARS = ["🌺", "🛵", "🌾", "🧵", "☕", "🎒", "🌴", "🐟", "🍚", "🪁", "🌙", "⭐", "🥥", "🦋", "🍵", "🎐"];

export function avatarFor(address: string): string {
  return AVATARS[parseInt(address.slice(-4), 16) % AVATARS.length];
}

/** A friendly label for an address: "You", a locally saved name, or a short address. */
export function labelFor(address: string, you?: string): { label: string; emoji?: string } {
  const saved = getLabels()[address.toLowerCase()];
  if (you && address.toLowerCase() === you.toLowerCase()) {
    return { label: saved?.name && saved.name !== "You" ? `${saved.name} (you)` : "You", emoji: saved?.emoji ?? "⭐" };
  }
  if (saved?.name) return { label: saved.name, emoji: saved.emoji ?? avatarFor(address) };
  return { label: shortAddress(address, 3), emoji: avatarFor(address) };
}
