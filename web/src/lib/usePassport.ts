"use client";

import { useQuery } from "@tanstack/react-query";
import { getAddress, isAddress, type Address } from "viem";
import { publicClient } from "./chain";
import { addresses, savingsRegistryAbi, schemaUID } from "./contracts";

export type Passport = {
  onTime: number;
  late: number;
  missed: number;
  completed: number;
  joined: number;
  firstSeen: number;
  tier: number;
};

export async function readPassport(address: Address): Promise<Passport> {
  const [p, tier] = await publicClient.multicall({
    allowFailure: false,
    contracts: [
      { address: addresses.registry, abi: savingsRegistryAbi, functionName: "passportOf", args: [address] },
      { address: addresses.registry, abi: savingsRegistryAbi, functionName: "tierOf", args: [address] },
    ],
  });
  return {
    onTime: p.onTimePayments,
    late: p.latePayments,
    missed: p.missedPayments,
    completed: p.circlesCompleted,
    joined: p.circlesJoined,
    firstSeen: Number(p.firstSeen),
    tier: Number(tier),
  };
}

export function usePassport(address?: string) {
  const valid = !!address && isAddress(address);
  return useQuery({
    queryKey: ["passport", address?.toLowerCase()],
    enabled: valid,
    refetchInterval: 8_000,
    queryFn: () => readPassport(address as Address),
  });
}

export type Attestation = { id: string; time: number; status: number; round: number };

/** Recent payment attestations from the EAS indexer (best effort; the registry is the source of truth). */
export function useAttestations(address?: string) {
  const valid = !!address && isAddress(address);
  return useQuery({
    queryKey: ["attestations", address?.toLowerCase()],
    enabled: valid,
    refetchInterval: 15_000,
    queryFn: async (): Promise<Attestation[]> => {
      const res = await fetch("https://base-sepolia.easscan.org/graphql", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query: `query A($where: AttestationWhereInput) { attestations(where: $where, orderBy: [{ time: desc }], take: 12) { id time decodedDataJson } }`,
          variables: {
            where: {
              schemaId: { equals: schemaUID },
              recipient: { equals: getAddress(address as string) },
              attester: { equals: getAddress(addresses.registry) },
            },
          },
        }),
      });
      if (!res.ok) return [];
      const j = (await res.json()) as { data?: { attestations?: { id: string; time: number; decodedDataJson: string }[] } };
      return (j.data?.attestations ?? []).map((a) => {
        let status = 0;
        let round = 0;
        try {
          const fields = JSON.parse(a.decodedDataJson) as { name: string; value: { value: unknown } }[];
          status = Number(fields.find((f) => f.name === "status")?.value.value ?? 0);
          const r = fields.find((f) => f.name === "round")?.value.value as { hex?: string } | number | undefined;
          round = typeof r === "object" && r?.hex ? parseInt(r.hex, 16) : Number(r ?? 0);
        } catch {
          // Keep defaults; the link to EAS still works.
        }
        return { id: a.id, time: a.time, status, round };
      });
    },
  });
}
