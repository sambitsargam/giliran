import { getAddress, isAddress, zeroAddress, type Address } from "viem";

export type CheckStatus = "pass" | "fail" | "unknown";

export type CheckResult = {
  id: "factory" | "fee" | "returns" | "payout" | "deposits" | "withdraw";
  title: string;
  status: CheckStatus;
  detail: string;
  explain: string;
};

export type CheckInput = {
  isContract: boolean;
  isGiliran: boolean;
  feeBps?: bigint;
  promisedReturnBps?: bigint;
  payoutPerRound?: bigint;
  contribution?: bigint;
  memberCap?: bigint;
  members?: readonly Address[];
  deposits?: readonly bigint[];
  /** Result of calling owner(): an address, or undefined if the contract has no owner(). */
  owner?: Address;
  /** Giliran circles: whether organiserWithdraw() was confirmed to revert. */
  withdrawReverts?: boolean;
  decimals?: number;
};

const bps = (v: bigint) => `${Number(v) / 100}%`;

/** Pull a circle address out of a pasted address or invite link. */
export function extractAddress(input: string): Address | null {
  const m = input.trim().match(/0x[a-fA-F0-9]{40}/);
  if (!m || !isAddress(m[0], { strict: false })) return null;
  return getAddress(m[0]);
}

/** Turns raw on-chain reads into plain-language checks. Pure, so it is unit tested. */
export function evaluateCircle(i: CheckInput): CheckResult[] {
  const results: CheckResult[] = [];

  results.push({
    id: "factory",
    title: "Created by the Giliran factory",
    status: i.isGiliran ? "pass" : "fail",
    detail: i.isGiliran
      ? "The factory confirms it deployed this contract."
      : i.isContract
        ? "The Giliran factory did not create this contract."
        : "There is no contract at this address.",
    explain: "Only factory circles carry the rules below in code. A look-alike can copy the screens, not the guarantees.",
  });

  results.push(
    i.feeBps === undefined
      ? { id: "fee", title: "No organiser fee", status: "unknown", detail: "The contract doesn't report a fee.", explain: "Fees are where chit-fund law draws the line." }
      : {
          id: "fee",
          title: "No organiser fee",
          status: i.feeBps === 0n ? "pass" : "fail",
          detail: i.feeBps === 0n ? "Fee is 0%." : `Takes a ${bps(i.feeBps)} fee from members.`,
          explain: "Fees are where chit-fund law draws the line. Giliran's fee is a hard-coded zero.",
        },
  );

  results.push(
    i.promisedReturnBps === undefined
      ? { id: "returns", title: "No promised returns", status: "unknown", detail: "The contract doesn't report a return.", explain: "A savings circle only gives back what members put in." }
      : {
          id: "returns",
          title: "No promised returns",
          status: i.promisedReturnBps === 0n ? "pass" : "fail",
          detail:
            i.promisedReturnBps === 0n
              ? "Promises 0% — you get back exactly what the circle collects."
              : `Promises a ${bps(i.promisedReturnBps)} return. Only new money can pay that: a classic scam sign.`,
          explain: "A savings circle only gives back what members put in. Anyone promising profit is paying early members with later members' money.",
        },
  );

  if (i.payoutPerRound === undefined || i.contribution === undefined || i.memberCap === undefined) {
    results.push({ id: "payout", title: "Pot equals contributions", status: "unknown", detail: "Payout figures aren't readable.", explain: "The pot should be contribution × members, nothing more." });
  } else {
    const expected = i.contribution * i.memberCap;
    results.push({
      id: "payout",
      title: "Pot equals contributions",
      status: i.payoutPerRound === expected ? "pass" : "fail",
      detail:
        i.payoutPerRound === expected
          ? "Each pot is exactly contribution × members."
          : `Advertises a pot ${i.payoutPerRound > expected ? "larger" : "smaller"} than contribution × members.`,
      explain: "If the advertised pot is bigger than what members pay in, the extra has to come from somewhere — usually the next victims.",
    });
  }

  if (!i.members || !i.deposits || i.members.length !== i.deposits.length) {
    results.push({ id: "deposits", title: "Every member has a real deposit", status: "unknown", detail: "Member deposits aren't readable.", explain: "Made-up members are how fake arisan look full." });
  } else {
    const empty = i.deposits.filter((d) => d === 0n).length;
    const total = i.members.length;
    results.push({
      id: "deposits",
      title: "Every member has a real deposit",
      status: total === 0 ? "unknown" : empty === 0 ? "pass" : "fail",
      detail:
        total === 0
          ? "No members yet."
          : empty === 0
            ? `All ${total} listed members have money in.`
            : `${empty} of ${total} listed members have no deposit — likely made up.`,
      explain: "Fake circles pad their member list to look full and safe. In Giliran every seat needs a funded deposit, so padding shows up here.",
    });
  }

  if (i.isGiliran) {
    results.push({
      id: "withdraw",
      title: "No owner or withdraw path",
      status: i.withdrawReverts === false ? "fail" : "pass",
      detail: "No owner, no admin key. organiserWithdraw() always reverts with NoOneCanWithdraw().",
      explain: "Money leaves only as a round's pot to that round's member, or as a member's own deposit at the end.",
    });
  } else if (i.owner && i.owner !== zeroAddress) {
    results.push({
      id: "withdraw",
      title: "No owner or withdraw path",
      status: "fail",
      detail: `Has an owner (${i.owner.slice(0, 6)}…${i.owner.slice(-4)}) who can withdraw the funds.`,
      explain: "If one key can move the pot, the circle is only as honest as whoever holds that key.",
    });
  } else {
    results.push({
      id: "withdraw",
      title: "No owner or withdraw path",
      status: "unknown",
      detail: "Unknown — not a Giliran circle, so its code wasn't checked.",
      explain: "Only Giliran circles are known to have no withdraw path.",
    });
  }

  return results;
}

export function verdict(results: CheckResult[]): "real" | "fake" | "unknown" {
  if (results.some((r) => r.status === "fail")) return "fake";
  if (results.every((r) => r.status === "pass")) return "real";
  return "unknown";
}
