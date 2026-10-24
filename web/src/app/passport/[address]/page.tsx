import type { Metadata } from "next";
import { PassportView } from "@/components/PassportView";

export const metadata: Metadata = { title: "Savings Passport" };

export default async function PassportPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return <PassportView address={address} />;
}
