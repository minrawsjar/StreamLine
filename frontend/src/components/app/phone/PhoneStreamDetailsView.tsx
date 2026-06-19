"use client";

import { useEffect, useState } from "react";

import type { StreamRecord } from "@/lib/indexer";
import { USDC_BASE, formatInterval } from "@/lib/stream-math";
import {
  completedMilestones,
  dripRatePerMinuteBase,
  earnedBase,
  effectiveState,
  nextMilestoneNo,
} from "@/lib/stream-state";
import { DonutProgress, short } from "../dashboard-ui";
import { PhoneBorrowAgainstView } from "./PhoneBorrowAgainstView";

const usd = (base: number, digits = 3) =>
  (base / USDC_BASE).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

type PhoneStreamDetailsViewProps = {
  stream: StreamRecord;
  label: string;
  incoming: boolean;
  now: number;
  onBack: () => void;
};

export function PhoneStreamDetailsView({
  stream,
  label,
  incoming,
  now,
  onBack,
}: PhoneStreamDetailsViewProps) {
  const [screen, setScreen] = useState<"details" | "borrow">("details");

  useEffect(() => {
    setScreen("details");
  }, [stream.id]);

  if (screen === "borrow") {
    return (
      <PhoneBorrowAgainstView
        stream={stream}
        label={label}
        onBack={() => setScreen("details")}
      />
    );
  }

  const view = effectiveState(stream);
  const earned = earnedBase(stream, now);
  const progress = stream.total > 0 ? (earned / stream.total) * 100 : 0;
  const ratePerSec =
    stream.duration_ms > 0
      ? ((stream.total / stream.duration_ms) * 1000) / USDC_BASE
      : 0;
  const done = completedMilestones(stream);
  const next = nextMilestoneNo(stream);

  const statusLine =
    view === "dripping"
      ? `+${ratePerSec.toFixed(6)} / sec · live, gasless`
      : view === "locked"
        ? `Milestone ${done} finished — apply for milestone ${next}`
        : `Status: ${view.replace("_", " ")}`;

  const milestoneLabel =
    view === "locked"
      ? `${done}/${stream.n_milestones} done · next ${next}`
      : `${next}/${stream.n_milestones}`;

  return (
    <div className="sl-scrollbar-hidden flex min-h-0 flex-1 flex-col overflow-y-auto">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 self-start text-[9px] font-medium text-[#666]"
      >
        ← Home
      </button>

      <div className="flex flex-col gap-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight text-[#111]">
              {label}
            </h2>
            <p className="mt-1 text-[12px] leading-snug text-[#666]">
              {incoming
                ? "Incoming stream to your wallet."
                : "Outgoing stream from your wallet."}
            </p>
          </div>
          {incoming ? (
            <button
              type="button"
              onClick={() => setScreen("borrow")}
              className="shrink-0 rounded-full border border-[#c0533a]/25 bg-[#c0533a]/[0.06] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#c0533a] transition-colors hover:bg-[#c0533a]/10"
            >
              Borrow against
            </button>
          ) : (
            <span className="shrink-0 rounded-full border border-black/10 bg-[#fafafa] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#888]">
              {view.replace("_", " ")}
            </span>
          )}
        </div>

        <section className="rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#888]">
            Earned so far · {short(stream.id)}
          </p>
          <p className="mt-2 text-[2rem] font-bold tabular-nums leading-none text-[#111]">
            {usd(earned, 3)}
          </p>
          <p
            className={`mt-2 text-[11px] font-medium ${
              view === "dripping"
                ? "text-[#1d9e75]"
                : view === "paused"
                  ? "text-[#c0533a]"
                  : "text-[#666]"
            }`}
          >
            {statusLine}
          </p>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <MiniStat label="Milestone" value={milestoneLabel} />
          <MiniStat
            label="Settles every"
            value={formatInterval(stream.drip_interval_ms)}
          />
          <MiniStat label="Locked" value={usd(stream.total, 2)} />
          <MiniStat label="Remaining" value={usd(stream.remaining, 2)} />
          <MiniStat label="Drip/min" value={usd(dripRatePerMinuteBase(stream), 3)} />
          <MiniStat
            label="Role"
            value={incoming ? "Receiver" : "Sender"}
          />
        </div>

        <section className="rounded-2xl border border-black/10 bg-white px-3 py-4">
          <p className="mb-2 text-center text-[9px] font-semibold uppercase tracking-[0.16em] text-[#888]">
            Stream progress
          </p>
          <DonutProgress percent={progress} caption="of this stream" />
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-3">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#888]">
            Milestones
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: stream.n_milestones }).map((_, i) => {
              const isDone = i < done;
              const isCurrent = i === done && view !== "done";
              return (
                <span
                  key={i}
                  title={`Milestone ${i + 1} of ${stream.n_milestones}`}
                  className={`flex h-6 min-w-6 items-center justify-center rounded-md px-2 text-[10px] font-semibold tabular-nums ${
                    isDone
                      ? "bg-[#1d9e75] text-white"
                      : isCurrent
                        ? "border border-[#5b54e6] text-[#5b54e6]"
                        : "border border-black/15 text-[#999]"
                  }`}
                >
                  {i + 1}
                </span>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] leading-snug text-[#666]">
            <MilestoneStatus stream={stream} view={view} done={done} next={next} />
          </p>
        </section>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white px-3 py-2.5">
      <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-[#888]">
        {label}
      </p>
      <p className="mt-1 text-[12px] font-semibold tabular-nums leading-snug text-[#111]">
        {value}
      </p>
    </div>
  );
}

function MilestoneStatus({
  stream,
  view,
  done,
  next,
}: {
  stream: StreamRecord;
  view: ReturnType<typeof effectiveState>;
  done: number;
  next: number;
}) {
  if (view === "locked") {
    return (
      <>
        Milestone {done} finished. Apply for milestone {next} when your work is
        ready — the client will review, then dripping resumes.
      </>
    );
  }
  if (view === "pending_review") {
    return <>Milestone {next} submitted — awaiting client approval.</>;
  }
  if (view === "dripping") {
    return (
      <>
        Milestone {next} of {stream.n_milestones} is dripping live. It stops
        automatically when this milestone&apos;s allocation is fully paid.
      </>
    );
  }
  if (view === "paused") {
    return <>Stream paused — a dispute is in progress.</>;
  }
  if (view === "done") {
    return <>All {stream.n_milestones} milestones complete — stream fully settled.</>;
  }
  return null;
}
