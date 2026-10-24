import type { Metadata } from "next";
import { JoinLanding } from "@/components/circle/JoinLanding";

export const metadata: Metadata = { title: "You're invited", robots: { index: false } };

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ address: string }>;
  searchParams: Promise<{ n?: string }>;
}) {
  const { address } = await params;
  const { n } = await searchParams;
  return <JoinLanding address={address} circleName={n?.slice(0, 60)} />;
}
