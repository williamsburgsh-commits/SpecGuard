import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { RegistryPreview } from "@/components/sections/RegistryPreview";
import { BadgeSection } from "@/components/sections/BadgeSection";
import { GuardSection } from "@/components/sections/GuardSection";
import { FinalCTA } from "@/components/sections/FinalCTA";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div>
      <Hero />
      <HowItWorks />
      <RegistryPreview />
      <BadgeSection />
      <GuardSection />
      <FinalCTA />
    </div>
  );
}
