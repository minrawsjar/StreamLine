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
import {
  loanRepayPerSec,
  netDripPerSec,
  netEarnedBase,
  readPendingBorrows,
  loanForStream,
} from "@/lib/loan-ui";
import { useLending } from "@/lib/use-lending";
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
  onRaiseMilestone?: (streamId: string) => void;
  raising?: boolean;
  raiseStatus?: string | null;
  onBorrowed?: () => void;
};

function BorrowActionButton({
  hasLoan,
  onClick,
}: {
  hasLoan: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-xl border border-[#e85d2a]/45 bg-[#e85d2a]/14 px-3 py-2 text-center transition-colors hover:bg-[#e85d2a]/20"
    >
      <span className="block text-[8px] font-semibold uppercase tracking-[0.14em] text-[#e85d2a]/75">
        Borrow
      </span>
      <span className="block text-[10px] font-bold uppercase tracking-[0.06em] text-[#e85d2a]">
        {hasLoan ? "details" : "against"}
      </span>
    </button>
  );
}

export function PhoneStreamDetailsView({
  stream,
  label,
  incoming,
  now,
  onBack,
  onRaiseMilestone,
  raising,
  raiseStatus,
  onBorrowed,
}: PhoneStreamDetailsViewProps) {
  const pool = useLending();
  const [screen, setScreen] = useState<"details" | "borrow">("details");
  const [pendingBorrows, setPendingBorrows] = useState(readPendingBorrows);

  useEffect(() => {
    setScreen("details");
    setPendingBorrows(readPendingBorrows());
  }, [stream.id]);

  const loan = loanForStream(stream.id, pool.loans, pendingBorrows);
  const hasLoan = !!loan;

  if (screen === "borrow") {
    return (
      <PhoneBorrowAgainstView
        stream={stream}
        label={label}
        onBack={() => {
          setPendingBorrows(readPendingBorrows());
          pool.refetch();
          setScreen("details");
        }}
        onBorrowed={() => {
          setPendingBorrows(readPendingBorrows());
          pool.refetch();
          onBorrowed?.();
        }}
      />
    );
  }

  const view = effectiveState(stream);
  const grossEarned = earnedBase(stream, now);
  const netEarned = netEarnedBase(grossEarned, loan, stream);
  const displayEarned = loan ? netEarned : grossEarned;
  const progress = stream.total > 0 ? (grossEarned / stream.total) * 100 : 0;
  const netRate = netDripPerSec(loan, stream) / USDC_BASE;
  const repayRate = loan ? loanRepayPerSec(loan, stream) / USDC_BASE : 0;
  const repayShare =
    grossEarned > 0 ? Math.min(100, ((grossEarned - netEarned) / grossEarned) * 100) : 0;
  const netShare = 100 - repayShare;

  const done = completedMilestones(stream);
  const next = nextMilestoneNo(stream);

  const statusLine = loan
    ? `−${repayRate.toFixed(6)} / sec repaying · +${netRate.toFixed(6)} / sec to wallet`
    : view === "dripping"
      ? `+${netRate.toFixed(6)} / sec · live, gasless`
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
                ? loan
                  ? "Incoming stream · drips repay your loan first."
                  : "Incoming stream to your wallet."
                : "Outgoing stream from your wallet."}
            </p>
          </div>
          {incoming ? (
            <BorrowActionButton
              hasLoan={hasLoan}
              onClick={() => setScreen("borrow")}
            />
          ) : (
            <span className="shrink-0 rounded-full border border-black/10 bg-[#fafafa] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#888]">
              {view.replace("_", " ")}
            </span>
          )}
        </div>

        {loan && (
          <section className="rounded-2xl border border-[#e85d2a]/25 bg-[#e85d2a]/[0.05] px-3 py-2.5">
            <p className="text-[10px] font-semibold text-[#e85d2a]">Active loan</p>
            <p className="mt-1 text-[11px] text-[#666]">
              Borrowed {usd(loan.principalBase, 2)} · owe{" "}
              <span className="font-semibold tabular text-[#e85d2a]">
                {usd(loan.owedBase, 2)}
              </span>
            </p>
          </section>
        )}

        <section className="rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#888]">
            {loan ? "Net to wallet · " : "Earned so far · "}
            {short(stream.id)}
          </p>
          <p className="mt-2 text-[2rem] font-bold tabular-nums leading-none text-[#111]">
            {usd(displayEarned, 3)}
          </p>
          {loan && grossEarned > netEarned && (
            <p className="mt-1 text-[11px] tabular text-[#888]">
              Gross {usd(grossEarned, 3)} ·{" "}
              <span className="text-[#e85d2a]">{usd(grossEarned - netEarned, 3)} to loan</span>
            </p>
          )}

          {loan && view === "dripping" && (
            <div className="mt-3">
              <div className="flex h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
                <div
                  className="h-full bg-[#1d9e75] transition-[width] duration-500"
                  style={{ width: `${netShare}%` }}
                />
                <div
                  className="h-full bg-[#e85d2a] transition-[width] duration-500"
                  style={{ width: `${repayShare}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10px] font-medium leading-snug">
                <span className="text-[#1d9e75]">To wallet</span>
                <span className="text-[#888]"> · </span>
                <span className="text-[#e85d2a]">Repaying loan from stream</span>
              </p>
            </div>
          )}

          <p
            className={`mt-2 text-[11px] font-medium ${
              loan
                ? "text-[#e85d2a]"
                : view === "dripping"
                  ? "text-[#1d9e75]"
                  : view === "paused"
                    ? "text-[#c0533a]"
                    : "text-[#666]"
            }`}
          >
            {statusLine}
          </p>
        </section>

        {incoming && view === "locked" && onRaiseMilestone && (
          <div>
            <button
              type="button"
              disabled={raising}
              onClick={() => onRaiseMilestone(stream.id)}
              className="w-full rounded-2xl bg-[#111] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white disabled:opacity-40"
            >
              {raising ? "Raising…" : `Apply for milestone ${next}`}
            </button>
            <p className="mt-1.5 text-center text-[10px] leading-snug text-[#888]">
              Marks milestone {done} done and sends it to the client to approve —
              dripping resumes once approved.
            </p>
            {raiseStatus && (
              <p className="mt-1 text-center text-[10px] text-[#666]">{raiseStatus}</p>
            )}
          </div>
        )}

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
