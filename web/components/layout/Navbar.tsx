"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { WalletConnect } from "@/app/components/chrome/WalletConnect";
import { BRAND, GITHUB_URL, NAV, SPEC_URL, VERSION_BADGE } from "@/lib/marketingCopy";
import { DASHBOARD_URL } from "@/lib/phoenix/constants";
import { getSiteNavLinks } from "@/lib/siteLinks";
import { cn } from "@/lib/utils";

function NavChevron() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-3 w-3 opacity-60"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function closeMenu(event: { currentTarget: EventTarget & Element }) {
  const details = event.currentTarget.closest("details");
  if (details) details.open = false;
}

function closeOtherMenus(event: { currentTarget: HTMLDetailsElement }) {
  if (!event.currentTarget.open) return;
  const root = event.currentTarget.closest("nav");
  root?.querySelectorAll("details").forEach((el) => {
    if (el !== event.currentTarget) el.open = false;
  });
}

function NavDropdown({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="relative" onToggle={closeOtherMenus}>
      <summary
        className="flex cursor-pointer list-none items-center gap-1 rounded-full px-3 py-1.5 text-sm text-[#8888aa] hover:text-white marker:content-none [&::-webkit-details-marker]:hidden"
      >
        {label}
        <NavChevron />
      </summary>
      <ul className="absolute left-1/2 z-[120] mt-3 w-52 -translate-x-1/2 rounded-2xl border border-[#ffffff0f] bg-[#0f0f1a] p-2 shadow-[0_16px_40px_#00000080]">
        {children}
      </ul>
    </details>
  );
}

function MenuLink({
  href,
  children,
  external,
  onClick,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
  onClick?: (event: { currentTarget: EventTarget & Element }) => void;
}) {
  const className =
    "block rounded-xl px-3 py-2 text-sm text-[#8888aa] hover:bg-[#ffffff08] hover:text-white";
  if (external) {
    return (
      <li>
        <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>
          {children}
        </a>
      </li>
    );
  }
  return (
    <li>
      <Link href={href} className={className} onClick={onClick}>
        {children}
      </Link>
    </li>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const links = getSiteNavLinks();

  const productItems = [
    { href: links.phoenix, label: NAV.phoenixPerps },
    { href: links.registry, label: "Registry" },
    { href: links.registryHome, label: NAV.verification },
  ];

  const resourceItems = [
    { href: links.docs, label: NAV.docs },
    { href: "/#how", label: NAV.howItWorks },
    { href: DASHBOARD_URL, label: "ClawPump", external: true },
    { href: "/#token", label: NAV.guard },
    { href: SPEC_URL, label: NAV.spec, external: true },
    { href: GITHUB_URL, label: NAV.github, external: true },
  ] as const;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-[100]">
      <div
        className={cn(
          "transition-colors duration-300",
          scrolled ? "border-b border-[#ffffff0f] bg-[#08080fcc] backdrop-blur-md" : "bg-transparent",
        )}
      >
        <div className="sg-shell flex h-20 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/pfp.png" alt="" width={28} height={28} className="h-7 w-7 rounded-md" />
            {BRAND}
            <span className="rounded-full border border-[#00f5c4]/40 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#00f5c4]">
              {VERSION_BADGE}
            </span>
          </Link>

          <nav className="hidden items-center gap-2 lg:flex" aria-label="Primary">
            <NavDropdown label={NAV.product}>
              {productItems.map((item) => (
                <MenuLink key={item.label} href={item.href} onClick={closeMenu}>
                  {item.label}
                </MenuLink>
              ))}
            </NavDropdown>
            <NavDropdown label="Resources">
              {resourceItems.map((item) => (
                <MenuLink
                  key={item.label}
                  href={item.href}
                  external={"external" in item && item.external}
                  onClick={closeMenu}
                >
                  {item.label}
                  {"external" in item && item.external ? " ↗" : ""}
                </MenuLink>
              ))}
            </NavDropdown>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href={links.register}
              className="sg-btn-ghost hidden h-11 min-h-11 px-5 sm:inline-flex"
            >
              {NAV.registerAgent}
            </Link>
            <WalletConnect appearance="primary" />
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ffffff18] lg:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <span className="sr-only">Menu</span>
              <span className="flex flex-col gap-1.5">
                <span className="block h-px w-4 bg-white" />
                <span className="block h-px w-4 bg-white" />
                <span className="block h-px w-4 bg-white" />
              </span>
            </button>
          </div>
        </div>
      </div>

      {open ? (
        <div className="border-b border-[#ffffff0f] bg-[#08080ff2] backdrop-blur-md lg:hidden">
          <nav className="sg-shell flex flex-col gap-1 py-6 text-sm" aria-label="Mobile">
            <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-[#8888aa]">{NAV.product}</p>
            {productItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="py-2 text-[#8888aa] hover:text-white"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <p className="mb-1 mt-4 text-[11px] uppercase tracking-[0.16em] text-[#8888aa]">
              Resources
            </p>
            {resourceItems.map((item) =>
              "external" in item && item.external ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 text-[#8888aa] hover:text-white"
                  onClick={() => setOpen(false)}
                >
                  {item.label} ↗
                </a>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className="py-2 text-[#8888aa] hover:text-white"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ),
            )}
            <Link
              href={links.register}
              className="mt-4 text-white"
              onClick={() => setOpen(false)}
            >
              {NAV.registerAgent}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
