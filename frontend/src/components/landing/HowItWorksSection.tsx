const STATES = [
  { name: "LOCKED", sub: "waiting", tone: "ink" },
  { name: "PENDING", sub: "raised", tone: "amber" },
  { name: "DRIPPING", sub: "approved", tone: "flow" },
  { name: "PAUSED", sub: "dispute", tone: "rust" },
  { name: "DONE", sub: "exhausted", tone: "brand" },
];

const TONE: Record<string, string> = {
  ink: "bg-[#2b2a5e] text-white",
  amber: "bg-[#d98a2b] text-white",
  flow: "bg-[#1d9e75] text-white",
  rust: "bg-[#c0533a] text-white",
  brand: "bg-[#7f77dd] text-white",
};

const FLOW = [
  ["Setup", "Client", "create_stream() — locks full amount", "LOCKED"],
  ["Signal done", "Freelancer", "raise_completion() — sets review deadline", "PENDING_REVIEW"],
  ["Review", "Client", "approve_milestone() via StreamCap", "DRIPPING"],
  ["Auto-approve", "Keeper", "approve_milestone() after 48h deadline", "DRIPPING"],
  ["Settlement", "Keeper", "drip() — send_funds() gasless per split", "DRIPPING"],
  ["Dispute", "Client", "raise_dispute() — stream pauses", "PAUSED"],
  ["Completion", "Protocol", "all milestones exhausted", "DONE"],
];

export function HowItWorksSection() {
  return (
    <section
      id="how"
      data-sl-cursor="on-light"
      className="relative w-full bg-[#f1efe9] px-6 py-24 md:px-8 md:py-32"
    >
      <div className="mx-auto max-w-[1440px]">
        <p className="mb-3 text-[11px] uppercase tracking-[0.24em] text-[#5b54e6]">
          05 · How it works
        </p>
        <h2 className="max-w-3xl text-[clamp(30px,5vw,56px)] font-black leading-[0.95] tracking-[-0.03em]">
          A state machine enforced by Move — not a bypassable require().
        </h2>

        <div className="mt-14 flex flex-wrap items-stretch gap-2">
          {STATES.map((s, i) => (
            <div key={s.name} className="flex items-center gap-2">
              <div className={`flex w-32 flex-col px-4 py-5 ${TONE[s.tone]}`}>
                <span className="text-[13px] font-black tracking-[0.04em]">
                  {s.name}
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] opacity-75">
                  {s.sub}
                </span>
              </div>
              {i < STATES.length - 1 && (
                <span className="text-[#2b2a5e]/40">→</span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-14 border border-[#2b2a5e]/15">
          <div className="grid grid-cols-12 gap-2 bg-[#2b2a5e] px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-white/80">
            <span className="col-span-2">Phase</span>
            <span className="col-span-2">Actor</span>
            <span className="col-span-6">On-chain action</span>
            <span className="col-span-2">State after</span>
          </div>
          {FLOW.map((row, i) => (
            <div
              key={row[0]}
              className={`grid grid-cols-12 gap-2 px-5 py-4 text-[12px] ${
                i % 2 ? "bg-[#2b2a5e]/[0.03]" : ""
              }`}
            >
              <span className="col-span-2 font-semibold">{row[0]}</span>
              <span className="col-span-2 text-[#2b2a5e]/70">{row[1]}</span>
              <span className="col-span-6 font-mono text-[#2b2a5e]/80">
                {row[2]}
              </span>
              <span className="col-span-2 font-bold text-[#5b54e6]">{row[3]}</span>
            </div>
          ))}
        </div>

        <p className="mt-8 max-w-2xl text-[14px] leading-relaxed text-[#2b2a5e]/70">
          The auto-approve timer protects the freelancer: if a client goes silent
          after a milestone is raised, the keeper calls approve_milestone() after
          the deadline (default 48h). Silence equals approval.
        </p>
      </div>
    </section>
  );
}
