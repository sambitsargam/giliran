"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount } from "wagmi";
import { parseEventLogs, type Address, type Hex } from "viem";
import { addresses, circleFactoryAbi } from "@/lib/contracts";
import { parseMoney, formatMoney } from "@/lib/format";
import { newSecret, orderCommit } from "@/lib/commit";
import { attachSecretToCircle, saveSecret } from "@/lib/storage";
import { useTx } from "@/lib/useTx";
import { publicClient } from "@/lib/chain";
import { ConnectButton } from "../ConnectButton";
import { InviteCard } from "./ShareInvite";

const CADENCES = [
  { id: "weekly", label: "Weekly", round: 7 * 86400, grace: 2 * 86400, join: 7 * 86400, demo: false },
  { id: "fortnightly", label: "Every 2 weeks (payday)", round: 14 * 86400, grace: 3 * 86400, join: 7 * 86400, demo: false },
  { id: "monthly", label: "Monthly", round: 30 * 86400, grace: 5 * 86400, join: 14 * 86400, demo: false },
  { id: "daily", label: "Daily", round: 86400, grace: 6 * 3600, join: 2 * 86400, demo: false },
  { id: "demo", label: "Demo: 2-minute rounds (testing only)", round: 120, grace: 30, join: 3600, demo: true },
] as const;

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function NewCircleForm() {
  const { address } = useAccount();
  const { send, busy } = useTx();
  const [name, setName] = useState("");
  const [token, setToken] = useState<Address>(addresses.tusdc);
  const [amount, setAmount] = useState("10");
  const [members, setMembers] = useState(5);
  const [cadence, setCadence] = useState<(typeof CADENCES)[number]["id"]>("fortnightly");
  const [secret, setSecret] = useState<Hex | null>(null);
  const [created, setCreated] = useState<Address | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const c = CADENCES.find((x) => x.id === cadence)!;
  const contribution = parseMoney(amount, 6);
  const valid = !!contribution && contribution > 0n && members >= 2 && members <= 20;

  if (created) {
    return (
      <div className="space-y-5">
        <div className="mat-card border-l-4 !border-l-pandan p-5">
          <p className="font-display text-2xl font-semibold">Your circle is live.</p>
          <p className="mt-2 text-ink-soft">
            Keep the organiser secret safe: you need it to reveal the payout order once the circle fills. If you lose
            it, anyone can still draw the order after the timeout — the circle never gets stuck.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {secret && (
              <button
                className="btn btn-ghost"
                onClick={() =>
                  download(
                    `giliran-secret-${created.slice(0, 8)}.txt`,
                    `Giliran organiser secret\ncircle: ${created}\norganiser: ${address}\nsecret: ${secret}\n\nKeep this private. You need it to reveal the payout order.\n`,
                  )
                }
              >
                Download secret
              </button>
            )}
            <Link className="btn btn-primary" href={`/c/${created}`}>
              Open circle room →
            </Link>
          </div>
        </div>
        <InviteCard address={created} name={name || undefined} />
      </div>
    );
  }

  return (
    <form
      className="mat-card space-y-5 p-5 sm:p-7"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        if (!address || !contribution) return;
        const s = newSecret();
        setSecret(s);
        saveSecret({ secret: s, organiser: address, createdAt: Date.now(), name });
        const cfg = {
          token,
          contribution,
          memberCap: members,
          roundDuration: c.round,
          graceDuration: c.grace,
          joinDeadline: BigInt(Math.floor(Date.now() / 1000) + c.join),
          demo: c.demo,
        };
        const r = await send("Create circle", [
          { address: addresses.factory, abi: circleFactoryAbi, functionName: "createCircle", args: [cfg, orderCommit(s, address)] },
        ]);
        if (!r.ok || !r.hash) {
          if (r.ok === false) setErr(r.error);
          return;
        }
        const receipt = await publicClient.waitForTransactionReceipt({ hash: r.hash });
        const ev = parseEventLogs({ abi: circleFactoryAbi, logs: receipt.logs, eventName: "CircleCreated" })[0];
        if (ev) {
          attachSecretToCircle(s, ev.args.circle);
          setCreated(ev.args.circle);
        } else {
          setErr("Created, but couldn't find the circle address in the receipt. Check BaseScan.");
        }
      }}
    >
      <label className="block">
        <span className="text-sm font-semibold">Circle name</span>{" "}
        <span className="text-sm text-ink-soft">(only in the invite link — never on-chain)</span>
        <input className="field mt-1" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kapamilya HK paluwagan" />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold">Money</span>
          <select className="field mt-1" value={token} onChange={(e) => setToken(e.target.value as Address)}>
            <option value={addresses.tusdc}>tUSDC — test money with a free faucet</option>
            <option value={addresses.usdc}>USDC (Circle, Base Sepolia)</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Contribution per round</span>
          <input
            className="field mt-1 tabular"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={!contribution}
            aria-describedby="amount-help"
          />
          <span id="amount-help" className="mt-1 block text-xs text-ink-soft">
            {contribution ? `Pot per round: ${formatMoney(contribution * BigInt(members), 6)}` : "Enter an amount like 10 or 12.50"}
          </span>
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Members (2–20)</span>
          <input
            className="field mt-1 tabular"
            type="number"
            min={2}
            max={20}
            value={members}
            onChange={(e) => setMembers(Math.max(2, Math.min(20, Number(e.target.value) || 2)))}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">How often</span>
          <select className="field mt-1" value={cadence} onChange={(e) => setCadence(e.target.value as typeof cadence)}>
            {CADENCES.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-ink-soft">
            Grace period: {c.grace >= 86400 ? `${c.grace / 86400} days` : c.grace >= 3600 ? `${c.grace / 3600} hours` : `${c.grace} seconds`} ·
            joining open for {c.join >= 86400 ? `${c.join / 86400} days` : `${c.join / 3600} hour`}
          </span>
        </label>
      </div>

      <div className="rounded-2xl border border-sand p-4 text-sm">
        <p className="font-semibold">Fixed by the contract, for everyone:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
          <li>Organiser fee 0%. Payouts never exceed what members paid in.</li>
          <li>Each member pays one contribution as a deposit, returned at the end.</li>
          <li>Payout order is drawn fairly; newcomers take the last slots.</li>
          <li>Your organiser secret is created on this device. Only its hash goes on-chain.</li>
        </ul>
      </div>

      {err && (
        <p className="text-sm text-terracotta" role="alert">
          {err}
        </p>
      )}

      {address ? (
        <button className="btn btn-accent w-full text-base" disabled={!valid || busy} type="submit">
          {busy ? "Creating…" : "Create circle"}
        </button>
      ) : (
        <ConnectButton />
      )}
    </form>
  );
}
