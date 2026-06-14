"use client";

import { useEffect, useMemo, useState } from "react";
import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";

import { useStreams, useLiveUpdates } from "@/lib/indexer";
import { useNetworkVariable } from "@/lib/networks";
import { USDC_BASE } from "@/lib/stream-math";
import {
  completedMilestones,
  effectiveState,
  milestoneCeilingBase,
} from "@/lib/stream-state";
import type { StreamRecord } from "@/lib/indexer";
import { short } from "../dashboard-ui";
import {
  PhoneDashboardView,
  type PhoneActivityItem,
  type StreamCardData,
} from "./PhoneDashboardView";
import { PhoneStreamsPanel } from "./PhoneStreamsPanel";

const DEMO_ACTIVITY: PhoneActivityItem[] = [
  { time: "2m ago", text: "Drip received", amount: "+$0.50" },
  { time: "1h ago", text: "Milestone approved", amount: null },
  { time: "Yesterday", text: "Split to yield wallet", amount: "$42.00" },
];

const EMPTY_BACK_CARDS: StreamCardData[] = [
  {
    id: "empty-1",
    label: "Empty stream",
    amount: "$0.00",
    subtitle: "Tap to view all streams",
    empty: true,
  },
  {
    id: "empty-2",
    label: "Empty stream",
    amount: "$0.00",
    subtitle: "No active stream",
    empty: true,
  },
];

function earnedBase(s: StreamRecord, nowMs: number): number {
  const paid = s.total - s.remaining;
  if (effectiveState(s) !== "dripping" || s.duration_ms <= 0) return paid;
  const rate = s.total / s.duration_ms;
  const accrued = Math.max(0, (nowMs - s.last_drip_ms) * rate);
  return Math.min(paid + accrued, milestoneCeilingBase(s, s.current_milestone), s.total);
}

const usd = (base: number) =>
  (base / USDC_BASE).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function streamToBackCard(s: StreamRecord, now: number): StreamCardData {
  const earned = earnedBase(s, now);
  const progress = s.total > 0 ? (earned / s.total) * 100 : 0;
  const dripping = effectiveState(s) === "dripping";
  const state = effectiveState(s).replace("_", " ");

  return {
    id: s.id,
    label: dripping ? "Active stream" : short(s.id),
    amount: usd(earned),
    subtitle: dripping
      ? `Dripping · M${completedMilestones(s) + 1}/${s.n_milestones}`
      : state,
    progress,
  };
}

type PhoneHomeViewProps = {
  showAllStreams?: boolean;
  onShowAllStreams?: () => void;
  onBackToHome?: () => void;
  onRequest?: () => void;
};

export function PhoneHomeView({
  showAllStreams = false,
  onShowAllStreams,
  onBackToHome,
  onRequest,
}: PhoneHomeViewProps) {
  const account = useCurrentAccount();
  const usdcType = useNetworkVariable("usdcType");
  const [now, setNow] = useState(() => Date.now());
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

  useLiveUpdates(() => {
    incomingQ.refetch();
    outgoingQ.refetch();
    balanceQ.refetch();
  });

  const incoming = incomingQ.data ?? [];
  const outgoing = outgoingQ.data ?? [];
  const allStreams = useMemo(
    () => [...incoming, ...outgoing.filter((o) => !incoming.some((i) => i.id === o.id))],
    [incoming, outgoing]
  );

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
    const walletBase = Number(balanceQ.data?.totalBalance ?? 0);
    const dripping = allStreams.filter((s) => effectiveState(s) === "dripping").length;
    const count = allStreams.length;

    return {
      label: "Total balance",
      amount: usd(walletBase),
      subtitle: `${count} stream${count === 1 ? "" : "s"}${dripping > 0 ? ` · ${dripping} active` : ""}`,
    };
  }, [balanceQ.data?.totalBalance, allStreams]);

  const backCards = useMemo(() => {
    const cards = activeStreams.slice(0, 2).map((s) => streamToBackCard(s, now));
    while (cards.length < 2) {
      cards.push(EMPTY_BACK_CARDS[cards.length]);
    }
    return cards;
  }, [activeStreams, now]);

  const loading = incomingQ.isLoading || outgoingQ.isLoading || balanceQ.isLoading;

  const handleQuickAction = (id: string) => {
    if (id === "request") onRequest?.();
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
        amount: loading ? "…" : macro.amount,
        subtitle: macro.subtitle,
      }}
      backCards={backCards}
      activity={DEMO_ACTIVITY}
      onQuickAction={handleQuickAction}
      onBackCardClick={onShowAllStreams}
    />
  );
}
