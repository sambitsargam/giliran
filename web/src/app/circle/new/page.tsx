import type { Metadata } from "next";
import { NewCircleForm } from "@/components/circle/NewCircleForm";

export const metadata: Metadata = { title: "Create a circle" };

export default function NewCirclePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow">Start a paluwagan / arisan</p>
      <h1 className="font-display mt-2 text-4xl font-semibold">Create a circle</h1>
      <p className="mt-3 text-ink-soft">
        You set the terms once. After that, nobody — including you — can change them, take a fee or touch the pot.
      </p>
      <div className="mt-8">
        <NewCircleForm />
      </div>
    </div>
  );
}
