const PILLARS = [
  {
    no: "01",
    title: "Address Balances",
    body: "Zero-fee transfers at protocol level via 0x2::balance::send_funds — not a subsidy or relayer. Enables true per-interval streaming at any payment size. On Ethereum every drip costs gas.",
  },
  {
    no: "02",
    title: "PTB atomicity",
    body: "The split (pay + save + invest) executes as one atomic transaction. If the yield-routing leg fails, the whole drip reverts — protecting split integrity.",
  },
  {
    no: "03",
    title: "Move object ownership",
    body: "The locked Balance lives inside a shared object, reachable only through entry functions. A structural property of Move's type system — no reentrancy, no approval manipulation.",
  },
  {
    no: "04",
    title: "zkLogin",
    body: "Google OAuth produces a Sui address directly. No seed phrase, no wallet install. A freelancer signs up with Gmail and immediately receives streams.",
  },
];

export function WhySuiSection() {
  return (
    <section
      id="why-sui"
      data-sl-cursor="on-dark"
      className="relative w-full bg-[#2b2a5e] px-6 py-24 text-white md:px-8 md:py-32"
    >
      <div className="mx-auto max-w-[1440px]">
        <p className="mb-3 text-[11px] uppercase tracking-[0.24em] text-[#b3aeef]">
          14 · Why this is Sui-native
        </p>
        <h2 className="max-w-3xl text-[clamp(30px,5vw,56px)] font-black leading-[0.95] tracking-[-0.03em]">
          Why does this exist on Sui and not Ethereum or Solana?
        </h2>

        <div className="mt-16 grid gap-px bg-white/15 md:grid-cols-2">
          {PILLARS.map((p) => (
            <div key={p.no} className="bg-[#2b2a5e] p-8 md:p-10">
              <div className="flex items-baseline gap-4">
                <span className="text-[13px] font-mono text-[#7f77dd]">{p.no}</span>
                <h3 className="text-[22px] font-bold tracking-[-0.01em]">
                  {p.title}
                </h3>
              </div>
              <p className="mt-4 text-[14px] leading-relaxed text-white/70">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
