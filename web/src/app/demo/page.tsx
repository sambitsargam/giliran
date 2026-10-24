import type { Metadata } from "next";
import { DemoFlow } from "@/components/demo/DemoFlow";

export const metadata: Metadata = { title: "Try it live" };

export default function DemoPage() {
  return <DemoFlow />;
}
