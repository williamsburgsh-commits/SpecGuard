import Link from "next/link";
import { BRAND, GITHUB_URL, SPEC_URL, VERSION_BADGE } from "@/lib/marketingCopy";

export function Footer() {
  return (
    <footer className="border-t border-[#2A2824] py-8">
      <div className="sg-shell flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-[#F4F1EA]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/pfp.png" alt="" width={24} height={24} className="h-6 w-6" />
          {BRAND}
          <span className="border border-[#2A2824] px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] text-[#A39E93] uppercase">
            {VERSION_BADGE}
          </span>
        </Link>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[12px] text-[#A39E93]" aria-label="Footer">
          <Link href="/phoenix" className="hover:text-[#F4F1EA]">
            Phoenix
          </Link>
          <Link href="/registry" className="hover:text-[#F4F1EA]">
            Registry
          </Link>
          <Link href="/docs" className="hover:text-[#F4F1EA]">
            Docs
          </Link>
          <Link href="/register" className="hover:text-[#F4F1EA]">
            Register
          </Link>
          <a href={SPEC_URL} target="_blank" rel="noreferrer" className="hover:text-[#F4F1EA]">
            Spec
          </a>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-[#F4F1EA]">
            GitHub
          </a>
          <a href="https://x.com/specguardxyz" target="_blank" rel="noreferrer" className="hover:text-[#F4F1EA]">
            @specguardxyz
          </a>
          <a
            href="https://www.npmjs.com/package/@specguardxyz/mcp"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#F4F1EA]"
          >
            npm @specguardxyz/mcp
          </a>
        </nav>
      </div>
    </footer>
  );
}
