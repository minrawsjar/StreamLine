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
import { effectiveState } from "@/lib/stream-state";
import {
  PhoneDashboardView,
  type PhoneActivityItem,
  type PhoneTopStat,
  type StreamCardData,
} from "./PhoneDashboardView";
import { PhoneStreamsPanel } from "./PhoneStreamsPanel";

const EMPTY_BACK_CARDS: StreamCardData[] = [
  { id: "empty-1", label: "Empty stream", empty: true },
  { id: "empty-2", label: "Empty stream", empty: true },
];

const usd = (base: number) =>
  (base / USDC_BASE).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function formatRelative(ms: number, now: number): string {
  const diff = Math.max(0, now - ms);
  if (diff < 60_000) return `${Math.max(1, Math.floor(diff / 1000))}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 172_800_000) return "Yesterday";
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  const [now, setNow] = useState(() => Date.now());
  const [lastWalletBase, setLastWalletBase] = useState(0);
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
  });

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

  const macro = useMemo(() => {
    const walletBase =
      balanceQ.data?.totalBalance !== undefined &&
      balanceQ.data?.totalBalance !== null
        ? Number(balanceQ.data.totalBalance)
        : lastWalletBase;
    const dripping = allStreams.filter((s) => effectiveState(s) === "dripping").length;
    const count = allStreams.length;

    return {
      label: "Total balance",
      amount: usd(walletBase),
      subtitle: "",
    };
  }, [balanceQ.data?.totalBalance, allStreams, lastWalletBase]);

  const backCards = useMemo(() => {
    const cards = activeStreams.slice(0, 2).map((s, i) => ({
      id: s.id,
      label: addr ? streamBackLabel(s, addr, i) : "Stream",
    }));
    while (cards.length < 2) {
      cards.push(EMPTY_BACK_CARDS[cards.length]);
    }
    return cards;
  }, [activeStreams, addr]);

  const topStats = useMemo((): PhoneTopStat[] => {
    const streamCount = allStreams.length;
    const drippingStreams = allStreams.filter((s) => effectiveState(s) === "dripping");
    const ratePerMinuteBase = drippingStreams.reduce((acc, s) => {
      if (s.duration_ms <= 0) return acc;
      return acc + (s.total / s.duration_ms) * 60_000;
    }, 0);

    return [
      { label: "Streams", value: String(streamCount) },
      { label: "Drip/min", value: usd(ratePerMinuteBase) },
    ];
  }, [allStreams]);

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

    return [...dripItems, ...streamItems]
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 5)
      .map(({ time, text, amount }) => ({ time, text, amount }));
  }, [dripQueries, allStreams, now, addr]);

  const activityLoading =
    !!addr && activityStreamIds.length > 0 && dripQueries.some((q) => q.isLoading);

  const handleQuickAction = (id: string) => {
    if (id === "create") onCreate?.();
    if (id === "request") onRequest?.();
    if (id === "transfer") onTransfer?.();
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

  return (
    <PhoneDashboardView
      macro={{
        label: macro.label,
        amount: macro.amount,
        subtitle: macro.subtitle,
      }}
      backCards={backCards}
      topStats={topStats}
      activity={activity}
      activityLoading={activityLoading}
      onQuickAction={handleQuickAction}
      onBackCardClick={onShowAllStreams}
    />
  );
}