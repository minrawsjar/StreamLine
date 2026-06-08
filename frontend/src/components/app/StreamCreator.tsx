"use client";

import { useMemo, useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";

import { useNetworkVariable } from "@/lib/networks";
import {
  durationToMs,
  dripIntervalMs,
  formatInterval,
  formatUsd,
  ratePerSecond,
  toBaseUnits,
  type DurationUnit,
} from "@/lib/stream-math";
import { buildCreateStream, splitMilestoneAmounts } from "@/lib/streamline-tx";

type SplitRow = { label: string; address: string; pct: number; yield: boolean };

const DEFAULT_SPLITS: SplitRow[] = [
  { label: "Spending wallet", address: "", pct: 70, yield: false },
  { label: "Scallop (yield)", address: "", pct: 30, yield: true },
];

export function StreamCreator() {
  const account = useCurrentAccount();
  const packageId = useNetworkVariable("packageId");
  const usdcType = useNetworkVariable("usdcType");
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();

  const [freelancer, setFreelancer] = useState("");
  const [amount, setAmount] = useState(800);
  const [durationValue, setDurationValue] = useState(14);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("days");
  const [milestones, setMilestones] = useState<string[]>([
    "Wireframes",
    "Mockups",
    "Revisions",
    "Final",
  ]);
  const [splits, setSplits] = useState<SplitRow[]>(DEFAULT_SPLITS);
  const [status, setStatus] = useState<string | null>(null);

  const durationMs = durationToMs(durationValue, durationUnit);
  const rate = ratePerSecond(amount, durationMs);
  const interval = dripIntervalMs(amount, durationMs);
  const splitSum = splits.reduce((s, r) => s + (Number(r.pct) || 0), 0);

  const deployed = packageId && packageId !== "0x0";
  const errors = useMemo(() => {
    const e: string[] = [];
    if (amount <= 0) e.push("Amount must be greater than 0.");
    if (durationValue <= 0) e.push("Duration must be greater than 0.");
    if (milestones.length === 0) e.push("Add at least one milestone.");
    if (amount / Math.max(milestones.length, 1) < 0.01)
      e.push("Each milestone must be ≥ 0.01 USDC.");
    if (splitSum !== 100) e.push(`Splits must total 100% (currently ${splitSum}%).`);
    return e;
  }, [amount, durationValue, milestones.length, splitSum]);

  const canCreate = errors.length === 0 && !!account;

  const updateMilestone = (i: number, v: string) =>
    setMilestones((m) => m.map((x, j) => (j === i ? v : x)));
  const updateSplit = (i: number, patch: Partial<SplitRow>) =>
    setSplits((s) => s.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const onCreate = () => {
    if (!canCreate) return;
    if (!deployed) {
      setStatus(
        "Move package not deployed on this network yet — PTB is previewed above."
      );
      return;
    }
    const totalBase = toBaseUnits(amount);
    const tx = buildCreateStream({
      packageId,
      usdcType,
      freelancer,
      milestoneNames: milestones,
      milestoneAmountsBase: splitMilestoneAmounts(totalBase, milestones.length),
      totalBase,
      durationMs,
    });
    setStatus("Awaiting wallet signature…");
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: (r) => setStatus(`Stream created — locked ${formatUsd(amount)}. Digest ${r.digest}`),
        onError: (e) => setStatus(e.message),
      }
    );
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
      <div className="flex flex-col gap-8">
        <Field label="Recipient (freelancer address)">
          <input
            value={freelancer}
            onChange={(e) => setFreelancer(e.target.value)}
            placeholder="0x…"
            className="w-full border border-[#2b2a5e]/20 bg-white px-3 py-2.5 font-mono text-[13px] outline-none focus:border-[#5b54e6]"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Total amount (USDC)">
            <input
              type="number"
              value={amount === 0 ? "" : amount}
              min={0}
              placeholder="800"
              onChange={(e) =>
                setAmount(e.target.value === "" ? 0 : Number(e.target.value))
              }
              className="w-full border border-[#2b2a5e]/20 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#5b54e6]"
            />
          </Field>
          <Field label="Duration">
            <div className="flex gap-2">
              <input
                type="number"
                value={durationValue === 0 ? "" : durationValue}
                min={0}
                placeholder="14"
                onChange={(e) =>
                  setDurationValue(
                    e.target.value === "" ? 0 : Number(e.target.value)
                  )
                }
                className="w-full border border-[#2b2a5e]/20 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#5b54e6]"
              />
              <select
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value as DurationUnit)}
                className="border border-[#2b2a5e]/20 bg-white px-2 text-[13px] outline-none focus:border-[#5b54e6]"
              >
                <option value="hours">hours</option>
                <option value="days">days</option>
                <option value="weeks">weeks</option>
              </select>
            </div>
          </Field>
        </div>

        <Field label={`Milestones (${milestones.length})`}>
          <div className="flex flex-col gap-2">
            {milestones.map((m, i) => (
              <div key={i} className="flex gap-2">
                <span className="flex w-8 items-center justify-center bg-[#2b2a5e] text-[12px] text-white">
                  {i + 1}
                </span>
                <input
                  value={m}
                  onChange={(e) => updateMilestone(i, e.target.value)}
                  className="w-full border border-[#2b2a5e]/20 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#5b54e6]"
                />
                <button
                  onClick={() =>
                    setMilestones((arr) => arr.filter((_, j) => j !== i))
                  }
                  className="px-3 text-[#c0533a] hover:opacity-60"
                  aria-label="Remove milestone"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={() => setMilestones((m) => [...m, `Milestone ${m.length + 1}`])}
              className="self-start border border-[#2b2a5e]/20 px-3 py-1.5 text-[12px] hover:border-[#5b54e6]"
            >
              + add milestone
            </button>
          </div>
        </Field>

        <Field label={`Split config (${splitSum}%)`}>
          <div className="flex flex-col gap-2">
            {splits.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={r.label}
                  onChange={(e) => updateSplit(i, { label: e.target.value })}
                  className="w-40 border border-[#2b2a5e]/20 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#5b54e6]"
                />
                <input
                  type="number"
                  value={r.pct === 0 ? "" : r.pct}
                  placeholder="0"
                  onChange={(e) =>
                    updateSplit(i, {
                      pct: e.target.value === "" ? 0 : Number(e.target.value),
                    })
                  }
                  className="w-20 border border-[#2b2a5e]/20 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#5b54e6]"
                />
                <span className="text-[12px] text-[#2b2a5e]/50">%</span>
                <label className="flex items-center gap-1 text-[11px] text-[#2b2a5e]/60">
                  <input
                    type="checkbox"
                    checked={r.yield}
                    onChange={(e) => updateSplit(i, { yield: e.target.checked })}
                  />
                  yield
                </label>
                <button
                  onClick={() => setSplits((s) => s.filter((_, j) => j !== i))}
                  className="ml-auto px-2 text-[#c0533a] hover:opacity-60"
                  aria-label="Remove split"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                setSplits((s) => [
                  ...s,
                  { label: "Destination", address: "", pct: 0, yield: false },
                ])
              }
              className="self-start border border-[#2b2a5e]/20 px-3 py-1.5 text-[12px] hover:border-[#5b54e6]"
            >
              + add split
            </button>
          </div>
        </Field>
      </div>

      <aside className="flex flex-col gap-4 border border-[#2b2a5e]/15 bg-white p-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#2b2a5e]/50">
          PTB preview
        </p>
        <Summary label="Locks" value={formatUsd(amount)} />
        <Summary
          label="Rate"
          value={`${formatUsd(rate)} / sec`}
        />
        <Summary label="Settles every" value={formatInterval(interval)} />
        <Summary label="Milestones" value={String(milestones.length)} />
        <Summary
          label="Per milestone"
          value={formatUsd(amount / Math.max(milestones.length, 1))}
        />
        <div className="border-t border-[#2b2a5e]/10 pt-3 text-[12px] leading-relaxed text-[#2b2a5e]/70">
          {splits.map((s, i) => (
            <div key={i} className="flex justify-between">
              <span>
                {s.label} {s.yield && "↗"}
              </span>
              <span className="tabular">{s.pct}%</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] leading-relaxed text-[#1d9e75]">
          All gasless via Address Balances. {formatInterval(interval)}.
        </p>

        {errors.length > 0 && (
          <ul className="flex flex-col gap-1 text-[11px] text-[#c0533a]">
            {errors.map((e) => (
              <li key={e}>• {e}</li>
            ))}
          </ul>
        )}

        <button
          onClick={onCreate}
          disabled={!canCreate || isPending}
          className="mt-2 bg-[#5b54e6] px-5 py-3 text-[12px] uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? "creating…" : "create stream — gasless"}
        </button>
        {!deployed && (
          <p className="text-[11px] text-[#2b2a5e]/50">
            Note: Move package not set for this network — set
            NEXT_PUBLIC_PACKAGE_ID to enable on-chain creation.
          </p>
        )}
        {status && (
          <p className="break-words text-[11px] text-[#2b2a5e]/70">{status}</p>
        )}
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] uppercase tracking-[0.16em] text-[#2b2a5e]/60">
        {label}
      </span>
      {children}
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[12px] text-[#2b2a5e]/55">{label}</span>
      <span className="text-[14px] font-semibold tabular">{value}</span>
    </div>
  );
}
