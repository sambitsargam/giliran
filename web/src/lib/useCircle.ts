"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAddress, parseEventLogs, type Address, type Hash } from "viem";
import { publicClient } from "./chain";
import { addresses, circleAbi, circleFactoryAbi, savingsRegistryAbi, mockUsdcAbi, CircleState, tokenInfo } from "./contracts";

export type MemberInfo = {
  address: Address;
  paidRounds: number;
  deposit: bigint;
  owed: bigint;
  hadShortfall: boolean;
  tier: number;
  lateThisRound: boolean;
};

export type CircleData = {
  address: Address;
  isGiliran: boolean;
  state: CircleState;
  token: Address;
  symbol: string;
  decimals: number;
  contribution: bigint;
  memberCap: number;
  memberCount: number;
  roundDuration: number;
  graceDuration: number;
  joinDeadline: number;
  demo: boolean;
  organiser: Address;
  fillBlock: bigint;
  fillTime: number;
  startTime: number;
  currentRound: number;
  orderFromFallback: boolean;
  revealTimeout: number;
  totalPaidIn: bigint;
  totalPaidOut: bigint;
  totalDepositsReturned: bigint;
  balance: bigint;
  members: MemberInfo[];
  order: Address[];
  feeBps: bigint;
  promisedReturnBps: bigint;
  payoutPerRound: bigint;
};

export type Payout = { round: number; recipient: Address; amount: bigint; hash?: Hash };

async function readCircle(address: Address): Promise<CircleData> {
  const c = { address, abi: circleAbi } as const;
  const [
    isGiliran,
    state,
    token,
    contribution,
    memberCap,
    roundDuration,
    graceDuration,
    joinDeadline,
    demo,
    organiser,
    fillBlock,
    fillTime,
    startTime,
    currentRound,
    orderFromFallback,
    revealTimeout,
    totalPaidIn,
    totalPaidOut,
    totalDepositsReturned,
    members,
    order,
    feeBps,
    promisedReturnBps,
    payoutPerRound,
  ] = await publicClient.multicall({
    allowFailure: false,
    contracts: [
      { address: addresses.factory, abi: circleFactoryAbi, functionName: "isCircle", args: [address] },
      { ...c, functionName: "state" },
      { ...c, functionName: "token" },
      { ...c, functionName: "contribution" },
      { ...c, functionName: "memberCap" },
      { ...c, functionName: "roundDuration" },
      { ...c, functionName: "graceDuration" },
      { ...c, functionName: "joinDeadline" },
      { ...c, functionName: "demo" },
      { ...c, functionName: "organiser" },
      { ...c, functionName: "fillBlock" },
      { ...c, functionName: "fillTime" },
      { ...c, functionName: "startTime" },
      { ...c, functionName: "currentRound" },
      { ...c, functionName: "orderFromFallback" },
      { ...c, functionName: "revealTimeout" },
      { ...c, functionName: "totalPaidIn" },
      { ...c, functionName: "totalPaidOut" },
      { ...c, functionName: "totalDepositsReturned" },
      { ...c, functionName: "members" },
      { ...c, functionName: "order" },
      { ...c, functionName: "feeBps" },
      { ...c, functionName: "promisedReturnBps" },
      { ...c, functionName: "payoutPerRound" },
    ],
  });

  const round = Number(currentRound);
  const perMember = (await publicClient.multicall({
    allowFailure: false,
    contracts: [
      { address: token, abi: mockUsdcAbi, functionName: "balanceOf", args: [address] },
      ...members.flatMap((m) => [
        { ...c, functionName: "paidRounds", args: [m] } as const,
        { ...c, functionName: "depositOf", args: [m] } as const,
        { ...c, functionName: "owed", args: [m] } as const,
        { ...c, functionName: "hadShortfall", args: [m] } as const,
        { address: addresses.registry, abi: savingsRegistryAbi, functionName: "tierOf", args: [m] } as const,
        { ...c, functionName: "paidLate", args: [BigInt(Math.max(round, 1)), m] } as const,
      ]),
    ] as never,
  })) as unknown[];

  const balance = perMember[0] as bigint;
  const memberInfo: MemberInfo[] = members.map((m, i) => {
    const b = 1 + i * 6;
    return {
      address: m,
      paidRounds: Number(perMember[b] as bigint),
      deposit: perMember[b + 1] as bigint,
      owed: perMember[b + 2] as bigint,
      hadShortfall: perMember[b + 3] as boolean,
      tier: Number(perMember[b + 4]),
      lateThisRound: perMember[b + 5] as boolean,
    };
  });

  const info = tokenInfo(token);
  return {
    address,
    isGiliran,
    state: Number(state) as CircleState,
    token,
    symbol: info.symbol,
    decimals: info.decimals,
    contribution,
    memberCap: Number(memberCap),
    memberCount: members.length,
    roundDuration: Number(roundDuration),
    graceDuration: Number(graceDuration),
    joinDeadline: Number(joinDeadline),
    demo,
    organiser,
    fillBlock,
    fillTime: Number(fillTime),
    startTime: Number(startTime),
    currentRound: round,
    orderFromFallback,
    revealTimeout: Number(revealTimeout),
    totalPaidIn,
    totalPaidOut,
    totalDepositsReturned,
    balance,
    members: memberInfo,
    order: [...order],
    feeBps,
    promisedReturnBps,
    payoutPerRound,
  };
}

/** Round timing helpers mirroring Circle.roundStart / roundDeadline / graceEnd. */
export function roundClock(d: Pick<CircleData, "startTime" | "roundDuration" | "graceDuration">, round: number) {
  const start = d.startTime + (round - 1) * d.roundDuration;
  const deadline = start + d.roundDuration;
  return { start, deadline, graceEnd: deadline + d.graceDuration };
}

export function circleQueryKey(address?: string) {
  return ["circle", address?.toLowerCase()];
}

/**
 * Live view of one circle: reads everything in two multicalls, re-reads on any contract event,
 * and polls as a fallback. Exposes the latest payout so the ring can animate it.
 */
export function useCircle(address?: string) {
  const valid = !!address && isAddress(address);
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: circleQueryKey(address),
    queryFn: () => readCircle(address as Address),
    enabled: valid,
    refetchInterval: 6_000,
  });

  const [lastPayout, setLastPayout] = useState<Payout | null>(null);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!valid) return;
    const unwatch = publicClient.watchContractEvent({
      address: address as Address,
      abi: circleAbi,
      pollingInterval: 2_000,
      onLogs: (logs) => {
        for (const log of logs) {
          if (log.eventName === "RoundPaidOut") {
            const key = `${log.transactionHash}-${log.logIndex}`;
            if (seen.current.has(key)) continue;
            seen.current.add(key);
            const args = log.args as { round: bigint; recipient: Address; amount: bigint };
            setLastPayout({
              round: Number(args.round),
              recipient: args.recipient,
              amount: args.amount,
              hash: log.transactionHash ?? undefined,
            });
          }
        }
        qc.invalidateQueries({ queryKey: circleQueryKey(address) });
      },
      onError: () => {
        // Polling via refetchInterval keeps the view fresh if the filter is dropped.
      },
    });
    return unwatch;
  }, [address, valid, qc]);

  return { ...query, data: query.data, lastPayout, valid };
}

/** Past payouts from RoundPaidOut logs since the draw (best effort; falls back to derived data). */
export function usePayoutHistory(address?: string, fillBlock?: bigint, currentRound?: number) {
  return useQuery({
    queryKey: ["payouts", address?.toLowerCase(), currentRound],
    enabled: !!address && !!fillBlock && fillBlock > 0n,
    staleTime: 10_000,
    queryFn: async () => {
      try {
        const logs = await publicClient.getContractEvents({
          address: address as Address,
          abi: circleAbi,
          eventName: "RoundPaidOut",
          fromBlock: fillBlock,
          toBlock: "latest",
        });
        return parseEventLogs({ abi: circleAbi, logs, eventName: "RoundPaidOut" }).map((l) => ({
          round: Number(l.args.round),
          recipient: l.args.recipient,
          amount: l.args.amount,
          hash: l.transactionHash,
        })) as Payout[];
      } catch {
        return [] as Payout[];
      }
    },
  });
}

/** Status of the current round for one member. */
export function memberRoundStatus(d: CircleData, m: MemberInfo, now: number): "paid" | "pending" | "overdue" {
  if (d.state === CircleState.Completed) return "paid";
  if (d.state !== CircleState.Active) return m.paidRounds >= 1 ? "paid" : "pending";
  if (m.paidRounds >= d.currentRound) return "paid";
  const { deadline } = roundClock(d, d.currentRound);
  return now > deadline ? "overdue" : "pending";
}

export function useCircleDerived(d: CircleData | undefined, now: number) {
  return useMemo(() => {
    if (!d) return null;
    const active = d.state === CircleState.Active;
    const round = d.currentRound;
    const clock = active ? roundClock(d, round) : null;
    const paidCount = active ? d.members.filter((m) => m.paidRounds >= round).length : 0;
    const recipient = active && d.order.length >= round ? d.order[round - 1] : null;
    const allPaid = active && paidCount === d.memberCount;
    const canSettle = !!clock && (now > clock.graceEnd || (allPaid && now >= clock.start));
    return { active, round, clock, paidCount, recipient, allPaid, canSettle };
  }, [d, now]);
}
