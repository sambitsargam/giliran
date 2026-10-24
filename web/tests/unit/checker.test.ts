import { describe, expect, it } from "vitest";
import { evaluateCircle, extractAddress, verdict, type CheckInput } from "@/lib/checker";

const A = (i: number) => `0x${i.toString(16).padStart(40, "0")}` as `0x${string}`;

const honest: CheckInput = {
  isContract: true,
  isGiliran: true,
  feeBps: 0n,
  promisedReturnBps: 0n,
  payoutPerRound: 50_000_000n,
  contribution: 10_000_000n,
  memberCap: 5n,
  members: [A(1), A(2), A(3), A(4), A(5)],
  deposits: [10n, 10n, 10n, 10n, 10n],
  withdrawReverts: true,
};

const fake: CheckInput = {
  isContract: true,
  isGiliran: false,
  feeBps: 500n,
  promisedReturnBps: 2000n,
  payoutPerRound: 120_000_000n,
  contribution: 10_000_000n,
  memberCap: 10n,
  members: Array.from({ length: 10 }, (_, i) => A(i + 1)),
  deposits: [10n, 10n, 10n, 0n, 0n, 0n, 0n, 0n, 0n, 0n],
  owner: A(99),
};

const byId = (r: ReturnType<typeof evaluateCircle>) => Object.fromEntries(r.map((x) => [x.id, x]));

describe("evaluateCircle", () => {
  it("passes every check for an honest Giliran circle", () => {
    const r = evaluateCircle(honest);
    expect(r).toHaveLength(6);
    expect(r.every((x) => x.status === "pass")).toBe(true);
    expect(verdict(r)).toBe("real");
  });

  it("flags every dishonest value of the fake circle", () => {
    const r = byId(evaluateCircle(fake));
    expect(r.factory.status).toBe("fail");
    expect(r.fee.status).toBe("fail");
    expect(r.fee.detail).toContain("5%");
    expect(r.returns.status).toBe("fail");
    expect(r.returns.detail).toContain("20%");
    expect(r.payout.status).toBe("fail");
    expect(r.deposits.status).toBe("fail");
    expect(r.deposits.detail).toContain("7 of 10");
    expect(r.withdraw.status).toBe("fail");
    expect(verdict(Object.values(r))).toBe("fake");
  });

  it("reports unknown withdraw path for a non-factory contract without owner()", () => {
    const r = byId(evaluateCircle({ ...honest, isGiliran: false, owner: undefined }));
    expect(r.withdraw.status).toBe("unknown");
    expect(r.withdraw.detail).toMatch(/not a Giliran circle/);
  });

  it("treats unreadable interfaces as unknown, not pass", () => {
    const r = byId(evaluateCircle({ isContract: false, isGiliran: false }));
    expect(r.factory.status).toBe("fail");
    expect(r.fee.status).toBe("unknown");
    expect(r.payout.status).toBe("unknown");
    expect(r.deposits.status).toBe("unknown");
  });

  it("flags a payout that is smaller than contributions too", () => {
    const r = byId(evaluateCircle({ ...honest, payoutPerRound: 40_000_000n }));
    expect(r.payout.status).toBe("fail");
    expect(r.payout.detail).toContain("smaller");
  });
});

describe("extractAddress", () => {
  it("reads a bare address and an invite link", () => {
    const a = "0x143112f3c3199271e4132Ab9f4D794f17c9e0916";
    expect(extractAddress(a)).toBe("0x143112f3c3199271e4132Ab9f4D794f17c9e0916");
    expect(extractAddress(`https://giliran.app/join/${a.toLowerCase()}?n=Kapamilya`)).toBe(
      "0x143112f3c3199271e4132Ab9f4D794f17c9e0916",
    );
  });
  it("rejects junk", () => {
    expect(extractAddress("hello")).toBeNull();
    expect(extractAddress("0x1234")).toBeNull();
  });
});
