import { codeUrl } from "@/lib/chain";
import { addresses } from "@/lib/contracts";

export function VerifyBadge({ isGiliran, address }: { isGiliran?: boolean; address: string }) {
  if (isGiliran === undefined) return null;
  return isGiliran ? (
    <a
      href={codeUrl(addresses.factory)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full bg-pandan/15 px-3 py-1 text-sm font-bold text-pandan-ink"
      title={`${address} was deployed by the verified Giliran factory`}
    >
      <span aria-hidden>✓</span> Verified Giliran circle
    </a>
  ) : (
    <span className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full bg-terracotta/15 px-3 py-1 text-sm font-bold text-terracotta">
      <span aria-hidden>!</span> Not created by the Giliran factory
    </span>
  );
}
