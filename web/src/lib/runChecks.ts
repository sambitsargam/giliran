import { parseAbi, type Address } from "viem";
import { publicClient } from "./chain";
import { addresses, circleAbi, circleFactoryAbi } from "./contracts";
import { evaluateCircle, type CheckInput } from "./checker";
import { errorName } from "./errors";

const viewAbi = parseAbi([
  "function feeBps() view returns (uint256)",
  "function promisedReturnBps() view returns (uint256)",
  "function payoutPerRound() view returns (uint256)",
  "function contribution() view returns (uint256)",
  "function memberCap() view returns (uint256)",
  "function members() view returns (address[])",
  "function depositOf(address) view returns (uint256)",
  "function owner() view returns (address)",
]);

/** Reads everything the checker needs through the public ICircleView surface. */
export async function runChecks(address: Address) {
  const code = await publicClient.getCode({ address });
  const isContract = !!code && code !== "0x";
  const base = { address, abi: viewAbi } as const;
  const [isGiliran, fee, ret, payout, contribution, cap, members, owner] = await publicClient.multicall({
    allowFailure: true,
    contracts: [
      { address: addresses.factory, abi: circleFactoryAbi, functionName: "isCircle", args: [address] },
      { ...base, functionName: "feeBps" },
      { ...base, functionName: "promisedReturnBps" },
      { ...base, functionName: "payoutPerRound" },
      { ...base, functionName: "contribution" },
      { ...base, functionName: "memberCap" },
      { ...base, functionName: "members" },
      { ...base, functionName: "owner" },
    ],
  });

  const memberList = members.status === "success" ? members.result : undefined;
  let deposits: bigint[] | undefined;
  if (memberList) {
    const reads = await publicClient.multicall({
      allowFailure: true,
      contracts: memberList.map((m) => ({ ...base, functionName: "depositOf" as const, args: [m] as const })),
    });
    deposits = reads.every((r) => r.status === "success") ? reads.map((r) => r.result as bigint) : undefined;
  }

  const giliran = isGiliran.status === "success" && isGiliran.result === true;
  let withdrawReverts: boolean | undefined;
  if (giliran) {
    try {
      await publicClient.readContract({ address, abi: circleAbi, functionName: "organiserWithdraw" });
      withdrawReverts = false;
    } catch (e) {
      withdrawReverts = errorName(e) === "NoOneCanWithdraw" || true;
    }
  }

  const input: CheckInput = {
    isContract,
    isGiliran: giliran,
    feeBps: fee.status === "success" ? fee.result : undefined,
    promisedReturnBps: ret.status === "success" ? ret.result : undefined,
    payoutPerRound: payout.status === "success" ? payout.result : undefined,
    contribution: contribution.status === "success" ? contribution.result : undefined,
    memberCap: cap.status === "success" ? cap.result : undefined,
    members: memberList,
    deposits,
    owner: owner.status === "success" ? owner.result : undefined,
    withdrawReverts,
  };
  return { input, results: evaluateCircle(input) };
}
