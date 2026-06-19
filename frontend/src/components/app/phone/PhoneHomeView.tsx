"use client";

import { useEffect, useMemo, useState } from "react";
import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { useQueries } from "@tanstack/react-query";

import {
  fetchStreamDrips,
  useLiveUpdates,
  useStreams,
  type StreamRecord,
} from "@/lib/indexer";
import { useNetworkVariable } from "@/lib/networks";
import { USDC_BASE } from "@/lib/stream-math";
import {
  dripRatePerMinuteBase,
  earnedBase,
  effectiveState,
  isAwaitingClientApproval,
  isAwaitingFreelancerRaise,
  pendingAccrualBase,
} from "@/lib/stream-state";
import { resolveStreamLabel } from "@/lib/stream-labels";
import {
  clearPendingBorrow,
  loanForStream,
  readPendingBorrows,
} from "@/lib/loan-ui";
import { useLending } from "@/lib/use-lending";
import { useGaslessExecute } from "@/lib/use-gasless";
import { buildRaiseCompletion } from "@/lib/streamline-tx";
import {
  PhoneDashboardView,
  type PhoneActivityItem,
  type PhoneTopStat,
  type StreamCardData,
} from "./PhoneDashboardView";
import { PhoneStreamsPanel } from "./PhoneStreamsPanel";
import { PhoneStreamDetailsView } from "./PhoneStreamDetailsView";

const usd = (base: number, digits = 2) =>
  (base / USDC_BASE).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

function formatRelative(ms: number, now: number): string {
  const diff = Math.max(0, now - ms);
  if (diff < 60_000) return `${Math.max(1, Math.floor(diff / 1000))}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 172_800_000) return "Yesterday";
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Human-readable reason a stream is or isn't flowing. */
function streamStatusLabel(s: StreamRecord): string {
  if (effectiveState(s) === "dripping") return "Dripping";
  if (isAwaitingClientApproval(s)) return "Awaiting approval";
  if (isAwaitingFreelancerRaise(s)) return "Awaiting completion";
  if (s.state === "done") return "Completed";
  if (s.state === "paused") return "Paused";
  return "Idle";
}

function streamBackLabel(s: StreamRecord, addr: string, index: number): string {
  if (s.freelancer === addr) {
    return index === 1 ? "Private stream" : "Work stream";
  }
  if (s.sender === addr) return "Pay stream";
  return "Stream";
}

type PhoneHomeViewProps = {
  showAllStreams?: boolean;
  onShowAllStreams?: () => void;
  onBackToHome?: () => void;
  onCreate?: () => void;
  onRequest?: () => void;
  onTransfer?: () => void;
};

type HomeDetailsView =
  | { kind: "home" }
  | { kind: "total" }
  | { kind: "stream"; id: string };

export function PhoneHomeView({
  showAllStreams = false,
  onShowAllStreams,
  onBackToHome,
  onCreate,
  onRequest,
  onTransfer,
}: PhoneHomeViewProps) {
  const account = useCurrentAccount();
  const usdcType = useNetworkVariable("usdcType");
  const packageId = useNetworkVariable("packageId");
  const { execute, isPending } = useGaslessExecute();
  const pool = useLending();
  const [pendingBorrows, setPendingBorrows] = useState(readPendingBorrows);
  const [now, setNow] = useState(() => Date.now());
  const [lastWalletBase, setLastWalletBase] = useState(0);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [detailsView, setDetailsView] = useState<HomeDetailsView>({ kind: "home" });
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const addr = account?.address;

  const incomingQ = useStreams({ freelancer: addr });
  const outgoingQ = useStreams({ sender: addr });
  const balanceQ = useSuiClientQuery(
    "getBalance",
    {
      owner: addr ?? "",
      coinType: usdcType,
    },
    { enabled: !!addr && !!usdcType }
  );

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const next = balanceQ.data?.totalBalance;
    if (next !== undefined && next !== null) {
      setLastWalletBase(Number(next));
    }
  }, [balanceQ.data?.totalBalance]);

  const incoming = incomingQ.data ?? [];
  const outgoing = outgoingQ.data ?? [];
  const allStreams = useMemo(
    () => [...incoming, ...outgoing.filter((o) => !incoming.some((i) => i.id === o.id))],
    [incoming, outgoing]
  );

  const activityStreamIds = useMemo(
    () => allStreams.slice(0, 8).map((s) => s.id),
    [allStreams]
  );

  const dripQueries = useQueries({
    queries: activityStreamIds.map((id) => ({
      queryKey: ["drips", id],
      queryFn: () => fetchStreamDrips(id),
      enabled: !!id,
      refetchInterval: 20_000,
    })),
  });

  const refetchDrips = () => {
    dripQueries.forEach((q) => q.refetch());
  };

  useLiveUpdates(() => {
    incomingQ.refetch();
    outgoingQ.refetch();
    balanceQ.refetch();
    refetchDrips();
    pool.refetch();
    setPendingBorrows(readPendingBorrows());
  });

  useEffect(() => {
    for (const loan of pool.loans) {
      clearPendingBorrow(loan.streamId);
    }
    setPendingBorrows(readPendingBorrows());
  }, [pool.loans]);

  const activeStreams = useMemo(
    () =>
      allStreams.filter(
        (s) =>
          effectiveState(s) === "dripping" ||
          effectiveState(s) === "pending_review" ||
          s.state === "locked"
      ),
    [allStreams]
  );

  const incomingDripping = useMemo(
    () => incoming.filter((s) => effectiveState(s) === "dripping"),
    [incoming]
  );

  const liveAccrualBase = useMemo(
    () =>
      incomingDripping.reduce((acc, s) => acc + pendingAccrualBase(s, now), 0),
    [incomingDripping, now]
  );

  const macroCard = useMemo(() => {
    const walletBase =
      balanceQ.data?.totalBalance !== undefined &&
      balanceQ.data?.totalBalance !== null
        ? Number(balanceQ.data.totalBalance)
        : lastWalletBase;
    const isLive = liveAccrualBase > 0;

    return {
      id: "macro",
      label: "Total balance",
      amount: usd(walletBase + liveAccrualBase, 3),
      subtitle: "",
      isLive,
    };
  }, [balanceQ.data?.totalBalance, lastWalletBase, liveAccrualBase]);

  const streamCards = useMemo(() => {
    return [...activeStreams]
      .sort((a, b) => a.created_at_ms - b.created_at_ms)
      .map((s, i) => {
        const isIncoming = s.freelancer === addr;
        const dripping = effectiveState(s) === "dripping";
        const loan = loanForStream(s.id, pool.loans, pendingBorrows);
        const value = dripping ? earnedBase(s, now) : s.total;
        const status = loan
          ? "Repaying loan"
          : dripping
            ? ""
            : streamStatusLabel(s);
        return {
          id: s.id,
          label: resolveStreamLabel(s) ?? (addr ? streamBackLabel(s, addr, i) : "Stream"),
          amount: usd(value, 3),
          subtitle: status,
          isLive: dripping && isIncoming,
          meta: loan
            ? `Borrowed ${usd(loan.principalBase, 0)} · owe ${usd(loan.owedBase, 0)}`
            : `${isIncoming ? "Incoming" : "Outgoing"} · ${usd(s.remaining, 0)} left`,
        };
      });
  }, [activeStreams, addr, now, pool.loans, pendingBorrows]);

  const cards = useMemo(() => [macroCard, ...streamCards], [macroCard, streamCards]);

  useEffect(() => {
    if (cards.length === 0) {
      setActiveCardIndex(0);
      return;
    }
    setActiveCardIndex((prev) => ((prev % cards.length) + cards.length) % cards.length);
  }, [cards.length]);

  const shiftCards = () => {
    if (cards.length <= 1) return;
    setActiveCardIndex((prev) => (prev + 1) % cards.length);
  };

  const openActiveCard = () => {
    const active = cards[((activeCardIndex % cards.length) + cards.length) % cards.length];
    if (!active) return;
    if (active.id === "macro") {
      setDetailsView({ kind: "total" });
      return;
    }
    setDetailsView({ kind: "stream", id: active.id });
  };

  const selectedStream = useMemo(
    () =>
      detailsView.kind === "stream"
        ? activeStreams.find((s) => s.id === detailsView.id)
        : undefined,
    [detailsView, activeStreams]
  );

  const topStats = useMemo((): PhoneTopStat[] => {
    const streamCount = allStreams.length;
    const ratePerMinuteBase = incomingDripping.reduce(
      (acc, s) => acc + dripRatePerMinuteBase(s),
      0
    );
    const isLive = ratePerMinuteBase > 0;

    return [
      {
        label: "Drip/min",
        value: usd(ratePerMinuteBase, 3),
        live: isLive,
      },
      { label: "Streams", value: String(streamCount) },
    ];
  }, [allStreams, incomingDripping]);

  const activity = useMemo((): PhoneActivityItem[] => {
    const drips = dripQueries.flatMap((q) => q.data ?? []);
    const dripItems = drips
      .sort((a, b) => b.timestamp_ms - a.timestamp_ms)
      .map((d) => ({
        ts: d.timestamp_ms,
        time: formatRelative(d.timestamp_ms, now),
        text: "Drip received",
        amount: `+${usd(d.amount)}`,
      }));

    const streamItems = allStreams.map((s) => ({
      ts: s.created_at_ms,
      time: formatRelative(s.created_at_ms, now),
      text: s.freelancer === addr ? "Stream request received" : "Stream created",
      amount: null as string | null,
    }));

    const loanItems = pool.loans.map((l) => ({
      ts: l.openedMs,
      time: formatRelative(l.openedMs, now),
      text: "Borrowed against stream",
      amount: usd(l.principalBase),
    }));

    const pendingItems = pendingBorrows
      .filter((p) => !pool.loans.some((l) => l.streamId === p.streamId))
      .map((p) => ({
        ts: p.at,
        time: formatRelative(p.at, now),
        text: "Borrow pending confirmation",
        amount: usd(p.principalBase),
      }));

    return [...loanItems, ...pendingItems, ...dripItems, ...streamItems]
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 5)
      .map(({ time, text, amount }) => ({ time, text, amount }));
  }, [dripQueries, allStreams, now, addr, pool.loans, pendingBorrows]);

  const activityLoading =
    !!addr && activityStreamIds.length > 0 && dripQueries.some((q) => q.isLoading);

  const handleQuickAction = (id: string) => {
    if (id === "create") onCreate?.();
    if (id === "request") onRequest?.();
    if (id === "transfer") onTransfer?.();
  };

  const onRaiseCompletion = (streamId: string) => {
    setActionStatus("Awaiting signature…");
    execute(buildRaiseCompletion({ packageId, usdcType, streamId }), {
      onSuccess: (r) => {
        setActionStatus(`Milestone raised — ${r.digest.slice(0, 10)}…`);
        incomingQ.refetch();
        outgoingQ.refetch();
      },
      onError: (e) => setActionStatus(e.message),
    });
  };

  const openStream = (id: string) => {
    setActionStatus(null);
    setDetailsView({ kind: "stream", id });
  };

  if (showAllStreams) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <button
          type="button"
          onClick={onBackToHome}
          className="mb-3 self-start text-[9px] font-medium text-[#666]"
        >
          ← Home
        </button>
        <PhoneStreamsPanel />
      </div>
    );
  }

  if (detailsView.kind === "total") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <button
          type="button"
          onClick={() => setDetailsView({ kind: "home" })}
          className="mb-3 self-start text-[9px] font-medium text-[#666]"
        >
          ← Home
        </button>
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-[#111]">
              Active streams
            </h2>
            <p className="mt-1 text-[12px] leading-snug text-[#666]">
              Open a stream to see full details.
            </p>
          </div>
          {activeStreams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/10 bg-white px-3 py-6 text-center">
              <p className="text-[12px] font-medium text-[#555]">No streams yet</p>
              <p className="mt-1 text-[11px] text-[#888]">
                Create a stream or accept a request to get started.
              </p>
            </div>
          ) : (
            activeStreams.map((s, i) => {
              const dripping = effectiveState(s) === "dripping";
              const isIncoming = s.freelancer === addr;
              const loan = loanForStream(s.id, pool.loans, pendingBorrows);
              const value = dripping ? earnedBase(s, now) : s.total;
              const progress =
                s.total > 0 ? Math.min(100, (earnedBase(s, now) / s.total) * 100) : 0;
              const label =
                resolveStreamLabel(s) ?? (addr ? streamBackLabel(s, addr, i) : "Stream");

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => openStream(s.id)}
                  className="rounded-2xl border border-black/8 bg-white p-3.5 text-left shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-colors hover:border-black/14"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold tracking-tight text-[#111]">
                        {label}
                      </p>
                      <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-[#888]">
                        {isIncoming ? "Incoming" : "Outgoing"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] ${
                        loan
                          ? "bg-[#e85d2a]/12 text-[#e85d2a]"
                          : dripping
                            ? "bg-[#1d9e75]/10 text-[#1d9e75]"
                            : "bg-black/5 text-[#777]"
                      }`}
                    >
                      {loan ? "Repaying" : streamStatusLabel(s)}
                    </span>
                  </div>

                  <p className="mt-3 text-[18px] font-bold tabular-nums leading-none text-[#111]">
                    {usd(value, 2)}
                    <span className="ml-1.5 text-[10px] font-medium text-[#888]">
                      {dripping ? "earned" : "locked"}
                    </span>
                  </p>

                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-black/[0.06]">
                    <div
                      className={`h-full rounded-full transition-[width] duration-500 ${
                        dripping ? "bg-[#1d9e75]" : "bg-[#5b54e6]/50"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-black/6 pt-2.5">
                    <div>
                      <p className="text-[7px] font-semibold uppercase tracking-[0.12em] text-[#aaa]">
                        Remaining
                      </p>
                      <p className="mt-0.5 text-[10px] font-semibold tabular-nums text-[#333]">
                        {usd(s.remaining, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[7px] font-semibold uppercase tracking-[0.12em] text-[#aaa]">
                        Milestone
                      </p>
                      <p className="mt-0.5 text-[10px] font-semibold tabular-nums text-[#333]">
                        {s.current_milestone + 1}/{s.n_milestones}
                      </p>
                    </div>
                    <div>
                      <p className="text-[7px] font-semibold uppercase tracking-[0.12em] text-[#aaa]">
                        Drip/min
                      </p>
                      <p className="mt-0.5 text-[10px] font-semibold tabular-nums text-[#333]">
                        {usd(dripRatePerMinuteBase(s), 2)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  if (detailsView.kind === "stream" && selectedStream) {
    const streamIndex = activeStreams.findIndex((s) => s.id === selectedStream.id);
    return (
      <PhoneStreamDetailsView
        stream={selectedStream}
        label={
          resolveStreamLabel(selectedStream) ??
          (addr ? streamBackLabel(selectedStream, addr, streamIndex) : "Stream")
        }
        incoming={selectedStream.freelancer === addr}
        now={now}
        onBack={() => setDetailsView({ kind: "home" })}
        onBorrowed={() => {
          pool.refetch();
          setPendingBorrows(readPendingBorrows());
        }}
      />
    );
  }

  return (
    <PhoneDashboardView
      cards={cards}
      activeCardIndex={activeCardIndex}
      topStats={topStats}
      activity={activity}
      activityLoading={activityLoading}
      onQuickAction={handleQuickAction}
      onShiftCards={shiftCards}
      onPrimaryCardClick={openActiveCard}
      onPrimaryCardDetails={openActiveCard}
    />
  );
}