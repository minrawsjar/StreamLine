import Link from "next/link";
import { HeroNav } from "./HeroNav";
import { HeroBackground } from "./HeroBackground";
import { PhoneMockup } from "./PhoneMockup";

export function HeroSection() {
  return (
    <section
      id="top"
      className="relative flex min-h-[110dvh] w-full flex-col overflow-hidden bg-white"
    >
      <HeroBackground />
      <HeroNav />

      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col items-center justify-center gap-12 px-[5%] py-10 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-10 lg:py-16">
        {/* Left column */}
        <div className="order-2 flex flex-col items-center text-center lg:order-1 lg:items-end lg:text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#1a9e8f]">
            No gas. No claims.
          </p>
          <h1 className="mt-4 max-w-[340px] text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold leading-[1.1] tracking-tight text-[#111] lg:max-w-[360px]">
            Get paid{" "}
            <span className="text-[#1a9e8f]">while you work.</span>
          </h1>
          <p className="mt-4 max-w-[340px] text-[15px] font-medium leading-snug text-[#444] lg:max-w-[360px]">
            Money hits your wallet every 60 seconds. You don&apos;t click
            anything. You don&apos;t pay fees. It just lands.
          </p>
        </div>

        {/* Center — phone mockup */}
        <div className="order-1 lg:order-2">
          <PhoneMockup />
        </div>

        {/* Right column */}
        <div className="order-3 flex flex-col items-center text-center lg:items-start lg:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#1a9e8f]">
            Not ethereum. Not vaporware.
          </p>
          <h2 className="mt-4 max-w-[340px] text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold leading-[1.1] tracking-tight text-[#111] lg:max-w-[360px]">
            The money{" "}
            <span className="text-[#1a9e8f]">actually arrives.</span>
          </h2>
          <p className="mt-4 max-w-[340px] text-[15px] font-medium leading-snug text-[#444] lg:max-w-[360px]">
            Move enforces the rules on-chain. Client goes silent? Auto-approve
            fires. Dispute? Stream pauses — funds stay locked.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link href="/app" className="sl-glass-btn sl-glass-btn-primary">
              Launch App →
            </Link>
            <Link href="/#how" className="sl-glass-btn">
              See the flow
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
