import { BadgeSection } from "@/components/sections/BadgeSection";
import { EventTicker } from "@/components/sections/EventTicker";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { GuardSection } from "@/components/sections/GuardSection";
import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { McpSection } from "@/components/sections/McpSection";
import { RegistryPreview } from "@/components/sections/RegistryPreview";
import { RulesSection } from "@/components/sections/RulesSection";
import { loadLanding } from "@/lib/home/loadLanding";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await loadLanding();

  return (
    <div>
      <Hero data={data} />
      <EventTicker events={data.events} eventSource={data.eventSource} />
      <HowItWorks />
      <RulesSection limits={data.limits} />
      <McpSection />
      <RegistryPreview data={data} />
      <BadgeSection wallet={data.wallet} />
      <GuardSection />
      <FinalCTA />
    </div>
  );
}
