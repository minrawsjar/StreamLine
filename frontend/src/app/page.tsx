import {
  HeroSection,
  StatsStrip,
  HowItWorksSection,
  WhySuiSection,
  ComparisonSection,
  SiteFooter,
} from "@/components/landing";

export default function Home() {
  return (
    <main className="relative w-full">
      <HeroSection />
      <StatsStrip />
      <HowItWorksSection />
      <WhySuiSection />
      <ComparisonSection />
      <SiteFooter />
    </main>
  );
}
