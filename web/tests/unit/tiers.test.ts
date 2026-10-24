import { describe, expect, it } from "vitest";
import { isTierOrdered, orderRows, tierLabel } from "@/lib/tiers";

describe("tier display", () => {
  it("labels tiers", () => {
    expect(tierLabel(0)).toBe("Newcomer");
    expect(tierLabel(1)).toBe("Trusted saver");
    expect(tierLabel(2)).toBe("Anchor saver");
    expect(tierLabel(7)).toBe("Tier 7");
  });

  it("builds slot rows and marks newcomer slots", () => {
    const rows = orderRows(["0xa", "0xb", "0xc"], [2, 1, 0]);
    expect(rows.map((r) => r.slot)).toEqual([1, 2, 3]);
    expect(rows.map((r) => r.newcomerSlot)).toEqual([false, false, true]);
  });

  it("checks that newcomers come last", () => {
    expect(isTierOrdered([2, 2, 1, 0, 0])).toBe(true);
    expect(isTierOrdered([1, 0, 1])).toBe(false);
    expect(isTierOrdered([])).toBe(true);
  });
});
