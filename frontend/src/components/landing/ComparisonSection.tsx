type Row = {
  name: string;
  chain: string;
  gasless: boolean;
  milestones: boolean;
  splits: boolean;
  collateral: boolean;
  highlight?: boolean;
};

const ROWS: Row[] = [
  { name: "Sablier", chain: "Ethereum", gasless: false, milestones: false, splits: false, collateral: false },
  { name: "Superfluid", chain: "Ethereum/L2", gasless: false, milestones: false, splits: false, collateral: false },
  { name: "Drips (Radicle)", chain: "Ethereum", gasless: false, milestones: false, splits: false, collateral: false },
  { name: "LlamaPay", chain: "Multi-EVM", gasless: false, milestones: false, splits: false, collateral: false },
  { name: "StreamLine", chain: "Sui", gasless: true, milestones: true, splits: true, collateral: true, highlight: true },
];

function Cell({ on }: { on: boolean }) {
  return (
    <span className={on ? "font-bold text-[#1d9e75]" : "text-[#2b2a5e]/35"}>
      {on ? "Yes" : "No"}
    </span>
  );
}

export function ComparisonSection() {
  return (
    <section
      id="compare"
      data-sl-cursor="on-light"
      className="relative w-full bg-[#f1efe9] px-6 py-24 md:px-8 md:py-32"
    >
      <div className="mx-auto max-w-[1440px]">
        <p className="mb-3 text-[11px] uppercase tracking-[0.24em] text-[#5b54e6]">
          15 · Competitive landscape
        </p>
        <h2 className="max-w-3xl text-[clamp(30px,5vw,56px)] font-black leading-[0.95] tracking-[-0.03em]">
          The first streaming protocol where the money genuinely arrives.
        </h2>

        <div className="mt-14 overflow-x-auto border border-[#2b2a5e]/15">
          <table className="w-full min-w-[680px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="bg-[#2b2a5e] text-[10px] uppercase tracking-[0.16em] text-white/80">
                <th className="px-5 py-4 font-medium">Protocol</th>
                <th className="px-5 py-4 font-medium">Chain</th>
                <th className="px-5 py-4 font-medium">Gasless</th>
                <th className="px-5 py-4 font-medium">Milestones</th>
                <th className="px-5 py-4 font-medium">Split auto</th>
                <th className="px-5 py-4 font-medium">Collateral</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr
                  key={r.name}
                  className={
                    r.highlight
                      ? "bg-[#7f77dd]/12 font-semibold"
                      : i % 2
                        ? "bg-[#2b2a5e]/[0.03]"
                        : ""
                  }
                >
                  <td className="px-5 py-4">
                    {r.highlight ? (
                      <span className="text-[#5b54e6]">{r.name}</span>
                    ) : (
                      r.name
                    )}
                  </td>
                  <td className="px-5 py-4 text-[#2b2a5e]/70">{r.chain}</td>
                  <td className="px-5 py-4"><Cell on={r.gasless} /></td>
                  <td className="px-5 py-4"><Cell on={r.milestones} /></td>
                  <td className="px-5 py-4"><Cell on={r.splits} /></td>
                  <td className="px-5 py-4"><Cell on={r.collateral} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-8 max-w-2xl text-[14px] leading-relaxed text-[#2b2a5e]/70">
          Every EVM streaming protocol requires recipients to periodically claim
          accumulated balance — a gas-paying action. On StreamLine the money lands
          continuously, with no action required and no fee for either party.
        </p>
      </div>
    </section>
  );
}
