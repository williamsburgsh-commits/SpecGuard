"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WalletConnect } from "@/app/components/chrome/WalletConnect";
import { BRAND, GITHUB_URL, NAV, SPEC_URL, VERSION_BADGE } from "@/lib/marketingCopy";
import { DASHBOARD_URL } from "@/lib/phoenix/constants";
import { getSiteNavLinks } from "@/lib/siteLinks";

const DESKTOP_LINKS = [
  { href: "/phoenix", label: "Phoenix" },
  { href: "/registry", label: "Registry" },
  { href: "/docs", label: "Docs" },
  { href: "/#how", label: NAV.howItWorks },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const links = getSiteNavLinks();

  const drawerLinks: { href: string; label: string; external?: boolean }[] = [
    { href: links.phoenix, label: NAV.phoenixPerps },
    { href: links.registry, label: "Registry" },
    { href: "/#how", label: NAV.howItWorks },
    { href: links.docs, label: NAV.docs },
    { href: "/#token", label: NAV.guard },
    { href: DASHBOARD_URL, label: "ClawPump", external: true },
    { href: SPEC_URL, label: NAV.spec, external: true },
    { href: GITHUB_URL, label: NAV.github, external: true },
  ];

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-[100] border-b border-[#2A2824] bg-[#0B0B0A]">
      <div className="sg-shell flex h-14 items-center justify-between gap-3">
        <Link href="/" className="flex min-w-0 items-center gap-2 font-semibold tracking-tight text-[#F4F1EA]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/pfp.png" alt="" width={24} height={24} className="h-6 w-6" />
          <span className="truncate">{BRAND}</span>
          <span className="shrink-0 border border-[#2A2824] px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] text-[#A39E93] uppercase">
            {VERSION_BADGE}
          </span>
        </Link>

        <nav className="hidden items-center gap-5 lg:flex" aria-label="Primary">
          {DESKTOP_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-[#A39E93] hover:text-[#F4F1EA]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <WalletConnect appearance="ghost" />
          <Link href={links.register} className="sg-btn-primary">
            Register an agent
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center border border-[#2A2824] text-[#F4F1EA] lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="flex flex-col gap-1.5" aria-hidden>
            <span className="block h-px w-4 bg-[#F4F1EA]" />
            <span className="block h-px w-4 bg-[#F4F1EA]" />
            <span className="block h-px w-4 bg-[#F4F1EA]" />
          </span>
        </button>
      </div>

      {open ? (
        <div
          id="site-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-x-0 top-14 bottom-0 z-[90] overflow-y-auto border-t border-[#2A2824] bg-[#0B0B0A] lg:hidden"
        >
          <nav className="sg-shell flex flex-col py-4" aria-label="Mobile">
            {drawerLinks.map((item) => (
              <DrawerLink key={item.label} item={item} onNavigate={() => setOpen(false)} />
            ))}
            <div className="mt-4 flex flex-col gap-3 border-t border-[#2A2824] pt-4">
              <Link
                href={links.register}
                className="sg-btn-primary w-full"
                onClick={() => setOpen(false)}
              >
                Register an agent
              </Link>
              <WalletConnect appearance="ghost" className="w-full" />
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function DrawerLink({
  item,
  onNavigate,
}: {
  item: { href: string; label: string; external?: boolean };
  onNavigate: () => void;
}) {
  const className = "border-b border-[#2A2824] py-3 text-base text-[#F4F1EA]";
  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noreferrer" className={className} onClick={onNavigate}>
        {item.label} ↗
      </a>
    );
  }
  return (
    <Link href={item.href} className={className} onClick={onNavigate}>
      {item.label}
    </Link>
  );
}
