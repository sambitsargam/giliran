import { formatUnits, parseUnits } from "viem";

/** Formats a token amount with tabular-friendly fixed decimals (trims to 2 unless needed). */
export function formatMoney(amount: bigint | undefined, decimals = 6, maxFraction = 2): string {
  if (amount === undefined) return "—";
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const [whole, frac = ""] = formatUnits(abs, decimals).split(".");
  const wholeFmt = BigInt(whole).toLocaleString("en-US");
  let fraction = frac.slice(0, maxFraction).padEnd(Math.min(2, maxFraction), "0");
  // Show more precision only when the trimmed value would hide a non-zero amount.
  if (abs > 0n && whole === "0" && /^0*$/.test(fraction) && frac.length > maxFraction) {
    fraction = frac.replace(/0+$/, "");
  }
  return `${negative ? "-" : ""}${wholeFmt}${fraction ? "." + fraction : ""}`;
}

export function parseMoney(input: string, decimals = 6): bigint | null {
  const clean = input.trim().replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(clean)) return null;
  const [, frac = ""] = clean.split(".");
  if (frac.length > decimals) return null;
  try {
    return parseUnits(clean, decimals);
  } catch {
    return null;
  }
}

export function shortAddress(address?: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

/** "1d 2h", "4m 05s", "12s" */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
}

export function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function percent(n: number, d: number): string {
  if (d === 0) return "—";
  return `${Math.round((n / d) * 100)}%`;
}
