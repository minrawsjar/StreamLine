import Link from "next/link";

export function SiteFooter() {
  return (
    <footer
      data-sl-cursor="on-dark"
      className="relative w-full bg-[#1d1c44] px-6 py-16 text-white md:px-8"
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[clamp(40px,8vw,96px)] font-black leading-[0.9] tracking-[-0.03em]">
              StreamLine
            </p>
            <p className="mt-4 max-w-md text-[14px] leading-relaxed text-white/60">
              Zero fees. No wallet setup. Pays as you work. This is what
              programmable money looks like on Sui.
            </p>
          </div>
          <Link
            href="/app"
            className="inline-flex w-fit items-center bg-[#5b54e6] px-6 py-4 text-[12px] uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-90"
          >
            launch app →
          </Link>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 pt-8 text-[11px] uppercase tracking-[0.16em] text-white/50 md:flex-row md:items-center md:justify-between">
          <span>Sui Overflow 2026 · DeFi &amp; Payments Track</span>
          <span>Address Balances · PTBs · Move · zkLogin</span>
        </div>
      </div>
    </footer>
  );
}
