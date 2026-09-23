import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BRAND, TAGLINE } from "@/lib/marketingCopy";
import { SolanaWalletProvider } from "@/lib/wallet/SolanaWalletProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND} — ${TAGLINE}`,
    template: `%s | ${BRAND}`,
  },
  description:
    "Onchain policy memos, public GREEN/RED status, and agent verification on Solana.",
  keywords: ["Solana", "trading bot", "policy", "verification", "onchain", "GREEN/RED", "SpecGuard"],
  authors: [{ name: "SpecGuard" }],
  creator: "SpecGuard",
  publisher: "SpecGuard",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://specguard.xyz",
    siteName: BRAND,
    title: `${BRAND} — ${TAGLINE}`,
    description:
      "Onchain policy memos, public GREEN/RED status, and agent verification on Solana.",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: `${BRAND} — ${TAGLINE}` }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@specguardxyz",
    creator: "@specguardxyz",
    title: `${BRAND} — ${TAGLINE}`,
    description:
      "Onchain policy memos, public GREEN/RED status, and agent verification on Solana.",
    images: ["/og-image.svg"],
  },
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%2308080f'/><circle cx='16' cy='16' r='5' fill='%2300f5c4'/></svg>",
        sizes: "any",
      },
    ],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} dark`}>
      <body className="flex min-h-screen flex-col font-sans">
        <SolanaWalletProvider>
          <Navbar />
          <main className="relative z-[1] flex-1">{children}</main>
          <Footer />
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
