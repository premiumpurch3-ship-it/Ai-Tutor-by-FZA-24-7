import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { JourneySection } from "@/components/landing/journey";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { PricingSection } from "@/components/landing/pricing";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[var(--background)]">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[var(--primary)]/20 blur-[140px]" />
        <div className="absolute top-[60%] right-0 h-[500px] w-[500px] rounded-full bg-[var(--accent)]/10 blur-[140px]" />
      </div>
      <LandingNav />
      <Hero />
      <JourneySection />
      <FeatureGrid />
      <PricingSection />
      <FinalCta />
      <LandingFooter />
    </main>
  );
}
