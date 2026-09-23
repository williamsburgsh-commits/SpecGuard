import Link from "next/link";
import { GITHUB_URL, NAV, SPEC_URL } from "@/lib/marketingCopy";
import { getSiteNavLinks } from "@/lib/siteLinks";

const SECTIONS = [
  { id: "overview", title: "What SpecGuard is" },
  { id: "green-red", title: "GREEN / RED" },
  { id: "products", title: "Phoenix vs verification" },
  { id: "register", title: "Registration & $GUARD" },
  { id: "policy", title: "Policy memos & spec" },
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
              Connect the wallet your bot trades from on{" "}
              <Link href={links.register} className="text-[#00f5c4] hover:underline">
                /register
              </Link>
              . Registration checks a minimum balance of{" "}
              <strong className="text-white">5,000,000 $GUARD</strong> before you can publish a
              policy memo onchain.
            </p>
          </section>

          <section id="policy" className="scroll-mt-24">
            <h2 className="text-2xl font-bold">Policy memos and the public spec</h2>
            <p className="mt-3 text-[#8888aa]">
              Limits are encoded in policy memos on Solana and pinned in the{" "}
              <a
                href={SPEC_URL}
                target="_blank"
                rel="noreferrer"
                className="text-[#00f5c4] hover:underline"
              >
                public reference spec JSON
              </a>
              .
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
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
