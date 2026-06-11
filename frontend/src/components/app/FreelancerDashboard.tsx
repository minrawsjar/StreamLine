"use client";

import { useEffect, useMemo, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";

import { useNetworkVariable } from "@/lib/networks";
import { useGaslessExecute } from "@/lib/use-gasless";
import { useStreams, useLiveUpdates, type StreamRecord } from "@/lib/indexer";
import { buildRaiseCompletion } from "@/lib/streamline-tx";
import { PrivateStreamsPanel } from "./PrivateStreamsPanel";
import { USDC_BASE, formatInterval } from "@/lib/stream-math";
import {
  completedMilestones,
  effectiveState,
  milestoneCeilingBase,
  nextMilestoneNo,
} from "@/lib/stream-state";
import {
  BarChart,
  Card,
  DashboardHeader,
  DonutProgress,
  EmptyPanel,
  StatCard,
  StateBadge,
  short,
  type BarDatum,
} from "./dashboard-ui";

/** Earned base units = already paid + (live accrual while dripping). */
function earnedBase(s: StreamRecord, nowMs: number): number {
  const paid = s.total - s.remaining;
  if (effectiveState(s) !== "dripping" || s.duration_ms <= 0) return paid;
  const rate = s.total / s.duration_ms; // base units per ms
  const accrued = Math.max(0, (nowMs - s.last_drip_ms) * rate);
  const milestoneCeiling = milestoneCeilingBase(s, s.current_milestone);
  return Math.min(paid + accrued, milestoneCeiling, s.total);
}

const usd = (base: number) => (base / USDC_BASE).toFixed(2);

export function FreelancerDashboard() {
  const account = useCurrentAccount();
  const packageId = useNetworkVariable("packageId");
  const usdcType = useNetworkVariable("usdcType");
  const { execute, isPending } = useGaslessExecute();
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

  useLiveUpdates(() => refetch());

  const list = useMemo(() => streams ?? [], [streams]);
  const active = useMemo(
    () => list.find((s) => s.id === selected) ?? list[0],
    [list, selected]
  );

  const totals = useMemo(() => {
    const earnedAll = list.reduce((a, s) => a + earnedBase(s, now), 0);
    const locked = list.reduce((a, s) => a + s.total, 0);
    const dripping = list.filter((s) => effectiveState(s) === "dripping").length;
    return { earnedAll, locked, dripping };
  }, [list, now]);

  const bars: BarDatum[] = useMemo(
    () =>
      list.slice(0, 8).map((s) => ({
        label: short(s.id).slice(0, 4),
        value: earnedBase(s, now),
        active: effectiveState(s) === "dripping" || s.state === "pending_review",
      })),
    [list, now]
  );

  if (isLoading) return <EmptyPanel>Loading your streams…</EmptyPanel>;

  if (list.length === 0)
    return (
      <div>
        <DashboardHeader
          eyebrow="Receiver console"
          title="Freelancer dashboard"
          subtitle="Watch money arrive in real time and raise milestones in one click."
        />
        <div className="flex flex-col gap-6">
          <EmptyPanel>
            No streams yet. When a client creates one for{" "}
            <span className="font-mono">{short(account?.address)}</span>, it
            appears here and starts earning live.
          </EmptyPanel>
          <PrivateStreamsPanel role="freelancer" />
        </div>
      </div>
    );

  const rate = active.duration_ms > 0 ? active.total / active.duration_ms : 0; // base/ms
  const ratePerSec = (rate * 1000) / USDC_BASE;
  const earned = earnedBase(active, now) / USDC_BASE;
  const activeProgress =
    active.total > 0 ? (earnedBase(active, now) / active.total) * 100 : 0;

  const onRaise = () => {
    setStatus("Awaiting signature…");
    execute(
      buildRaiseCompletion({ packageId, usdcType, streamId: active.id }),
      {
        onSuccess: (r) => {
          setStatus(`Milestone raised — ${r.digest.slice(0, 10)}…`);
          refetch();
        },
        onError: (e) => setStatus(e.message),
      }
    );
  };

  const view = effectiveState(active);
  const done = completedMilestones(active);
  const next = nextMilestoneNo(active);

  return (
    <div>
      <DashboardHeader
        eyebrow="Receiver console"
        title="Freelancer dashboard"
        subtitle="Watch money arrive in real time and raise milestones in one click."
      />

      {/* Stat row */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          tone="brand"
          label="Earned (all)"
          value={`$${totals.earnedAll === 0 ? "0.00" : (totals.earnedAll / USDC_BASE).toFixed(2)}`}
          sub="live across streams"
        />
        <StatCard
          label="Incoming total"
          value={`$${usd(totals.locked)}`}
          sub="locked for you"
        />
        <StatCard
          label="Active streams"
          value={String(totals.dripping)}
          sub="currently dripping"
        />
        <StatCard
          label="Open streams"
          value={String(list.length)}
          sub="assigned to you"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          {/* Live earned hero */}
          <Card>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#2b2a5e]/50">
              Earned so far · {short(active.id)}
            </p>
            <p className="mt-2 text-[clamp(38px,7vw,68px)] font-black leading-none tabular text-[#2b2a5e]">
              ${earned.toFixed(6)}
            </p>
            <p className="mt-3 text-[13px] text-[#1d9e75]">
              {view === "dripping"
                ? `+$${ratePerSec.toFixed(6)} / sec · live, gasless`
                : view === "locked"
                  ? `Milestone ${done} finished — apply for milestone ${next}`
                  : `Status: ${view.replace("_", " ")}`}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat
                label="Milestone"
                value={
                  view === "locked"
                    ? `${done}/${active.n_milestones} done · next ${next}`
                    : `${next}/${active.n_milestones}`
                }
              />
              <Stat
                label="Settles every"
                value={formatInterval(active.drip_interval_ms)}
              />
              <Stat label="Locked" value={`$${usd(active.total)}`} />
              <Stat label="Remaining" value={`$${usd(active.remaining)}`} />
            </div>

            <MilestoneAction
              stream={active}
              isPending={isPending}
              onRaise={onRaise}
            />
            {status && (
              <p className="mt-4 text-[11px] text-[#2b2a5e]/70">{status}</p>
            )}
          </Card>

          {/* Earnings analytics */}
          <Card title="Earnings analytics">
            <p className="-mt-2 mb-5 text-[11px] text-[#2b2a5e]/45">
              Earned per stream (live + pending highlighted)
            </p>
            <BarChart data={bars} />
          </Card>
        </div>

        {/* Right rail: progress + stream list */}
        <aside className="flex flex-col gap-6">
          <Card title="Stream progress">
            <DonutProgress percent={activeProgress} caption="of this stream" size={180} />
          </Card>

          <Card title="Your streams" padded={false}>
            <div className="flex flex-col">
              {list.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s.id)}
                  className={`flex items-center justify-between gap-2 border-t border-[#2b2a5e]/10 px-4 py-3 text-left text-[12px] transition-colors ${
                    s.id === active.id
                      ? "bg-[#5b54e6]/[0.06]"
                      : "hover:bg-[#2b2a5e]/[0.03]"
                  }`}
                >
                  <span className="font-mono">{short(s.id)}</span>
                  <StateBadge state={effectiveState(s)} />
                </button>
              ))}
            </div>
          </Card>
        </aside>
      </div>

      <div className="mt-6">
        <PrivateStreamsPanel role="freelancer" />
      </div>
    </div>
  );
}

function MilestoneAction({
  stream,
  isPending,
  onRaise,
}: {
  stream: StreamRecord;
  isPending: boolean;
  onRaise: () => void;
}) {
  const total = stream.n_milestones;
  const view = effectiveState(stream);
  const done = completedMilestones(stream);
  const next = nextMilestoneNo(stream);

  return (
    <div className="mt-6">
      {/* Per-milestone tracker so every milestone is visible */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {Array.from({ length: total }).map((_, i) => {
          const isDone = i < done;
          const isCurrent = i === done && view !== "done";
          return (
            <span
              key={i}
              title={`Milestone ${i + 1} of ${total}`}
              className={`flex h-6 min-w-6 items-center justify-center px-2 text-[10px] font-semibold tabular ${
                isDone
                  ? "bg-[#1d9e75] text-white"
                  : isCurrent
                    ? "border border-[#5b54e6] text-[#5b54e6]"
                    : "border border-[#2b2a5e]/20 text-[#2b2a5e]/40"
              }`}
            >
              {i + 1}
            </span>
          );
        })}
      </div>

      {view === "locked" && (
        <div className="flex flex-col gap-3">
          <p className="text-[14px] font-semibold text-[#1d9e75]">
            Milestone {done} finished
          </p>
          <p className="text-[12px] text-[#2b2a5e]/70">
            Apply for milestone {next} when your work is ready — the client will
            review, then dripping resumes.
          </p>
          <button
            onClick={onRaise}
            disabled={isPending}
            className="self-start bg-[#5b54e6] px-6 py-3 text-[12px] uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {isPending
              ? "submitting…"
              : `apply for milestone ${next} — gasless`}
          </button>
        </div>
      )}

      {view === "pending_review" && (
        <p className="text-[12px] text-[#2b2a5e]/70">
          Milestone {next} submitted — awaiting client approval.
        </p>
      )}

      {view === "dripping" && (
        <p className="text-[12px] text-[#2b2a5e]/70">
          Milestone {next} of {total} is dripping live. It will stop automatically
          when this milestone&apos;s allocation is fully paid.
        </p>
      )}

      {view === "paused" && (
        <p className="text-[12px] text-[#b4541f]">
          Stream paused — a dispute is in progress.
        </p>
      )}

      {view === "done" && (
        <p className="text-[12px] text-[#1d9e75]">
          All {total} milestones complete — stream fully settled.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#2b2a5e]/15 px-4 py-4">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[#2b2a5e]/50">
        {label}
      </p>
      <p className="mt-1 text-[15px] font-semibold tabular">{value}</p>
    </div>
  );
}
