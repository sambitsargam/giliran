import { describe, expect, it } from "vitest";
import { formatDuration, formatMoney, initials, parseMoney, percent, shortAddress } from "@/lib/format";

describe("formatMoney", () => {
  it("formats 6-decimal amounts with two decimals and grouping", () => {
    expect(formatMoney(1_000_000n)).toBe("1.00");
    expect(formatMoney(1_234_567_890n)).toBe("1,234.56");
    expect(formatMoney(0n)).toBe("0.00");
    expect(formatMoney(undefined)).toBe("—");
  });
  it("never hides a tiny non-zero amount", () => {
    expect(formatMoney(1n)).toBe("0.000001");
  });
  it("handles negatives", () => {
    expect(formatMoney(-2_500_000n)).toBe("-2.50");
  });
});

describe("parseMoney", () => {
  it("parses decimals and rejects bad input", () => {
    expect(parseMoney("10")).toBe(10_000_000n);
    expect(parseMoney("12.5")).toBe(12_500_000n);
    expect(parseMoney("1,000")).toBe(1_000_000_000n);
    expect(parseMoney("abc")).toBeNull();
    expect(parseMoney("1.0000001")).toBeNull();
  });
});

describe("helpers", () => {
  it("formats durations", () => {
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(125)).toBe("2m 05s");
    expect(formatDuration(3 * 3600 + 120)).toBe("3h 2m");
    expect(formatDuration(2 * 86400 + 3600)).toBe("2d 1h");
    expect(formatDuration(-5)).toBe("0s");
  });
  it("makes initials, short addresses and percents", () => {
    expect(initials("Ate Rosa")).toBe("AR");
    expect(initials("joy")).toBe("JO");
    expect(shortAddress("0x143112f3c3199271e4132Ab9f4D794f17c9e0916")).toBe("0x1431…0916");
    expect(percent(3, 4)).toBe("75%");
    expect(percent(0, 0)).toBe("—");
  });
});
