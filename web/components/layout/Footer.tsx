import Link from "next/link";
import { BRAND, GITHUB_URL, VERSION_BADGE } from "@/lib/marketingCopy";

export function Footer() {
  return (
    <footer className="border-t border-[#ffffff0f] py-16">
      <div className="sg-shell flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/pfp.png" alt="" width={28} height={28} className="h-7 w-7 rounded-md" />
          {BRAND}
          <span className="rounded-full border border-[#00f5c4]/40 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#00f5c4]">
            {VERSION_BADGE}
          </span>
        </Link>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#8888aa]" aria-label="Footer">
          <Link href="/phoenix" className="hover:text-white">
            Phoenix
          </Link>
          <Link href="/registry" className="hover:text-white">
            Registry
          </Link>
          <Link href="/docs" className="hover:text-white">
            Docs
          </Link>
          <Link href="/register" className="hover:text-white">
            Register
          </Link>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-white">
            GitHub
          </a>
          <a
            href="https://x.com/specguardxyz"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white"
          >
            @specguardxyz
          </a>
        </nav>
      </div>
    </footer>
  );
}
