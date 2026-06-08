import { BayerDitherHero } from "@/components/hero/BayerDitherHero";

// Flowing water — the dither resolves it into StreamLine's indigo dot field,
// and cursor movement sends ripples through it (money "flowing"). A looping
// ocean clip drives live motion; the still image is the fallback.
const HERO_VIDEO = "/hero/waves.mp4";
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1505144808419-1957a94ca61e?fm=jpg&q=60&w=3000&auto=format&fit=crop";

export function HeroSection() {
  return (
    <section
      id="top"
      data-sl-cursor="on-light"
      className="relative box-border h-[100dvh] min-h-[100svh] w-full min-w-0 overflow-hidden bg-[#f1efe9]"
    >
      <div
        data-sl-cursor="on-dark"
        className="absolute bottom-[2.5dvh] left-1/2 top-[8dvh] z-0 w-[min(108vw,1440px)] -translate-x-1/2"
      >
        <BayerDitherHero
          videoSrc={HERO_VIDEO}
          imageSrc={HERO_IMAGE}
          className="h-full w-full"
        />
      </div>

      <div className="pointer-events-none relative z-20 h-full min-h-0 w-full px-4 sm:px-6 lg:px-8">
        <div className="relative mx-auto h-full max-w-7xl">
          <p className="sl-hero-tagline absolute bottom-44 left-0 max-w-[min(100%,32rem)] text-[clamp(18px,4.6vw,28px)] font-light leading-snug text-white md:bottom-auto md:left-auto md:right-0 md:top-1/2 md:w-[min(42%,36rem)] md:max-w-none md:-translate-y-1/2 md:text-right">
            <span className="block">Gasless, milestone-gated payment</span>
            <span className="block">streams. Money that drips as you work.</span>
          </p>

          <h1 className="absolute bottom-0 left-0 max-w-[97vw] pb-8 font-black text-white [text-shadow:0_18px_52px_rgba(0,0,0,0.22)] md:max-w-[92%] md:pb-14">
            <div className="tracking-[-0.04em] [font-size:clamp(88px,17vw,260px)] leading-[0.88]">
              <span className="sl-hero-line block">StreamLine</span>
              <span className="sl-hero-line sl-hero-line--2 mt-[0.1em] block text-[0.165em] font-black uppercase leading-[1.05] tracking-[0.02em]">
                Programmable Micropayments on Sui
              </span>
            </div>
          </h1>
        </div>
      </div>
    </section>
  );
}
