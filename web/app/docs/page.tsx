import Link from "next/link";
import { GITHUB_URL, NAV, SPEC_URL } from "@/lib/marketingCopy";
import { getSiteNavLinks } from "@/lib/siteLinks";

const SECTIONS = [
  { id: "overview", title: "What SpecGuard is" },
  { id: "green-red", title: "GREEN / RED" },
  { id: "products", title: "Phoenix vs verification" },
  { id: "register", title: "Registration & $GUARD" },
  { id: "agent-types", title: "Agent types" },
  { id: "policy-v2", title: "Policy v2" },
  { id: "memos", title: "Onchain memos" },
  { id: "verification", title: "Verification" },
  { id: "policy", title: "Public spec" },
  { id: "integrate", title: "MCP & SDK" },
  { id: "badge", title: "Embeddable badge" },
  { id: "status-json", title: "status.json" },
  { id: "agents", title: "Reference vs registered" },
  { id: "faq", title: "FAQ" },
];

export const metadata = {
  title: NAV.docs,
};

export default function DocsPage() {
  const links = getSiteNavLinks();

  return (
    <div className="sg-shell pb-24 pt-32">
      <h1 className="sg-headline">Documentation</h1>
      <p className="mt-3 max-w-2xl text-sm text-[#8888aa]">
        How Phoenix, the registry, and the $GUARD gate fit together.
      </p>

      <div className="mt-10 flex flex-col gap-10 lg:flex-row">
        <nav aria-label="Docs sections" className="lg:sticky lg:top-24 lg:w-52 lg:shrink-0 lg:self-start">
          <ul className="space-y-2 border-l border-[#ffffff18] pl-4 text-sm text-[#8888aa]">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1 space-y-14">
          <section id="overview" className="scroll-mt-24">
            <h2 className="text-2xl font-bold">What SpecGuard is</h2>
            <p className="mt-3 text-[#8888aa]">
              SpecGuard ships two products on one site: <strong>Phoenix Perps</strong>, a live SOL
              perps operator under a public spec, and <strong>agent verification</strong>, a registry
              where any wallet can publish policy memos and show GREEN/RED status with onchain proof.
            </p>
          </section>

          <section id="green-red" className="scroll-mt-24">
            <h2 className="text-2xl font-bold">GREEN / RED</h2>
            <p className="mt-3 text-[#8888aa]">
              <span className="text-[#00ff88]">GREEN</span> means the agent is within its
              published policy. <span className="text-[#ff3b3b]">RED</span> means a breach was
              observed (for example a flatten) with a linked onchain proof signature in the registry.
            </p>
          </section>

          <section id="products" className="scroll-mt-24">
            <h2 className="text-2xl font-bold">Phoenix Perps vs verification</h2>
            <ul className="mt-3 list-inside list-disc space-y-2 text-[#8888aa]">
              <li>
                Phoenix: live operator terminal, heartbeat, and{" "}
                <Link href={links.phoenix} className="text-[#00f5c4] hover:underline">
                  /phoenix
                </Link>
              </li>
              <li>
                Verification:{" "}
                <Link href={links.registry} className="text-[#00f5c4] hover:underline">
                  agent registry
                </Link>
                , register flow, badges, and public agent pages
              </li>
            </ul>
          </section>

          <section id="register" className="scroll-mt-24">
            <h2 className="text-2xl font-bold">Registration and the $GUARD gate</h2>
            <p className="mt-3 text-[#8888aa]">
              Connect the wallet your agent operates from on{" "}
              <Link href={links.register} className="text-[#00f5c4] hover:underline">
                /register
              </Link>
              . The wizard walks through: wallet connect → $GUARD balance →{" "}
              <strong className="text-white">agent type</strong> → policy limits → sign the policy
              memo on Solana. Registration checks a minimum balance of{" "}
              <strong className="text-white">5,000,000 $GUARD</strong> on the signing wallet before
              you can publish.
            </p>
            <p className="mt-3 text-sm text-[#8888aa]">
              You can register the connected wallet or watch a different agent wallet while $GUARD
              stays on the wallet that signs.
            </p>
          </section>

          <section id="agent-types" className="scroll-mt-24">
            <h2 className="text-2xl font-bold">Agent types</h2>
            <p className="mt-3 text-[#8888aa]">
              Not every agent trades. A policy declares what kind of agent it is, and only
              the limits that fit that work are enforced. Every type carries a per-transaction
              spend cap and a heartbeat; the rest is optional.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#ffffff18] text-left text-[#8888aa]">
                    <th className="py-2 pr-4 font-normal">Type</th>
                    <th className="py-2 font-normal">Limits that apply</th>
                  </tr>
                </thead>
                <tbody className="text-[#8888aa]">
                  {[
                    [
                      "trader",
                      "Max drawdown, allowed venues (≥1), per-tx and optional daily spend",
                    ],
                    [
                      "social",
                      "Posts per day, DMs on/off, allowed platforms, spend caps",
                    ],
                    ["data", "Allowed tools (optional allowlist), spend caps, denied actions"],
                    ["infra", "Allowed tools, spend caps, denied actions"],
                    ["general", "Mix of trading, social, and capability limits"],
                  ].map(([type, limits]) => (
                    <tr key={type} className="border-b border-[#ffffff0f]">
                      <td className="py-2 pr-4 font-mono text-[#00f5c4]">{type}</td>
                      <td className="py-2">{limits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-[#8888aa]">
              Breach reasons:{" "}
              <code className="font-mono text-xs">
                max_drawdown · max_spend_per_tx · daily_spend_exceeded · disallowed_venue ·
                disallowed_tool · denied_action · social_limit_exceeded · heartbeat_missed
              </code>
            </p>
          </section>

          <section id="policy-v2" className="scroll-mt-24">
            <h2 className="text-2xl font-bold">Policy v2</h2>
            <p className="mt-3 text-[#8888aa]">
              New registrations use <strong className="text-white">policy version 2</strong> in the
              onchain memo (<code className="font-mono text-xs">version: 2</code>). Legacy agents
              may still use v1 (<code className="font-mono text-xs">version: 1</code>) with trading-only
              fields. The registry stores a separate{" "}
              <code className="font-mono text-xs">schema_version</code> column;{" "}
              <code className="font-mono text-xs">policies.version</code> still means “nth policy
              published by this wallet.”
            </p>
            <p className="mt-3 text-[#8888aa]">
              Every v2 policy includes <code className="font-mono text-xs">type</code>,{" "}
              <code className="font-mono text-xs">heartbeatIntervalSec</code>, and{" "}
              <code className="font-mono text-xs">spendLimits.perTxSol</code>. Optional{" "}
              <code className="font-mono text-xs">spendLimits.dailySol</code> caps total SOL spend
              in a rolling 24-hour window (timestamped transactions only).
            </p>
            <pre className="sg-card mt-4 overflow-x-auto p-4 font-mono text-xs text-[#8888aa]">
{`// Social agent example
{
  "version": 2,
  "name": "My Social Bot",
  "type": "social",
  "heartbeatIntervalSec": 300,
  "spendLimits": { "perTxSol": 0.5, "dailySol": 2 },
  "socialLimits": {
    "maxPostsPerDay": 20,
    "allowDMs": false,
    "platforms": ["x"]
  }
}

// Trader example
{
  "version": 2,
  "name": "My Trader",
  "type": "trader",
  "heartbeatIntervalSec": 300,
  "spendLimits": { "perTxSol": 0.5 },
  "maxDrawdownPct": 10,
  "allowedVenues": ["jupiter-swap", "jupiter-trigger"]
}`}
            </pre>
          </section>

          <section id="memos" className="scroll-mt-24">
            <h2 className="text-2xl font-bold">Onchain memos</h2>
            <p className="mt-3 text-[#8888aa]">
              All SpecGuard proofs use the memo program with prefix{" "}
              <code className="font-mono text-xs">SPECGUARD:v1:</code>
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#ffffff18] text-left text-[#8888aa]">
                    <th className="py-2 pr-4 font-normal">Tag</th>
                    <th className="py-2 font-normal">Purpose</th>
                  </tr>
                </thead>
                <tbody className="text-[#8888aa]">
                  {[
                    ["POLICY", "Immutable registration — full policy JSON"],
                    ["HB", "Heartbeat — agent is alive"],
                    ["ACTION", "Non-trading work: posts, DMs, tool calls (with optional platform/tool)"],
                    ["FLATTEN", "Operator flatten proof (reference drills)"],
                    ["RESET", "Operator reset after a drill"],
                  ].map(([tag, purpose]) => (
                    <tr key={tag} className="border-b border-[#ffffff0f]">
                      <td className="py-2 pr-4 font-mono text-[#00f5c4]">{tag}</td>
                      <td className="py-2">{purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-[#8888aa]">
              ACTION memos look like{" "}
              <code className="font-mono text-xs">
                SPECGUARD:v1:ACTION:&#123;&quot;type&quot;:&quot;social_post&quot;,&quot;ts&quot;:…,&quot;platform&quot;:&quot;x&quot;&#125;
              </code>
              . The registry ingests them from Helius webhooks and uses them during verification.
            </p>
          </section>

          <section id="verification" className="scroll-mt-24">
            <h2 className="text-2xl font-bold">Verification</h2>
            <p className="mt-3 text-[#8888aa]">
              Verification re-evaluates an agent against its onchain policy: chain transactions
              (spend, venues, daily cap), ACTION memos (social and tool limits), heartbeat age,
              and drawdown when the policy defines it.
            </p>
            <ul className="mt-3 list-inside list-disc space-y-2 text-[#8888aa]">
              <li>
                <strong className="text-white">On demand:</strong>{" "}
                <code className="font-mono text-xs">POST /api/agents/[wallet]/verify</code> or MCP{" "}
                <code className="font-mono text-xs">specguard_verify</code>
              </li>
              <li>
                <strong className="text-white">Automatic:</strong> heartbeat sweep marks{" "}
                <code className="font-mono text-xs">heartbeat_missed</code>; PnL cron checks{" "}
                <code className="font-mono text-xs">max_drawdown</code> for traders
              </li>
              <li>
                <strong className="text-white">Social agents:</strong> limits apply to ACTION memos
                the agent publishes (e.g. <code className="font-mono text-xs">social_post</code>,{" "}
                <code className="font-mono text-xs">social_dm</code>). Pre-check before acting; log
                after. Verify counts posts in the last 24 hours against{" "}
                <code className="font-mono text-xs">maxPostsPerDay</code>.
              </li>
            </ul>
            <p className="mt-4 text-sm text-[#8888aa]">
              Verify scans transactions and ACTION memos from the rolling 24-hour window (not just
              the latest 100 txs). A policy that is never pre-checked is only a promise — integration
              is what makes it enforcement.
            </p>
          </section>

          <section id="policy" className="scroll-mt-24">
            <h2 className="text-2xl font-bold">Public spec</h2>
            <p className="mt-3 text-[#8888aa]">
              Reference operator limits and site metadata are pinned in the{" "}
              <a
                href={SPEC_URL}
                target="_blank"
                rel="noreferrer"
                className="text-[#00f5c4] hover:underline"
              >
                public reference spec JSON
              </a>
              . Registered agents publish their own policy memos on Solana; the registry mirrors
              them in <code className="font-mono text-xs">raw_json</code>.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={SPEC_URL} target="_blank" rel="noreferrer" className="sg-btn-ghost">
                Open reference spec JSON ↗
              </a>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="sg-btn-ghost">
                GitHub ↗
              </a>
            </div>
          </section>

          <section id="integrate" className="scroll-mt-24">
            <h2 className="text-2xl font-bold">Connect an agent: MCP or SDK</h2>
            <p className="mt-3 text-[#8888aa]">
              A policy only enforces anything if the agent checks it before acting. Use the{" "}
              <strong className="text-white">precheck → act → log</strong> loop for every spend,
              trade, post, or tool call.
            </p>

            <h3 className="mt-6 text-lg font-semibold">MCP server (@specguardxyz/mcp)</h3>
            <p className="mt-2 text-[#8888aa]">
              Works with Claude, Cursor, <strong className="text-white">ClawPump</strong>, or any
              MCP-compatible runtime. Stateless: signing keys are passed per tool call and never
              stored on the server.
            </p>
            <pre className="sg-card mt-3 overflow-x-auto p-4 font-mono text-xs text-[#8888aa]">
{`{
  "mcpServers": {
    "specguard": {
      "command": "npx",
      "args": ["-y", "@specguardxyz/mcp"],
      "env": {
        "SOLANA_RPC_URL": "https://api.mainnet-beta.solana.com",
        "SPECGUARD_API_URL": "https://specguard.xyz"
      }
    }
  }
}`}
            </pre>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#ffffff18] text-left text-[#8888aa]">
                    <th className="py-2 pr-4 font-normal">Tool</th>
                    <th className="py-2 pr-4 font-normal">Key?</th>
                    <th className="py-2 font-normal">What it does</th>
                  </tr>
                </thead>
                <tbody className="text-[#8888aa]">
                  {[
                    [
                      "specguard_register",
                      "no",
                      "Validate policy + return unsigned memo tx (sign to register)",
                    ],
                    ["specguard_precheck", "no", "Would this action or spend breach the policy?"],
                    [
                      "specguard_log_action",
                      "yes",
                      "Publish ACTION memo (social_post, api_call, …)",
                    ],
                    ["specguard_heartbeat", "yes", "Publish heartbeat memo"],
                    ["specguard_status", "no", "GREEN/RED, policy, heartbeat, PnL for any wallet"],
                    ["specguard_verify", "no", "Trigger registry re-evaluation"],
                    ["specguard_list_agents", "no", "List all registered agents"],
                  ].map(([tool, key, desc]) => (
                    <tr key={tool} className="border-b border-[#ffffff0f]">
                      <td className="py-2 pr-4 font-mono text-xs text-[#00f5c4]">{tool}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{key}</td>
                      <td className="py-2">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <pre className="sg-card mt-4 overflow-x-auto p-4 font-mono text-xs text-[#8888aa]">
{`// ClawPump / Claude tool flow (conceptual)
specguard_precheck({ wallet, action: { type: "social_post", platform: "x" } })
  → allowed: true
→ post on X
specguard_log_action({ keypair, action: { type: "social_post", platform: "x" } })

// Before a swap
specguard_precheck({
  wallet,
  spendSol: 0.3,
  programIds: ["JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"]
})`}
            </pre>

            <h3 className="mt-6 text-lg font-semibold">TypeScript SDK (@specguardxyz/sdk)</h3>
            <p className="mt-2 text-[#8888aa]">
              For agents that run as your own Node process. Same semantics as MCP.
            </p>
            <pre className="sg-card mt-3 overflow-x-auto p-4 font-mono text-xs text-[#8888aa]">
{`npm install @specguardxyz/sdk

import { SpecGuard } from "@specguardxyz/sdk";

const guard = SpecGuard.fromSecretKey(process.env.AGENT_SECRET_KEY!);

await guard.register({
  version: 2,
  name: "MyAgent",
  type: "social",
  heartbeatIntervalSec: 300,
  spendLimits: { perTxSol: 0.5 },
  socialLimits: { maxPostsPerDay: 20, allowDMs: false, platforms: ["x"] },
});

await guard.startHeartbeat();

const check = await guard.preCheck({ type: "social_post", platform: "x" });
if (!check.allowed) return;

await postToX(content);
await guard.logAction({ type: "social_post", platform: "x" });`}
            </pre>
            <p className="mt-4 text-sm text-[#8888aa]">
              Packages live in the SpecGuard monorepo:{" "}
              <code className="font-mono text-xs">@specguardxyz/core</code> (schema + evaluate),{" "}
              <code className="font-mono text-xs">@specguardxyz/sdk</code>,{" "}
              <code className="font-mono text-xs">@specguardxyz/mcp</code>.
            </p>
          </section>

          <section id="badge" className="scroll-mt-24">
            <h2 className="text-2xl font-bold">Embeddable badge</h2>
            <p className="mt-3 text-[#8888aa]">
              Badges are served at{" "}
              <code className="font-mono text-sm">/badge/[wallet]</code> for embeds on external sites.
              After registration you receive an HTML snippet in the wizard.
            </p>
          </section>

          <section id="status-json" className="scroll-mt-24">
            <h2 className="text-2xl font-bold">status.json</h2>
            <p className="mt-3 text-[#8888aa]">
              Phoenix operator state is published as machine-readable JSON, refreshed on the live
              terminal.
            </p>
            <a href={links.phoenixStatusJson} className="sg-btn-ghost mt-4 font-mono">
              /status.json
            </a>
          </section>

          <section id="agents" className="scroll-mt-24">
            <h2 className="text-2xl font-bold">Reference agent vs registered agent</h2>
            <p className="mt-3 text-[#8888aa]">
              The SpecGuard reference operator is labeled <strong>Reference agent</strong>. All other
              wallets in the registry are <strong>Registered agents</strong>.
            </p>
          </section>

          <section id="faq" className="scroll-mt-24">
            <h2 className="text-2xl font-bold">FAQ</h2>
            <dl className="mt-6 space-y-6">
              <div>
                <dt className="font-semibold">What is GREEN / RED?</dt>
                <dd className="mt-2 text-[#8888aa]">
                  GREEN means the agent is within its published policy. RED means a breach was
                  observed (for example a flatten) with a linked onchain proof signature.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Phoenix vs verification?</dt>
                <dd className="mt-2 text-[#8888aa]">
                  Phoenix is the live SOL perps operator under a public spec. Verification is the
                  registry any wallet can join to publish a policy memo and show public GREEN/RED
                  status.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Can RED become GREEN?</dt>
                <dd className="mt-2 text-[#8888aa]">
                  Reference agent drills may use an operator RESET. Third-party registered agents
                  stay RED in v1.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">What is $GUARD for?</dt>
                <dd className="mt-2 text-[#8888aa]">
                  Registration gate. The connected wallet must hold at least 5,000,000 $GUARD
                  before you can publish a policy memo.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">How do social agents get marked RED?</dt>
                <dd className="mt-2 text-[#8888aa]">
                  When verification runs, the registry counts ACTION memos (e.g.{" "}
                  <code className="font-mono text-xs">social_post</code>) in the last 24 hours,
                  checks platforms and DMs against <code className="font-mono text-xs">socialLimits</code>,
                  and compares spend to <code className="font-mono text-xs">spendLimits</code>.
                  The agent should call pre-check before each post and log an ACTION memo after.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">MCP vs SDK?</dt>
                <dd className="mt-2 text-[#8888aa]">
                  Same policy engine. Use MCP when the agent runtime is Claude, Cursor, or ClawPump.
                  Use the SDK when you own the Node process. Both support v2 policies and the
                  precheck → act → log pattern.
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
