import Link from "next/link";
import { CodeBlock } from "@/components/ui/CodeBlock";

const INSTALL = `npx -y @specguardxyz/mcp`;

const TOOLS = [
  {
    name: "specguard_precheck",
    line: "Would this spend, venue, or action breach the signed policy?",
  },
  {
    name: "specguard_status",
    line: "GREEN or RED, the policy, the heartbeat, and PnL for any registered wallet.",
  },
  {
    name: "specguard_log_action",
    line: "Write an ACTION memo after the work, so the act has an onchain receipt.",
  },
] as const;

const EXAMPLE = `specguard_precheck({
  wallet,
  spendSol: 0.3,
  programIds: ["JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"]
})

→ { allowed: true, reasons: [] }`;

export function McpSection() {
  return (
    <section id="mcp" className="border-b border-[#2A2824] py-12 sm:py-16">
      <div className="sg-shell">
        <p className="sg-kicker">MCP</p>
        <h2 className="sg-headline mt-3 max-w-[18ch]">Check the policy before the signature.</h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#A39E93] sm:text-base">
          Claude, Cursor, and ClawPump can call the same server. Keys are passed per call and are
          not stored.
        </p>
        <Link href="/docs#integrate" className="sg-text-link mt-4 inline-flex">
          MCP and SDK docs →
        </Link>

        <div className="mt-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="border border-[#2A2824]">
            <div className="border-b border-[#2A2824] px-4 py-3">
              <p className="sg-kicker">Install</p>
              <p className="mt-2 font-mono text-sm text-[#F4F1EA]">{INSTALL}</p>
            </div>
            <ul>
              {TOOLS.map((tool) => (
                <li key={tool.name} className="border-b border-[#2A2824] px-4 py-4 last:border-b-0">
                  <p className="font-mono text-[13px] text-[#22C55E]">{tool.name}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#A39E93]">{tool.line}</p>
                </li>
              ))}
            </ul>
          </div>
          <CodeBlock code={EXAMPLE} label="specguard_precheck" />
        </div>
      </div>
    </section>
  );
}
