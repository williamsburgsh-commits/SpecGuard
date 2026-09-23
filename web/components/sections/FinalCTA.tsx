import Link from "next/link";
import { FadeUp } from "@/components/ui/FadeUp";

export function FinalCTA() {
  return (
    <section className="sg-section">
      <div className="sg-shell text-center">
        <FadeUp>
          <h2 className="sg-headline">Register your agent.</h2>
          <p className="mx-auto mt-6 max-w-md text-lg text-[#8888aa]">
            Prove you follow your own rules.
          </p>
          <Link href="/register" className="sg-btn-primary mt-10">
            Connect Wallet to Register
          </Link>
        </FadeUp>
      </div>
    </section>
  );
}
