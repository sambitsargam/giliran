"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export function inviteUrl(address: string, name?: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const q = name ? `?n=${encodeURIComponent(name)}` : "";
  return `${origin}/join/${address}${q}`;
}

export function whatsappUrl(link: string, name?: string) {
  const text = `Join my savings circle${name ? ` “${name}”` : ""} on Giliran. The pot is held by a smart contract, so nobody can run away with it: ${link}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function InviteCard({ address, name }: { address: string; name?: string }) {
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- needs window.location
  useEffect(() => setLink(inviteUrl(address, name)), [address, name]);
  return (
    <div className="mat-card grid gap-5 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
      <div className="mx-auto rounded-2xl bg-white p-3">
        {link ? <QRCodeSVG value={link} size={160} fgColor="#1E1B4B" bgColor="#FFFFFF" level="M" /> : <div className="skeleton h-40 w-40" />}
      </div>
      <div className="min-w-0 space-y-3">
        <p className="font-display text-xl font-semibold">Invite your circle</p>
        <p className="text-sm text-ink-soft">
          Circles are invite-only: there is no public list. Share this link or QR code with the people you save with.
        </p>
        <p className="break-all rounded-xl bg-surface-2 p-2 font-mono text-xs">{link || "…"}</p>
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-accent" href={whatsappUrl(link, name)} target="_blank" rel="noreferrer">
            Share to WhatsApp
          </a>
          <button
            className="btn btn-ghost"
            onClick={() => {
              navigator.clipboard
                ?.writeText(link)
                .then(() => setCopied(true))
                .catch(() => {});
            }}
          >
            {copied ? "Copied ✓" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ShareInvite({ address }: { address: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        Invite
      </button>
      {open && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-label="Invite members" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <InviteCard address={address} />
            <button className="btn btn-primary mt-3 w-full" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
