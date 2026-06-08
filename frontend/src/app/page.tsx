import {
  Navbar,
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
      <Navbar />
      <HeroSection />
      <StatsStrip />
      <HowItWorksSection />
      <WhySuiSection />
      <ComparisonSection />
      <SiteFooter />
    </main>
  );
}
