const STATS = [
  { value: "$0.00", label: "transfer fee\non every drip" },
  { value: "≤ 60s", label: "settlement\nfrequency" },
  { value: "5", label: "on-chain\nstate machine" },
  { value: "1 bps", label: "keeper tip\nper drip" },
];

const TICKER = [
  "USDC",
  "USDsui",
  "SuiUSDe",
  "USDY",
  "FDUSD",
  "AUSD",
  "USDB",
  "Address Balances",
  "Programmable Transaction Blocks",
  "Move Object Model",
  "zkLogin",
  "Scallop",
  "NAVI",
];

export function StatsStrip() {
  return (
    <section className="relative z-10 w-full border-y border-[#2b2a5e]/15 bg-[#f1efe9]">
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 md:grid-cols-4">
        {STATS.map((s, i) => (
          <div
            key={s.value}
            className={`flex flex-col gap-2 px-6 py-8 md:px-8 md:py-10 ${
              i !== 0 ? "border-l border-[#2b2a5e]/15" : ""
            } ${i === 2 ? "border-t border-[#2b2a5e]/15 md:border-t-0" : ""} ${
              i === 3 ? "border-t border-[#2b2a5e]/15 md:border-t-0" : ""
            }`}
          >
            <span className="text-[clamp(28px,5vw,46px)] font-black leading-none tracking-[-0.03em] text-[#5b54e6] tabular">
              {s.value}
            </span>
            <span className="whitespace-pre-line text-[11px] uppercase leading-snug tracking-[0.12em] text-[#2b2a5e]/60">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="overflow-hidden border-t border-[#2b2a5e]/15 bg-[#2b2a5e] py-3">
        <div className="sl-marquee flex w-max gap-8 whitespace-nowrap">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span
              key={`${t}-${i}`}
              className="flex items-center gap-8 text-[11px] uppercase tracking-[0.2em] text-white/70"
            >
              {t}
              <span className="text-[#7f77dd]">◆</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
