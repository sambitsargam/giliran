"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoMark } from "./Logo";
import { ConnectButton } from "./ConnectButton";
import { LanguageToggle, ThemeToggle } from "./Toggles";

const NAV = [
  { href: "/demo", label: "Try it live" },
  { href: "/circle/new", label: "Create a circle" },
  { href: "/check", label: "Check a circle" },
  { href: "/how", label: "How it works" },
];

export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-sand bg-cream/90 backdrop-blur supports-[backdrop-filter]:bg-cream/75">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <Link href="/" className="flex min-h-[44px] items-center gap-2" aria-label="Giliran home">
          <LogoMark size={34} />
          <span className="font-display text-2xl font-semibold">Giliran</span>
        </Link>
        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 xl:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`whitespace-nowrap rounded-full px-3 py-2.5 text-sm font-semibold hover:bg-surface-2 ${
                path?.startsWith(n.href) ? "bg-surface-2" : ""
              }`}
              aria-current={path?.startsWith(n.href) ? "page" : undefined}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <LanguageToggle />
          </div>
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <ConnectButton compact />
          <button
            className="btn btn-ghost !h-11 !w-11 !p-0 xl:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label="Menu"
          >
            <span aria-hidden>{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-sand px-4 pb-4 xl:hidden">
          <ul className="flex flex-col">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="block py-3 font-semibold" onClick={() => setOpen(false)}>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2 sm:hidden">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </nav>
      )}
      <div className="weave-band" aria-hidden />
    </header>
  );
}
