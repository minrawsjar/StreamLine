"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";

import { useNetworkVariable } from "@/lib/networks";
import {
  useStreams,
  useLiveUpdates,
  type StreamRecord,
} from "@/lib/indexer";
import { buildRaiseCompletion } from "@/lib/streamline-tx";
import { USDC_BASE, formatInterval } from "@/lib/stream-math";

/** Earned base units = already paid + (live accrual while dripping). */
function earnedBase(s: StreamRecord, nowMs: number): number {
  const paid = s.total - s.remaining;
  if (s.state !== "dripping" || s.duration_ms <= 0) return paid;
  const rate = s.total / s.duration_ms; // base units per ms
  const accrued = Math.max(0, (nowMs - s.last_drip_ms) * rate);
  return Math.min(paid + accrued, s.total);
}

export function LiveEarnings() {
  const account = useCurrentAccount();
  const packageId = useNetworkVariable("packageId");
  const usdcType = useNetworkVariable("usdcType");
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { data: streams, isLoading, refetch } = useStreams({
    freelancer: account?.address,
  });

  const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [status, setStatus] = useState<string | null>(null);

  // 100ms client-side tick drives the live counter (no chain reads).
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);

  // Bump on confirmed drips pushed by the indexer.
  useLiveUpdates(() => refetch());

  const list = streams ?? [];
  const active = useMemo(
    () => list.find((s) => s.id === selected) ?? list[0],
    [list, selected]
  );

  if (isLoading) return <Panel>Loading your streams…</Panel>;
  if (list.length === 0)
    return (
      <Panel>
        No streams yet. When a client creates one for{" "}
        <span className="font-mono">{short(account?.address)}</span>, it appears
        here and starts earning live.
      </Panel>
    );

  const rate = active.duration_ms > 0 ? active.total / active.duration_ms : 0; // base/ms
  const ratePerSec = (rate * 1000) / USDC_BASE;
  const earned = earnedBase(active, now) / USDC_BASE;

  const onRaise = () => {
    setStatus("Awaiting signature…");
    signAndExecute(
      {
        transaction: buildRaiseCompletion({
          packageId,
          usdcType,
          streamId: active.id,
        }),
      },
      {
        onSuccess: (r) => setStatus(`Milestone raised — ${r.digest.slice(0, 10)}…`),
        onError: (e) => setStatus(e.message),
      }
    );
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-8">
        <div className="border border-[#2b2a5e]/15 bg-white p-8">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#2b2a5e]/50">
            Earned so far
          </p>
          <p className="mt-2 text-[clamp(40px,8vw,72px)] font-black leading-none tabular text-[#2b2a5e]">
            ${earned.toFixed(6)}
          </p>
          <p className="mt-3 text-[13px] text-[#1d9e75]">
            {active.state === "dripping"
              ? `+$${ratePerSec.toFixed(6)} / sec · live, gasless`
              : `Status: ${active.state.replace("_", " ")}`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Milestone" value={`${active.current_milestone + 1}/${active.n_milestones}`} />
          <Stat label="Settles every" value={formatInterval(active.drip_interval_ms)} />
          <Stat label="Locked" value={`$${(active.total / USDC_BASE).toFixed(2)}`} />
          <Stat label="Remaining" value={`$${(active.remaining / USDC_BASE).toFixed(2)}`} />
        </div>

        {active.state === "locked" && (
          <button
            onClick={onRaise}
            disabled={isPending}
            className="self-start bg-[#5b54e6] px-6 py-3 text-[12px] uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {isPending ? "raising…" : "raise milestone complete — gasless"}
          </button>
        )}
        {status && <p className="text-[11px] text-[#2b2a5e]/70">{status}</p>}
      </div>

      <aside className="flex flex-col gap-2">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#2b2a5e]/50">
          Your streams
        </p>
        {list.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelected(s.id)}
            className={`flex items-center justify-between border px-4 py-3 text-left text-[12px] transition-colors ${
              s.id === active.id
                ? "border-[#5b54e6] bg-[#5b54e6]/[0.06]"
                : "border-[#2b2a5e]/15 hover:border-[#5b54e6]"
            }`}
          >
            <span className="font-mono">{short(s.id)}</span>
            <span className="uppercase tracking-[0.1em] text-[#2b2a5e]/60">
              {s.state.replace("_", " ")}
            </span>
          </button>
        ))}
      </aside>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-[#2b2a5e]/25 px-8 py-16 text-center text-[13px] text-[#2b2a5e]/60">
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#2b2a5e]/15 bg-white px-4 py-4">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[#2b2a5e]/50">
        {label}
      </p>
      <p className="mt-1 text-[15px] font-semibold tabular">{value}</p>
    </div>
  );
}

function short(a?: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}
