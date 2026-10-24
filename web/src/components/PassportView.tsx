"use client";

import { isAddress } from "viem";
import { useI18n } from "@/lib/i18n";
import { useAttestations, usePassport } from "@/lib/usePassport";
import { easAddressUrl, easSchemaUrl, codeUrl, EASSCAN } from "@/lib/chain";
import { addresses, schemaUID } from "@/lib/contracts";
import { PassportCard } from "./PassportCard";
import { ErrorState, Skeleton } from "./Skeleton";

const STATUS = ["On time", "Late (in grace)", "Missed"];

export function PassportView({ address }: { address: string }) {
  const { t } = useI18n();
  const passport = usePassport(address);
  const att = useAttestations(address);

  if (!isAddress(address)) return <ErrorState title="That isn't a valid address." />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="eyebrow">Public record · read from SavingsRegistry and EAS</p>
        <h1 className="font-display mt-2 text-4xl font-semibold">{t.passport}</h1>
      </div>
      {passport.error ? (
        <ErrorState title="Couldn't read this Passport." body="The network may be busy. It refreshes automatically." />
      ) : !passport.data ? (
        <Skeleton className="h-[420px] !rounded-[26px]" />
      ) : (
        <PassportCard address={address} p={passport.data} />
      )}

      <section className="mat-card p-5" aria-labelledby="att-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="att-heading" className="font-display text-xl font-semibold">
            For lenders: verify it yourself
          </h2>
          <a className="link text-sm font-semibold" href={easAddressUrl(address)} target="_blank" rel="noreferrer">
            All attestations on EAS ↗
          </a>
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          Every payment outcome is an EAS attestation from the{" "}
          <a className="link" href={codeUrl(addresses.registry)} target="_blank" rel="noreferrer">
            Giliran SavingsRegistry
          </a>
          , which only accepts writes from circles the factory created. Schema:{" "}
          <a className="link font-mono" href={easSchemaUrl(schemaUID)} target="_blank" rel="noreferrer">
            {schemaUID.slice(0, 10)}…
          </a>
        </p>
        {att.isLoading ? (
          <Skeleton className="mt-4 h-24" />
        ) : att.data && att.data.length > 0 ? (
          <ul className="mt-4 divide-y divide-sand">
            {att.data.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    a.status === 0 ? "bg-pandan text-white" : a.status === 1 ? "bg-marigold text-on-accent" : "bg-terracotta text-white"
                  }`}
                >
                  {STATUS[a.status] ?? "?"}
                </span>
                <span className="tabular text-ink-soft">
                  Round {a.round} · {new Date(a.time * 1000).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                </span>
                <a className="link ml-auto font-mono text-xs" href={`${EASSCAN}/attestation/view/${a.id}`} target="_blank" rel="noreferrer">
                  {a.id.slice(0, 10)}… ↗
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-ink-soft">No attestations indexed yet. New ones appear within a minute of a round paying out.</p>
        )}
      </section>
    </div>
  );
}
