import Link from "next/link";
import { addresses } from "@/lib/contracts";
import { codeUrl } from "@/lib/chain";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-sand">
      <div className="weave-band opacity-60" aria-hidden />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm text-ink-soft sm:grid-cols-3">
        <div>
          <p className="font-display text-lg text-ink">Giliran</p>
          <p className="mt-1">“Your turn” in Malay and Indonesian. A testnet prototype on Base Sepolia. No token.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Link className="link" href="/how">How it works &amp; limitations</Link>
          <Link className="link" href="/check">Is this a real circle?</Link>
          <a className="link" href="https://github.com/sambitsargam/giliran" target="_blank" rel="noreferrer">
            Source on GitHub ↗
          </a>
        </div>
        <div className="flex flex-col gap-2">
          <a className="link" href={codeUrl(addresses.factory)} target="_blank" rel="noreferrer">
            Verified CircleFactory ↗
          </a>
          <a className="link" href={codeUrl(addresses.registry)} target="_blank" rel="noreferrer">
            Verified SavingsRegistry ↗
          </a>
          <p>Not financial advice. A legal opinion per country is required before any real pilot.</p>
        </div>
      </div>
    </footer>
  );
}
