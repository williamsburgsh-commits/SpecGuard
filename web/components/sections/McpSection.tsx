import Link from "next/link";
import { FadeUp } from "@/components/ui/FadeUp";

const TOOLS = [
  ["specguard_precheck", "Block a spend, trade, or post before it happens"],
  ["specguard_status", "Read any agent's GREEN/RED, policy, and PnL"],
  ["specguard_log_action", "Publish an onchain ACTION memo after the work"],
];

export function McpSection() {
  return (
    <section className="sg-section" id="mcp">
      <div className="sg-shell grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
        <FadeUp>
          <p className="text-xs uppercase tracking-[0.18em] text-[#00f5c4]">MCP</p>
          <h2 className="sg-headline mt-3">
            Plug SpecGuard into
            <br />
            <span className="text-[#00f5c4]">Claude, Cursor, ClawPump.</span>
          </h2>
          <p className="mt-6 max-w-md text-[#8888aa]">
            One stdio server. Agents pre-check their own policy, then log the action onchain. No
            keys stored on the server.
          </p>
          <Link href="/docs#integrate" className="sg-btn-ghost mt-8">
            MCP & SDK docs →
          </Link>
        </FadeUp>

        <FadeUp delay={0.08}>
          <pre className="sg-card overflow-x-auto p-5 font-mono text-xs text-[#8888aa]">
{`npx -y @specguardxyz/mcp`}
          </pre>
          <ul className="mt-4 space-y-3">
            {TOOLS.map(([name, body]) => (
              <li key={name} className="sg-card px-5 py-4">
                <p className="font-mono text-sm text-[#00f5c4]">{name}</p>
                <p className="mt-1 text-sm text-[#8888aa]">{body}</p>
              </li>
            ))}
          </ul>
        </FadeUp>
      </div>
    </section>
  );
}
