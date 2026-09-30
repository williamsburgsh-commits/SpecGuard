import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { McpSection } from "@/components/sections/McpSection";
import { RegistryPreview, type RegistryPreviewRow } from "@/components/sections/RegistryPreview";
import { BadgeSection } from "@/components/sections/BadgeSection";
import { GuardSection } from "@/components/sections/GuardSection";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { listAgents } from "@/lib/agents/listAgents";
import { loadOperatorStatus } from "@/lib/phoenix/operatorStatus";
import { getSupabasePublic } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

async function loadRegistryPreview(): Promise<RegistryPreviewRow[]> {
  try {
    const agents = await listAgents(getSupabasePublic(), {});
    return agents.slice(0, 4).map((agent) => ({
      name: agent.name,
      status: agent.status,
      href: `/agent/${agent.wallet}`,
      meta:
        agent.status === "RED"
          ? "BREACHED"
          : agent.daysActive == null
            ? "Registered"
            : `${agent.daysActive} days active`,
    }));
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [operator, rows] = await Promise.all([
    Promise.resolve(loadOperatorStatus()),
    loadRegistryPreview(),
  ]);

  return (
    <div>
      <Hero operator={operator} />
      <HowItWorks />
      <McpSection />
      <RegistryPreview rows={rows} />
      <BadgeSection />
      <GuardSection />
      <FinalCTA />
    </div>
  );
}
