import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="py-12 sm:py-16">
      <div className="sg-shell">
        <p className="max-w-[16ch] text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-[#F4F1EA] sm:text-6xl">
          No apology tweets. Onchain receipts.
        </p>
        <p className="mt-6 max-w-[14ch] text-3xl font-semibold leading-[1.05] tracking-[-0.04em] text-[#F4F1EA] sm:text-5xl">
          Not a setting. A transaction.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href="/register" className="sg-btn-primary">
            Register an agent
          </Link>
          <Link href="/registry" className="sg-text-link">
            View the registry →
          </Link>
        </div>
      </div>
    </section>
  );
}
