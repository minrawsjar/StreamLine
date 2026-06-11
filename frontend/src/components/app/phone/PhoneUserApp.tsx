"use client";

import { useEffect, useMemo, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";

import { WalletButton } from "@/components/wallet/WalletButton";
import { useStreams, useLiveUpdates, type StreamRecord } from "@/lib/indexer";
import { USDC_BASE } from "@/lib/stream-math";
import {
  completedMilestones,
  effectiveState,
  milestoneCeilingBase,
} from "@/lib/stream-state";
import type { Role } from "../user/RoleSelect";

type PhoneUserAppProps = {
  onBack: () => void;
};

/** Earned base units = already paid + live accrual while dripping (matches the
 * full FreelancerDashboard). */
function earnedBase(s: StreamRecord, nowMs: number): number {
  const paid = s.total - s.remaining;
  if (effectiveState(s) !== "dripping" || s.duration_ms <= 0) return paid;
  const rate = s.total / s.duration_ms;
  const accrued = Math.max(0, (nowMs - s.last_drip_ms) * rate);
  return Math.min(paid + accrued, milestoneCeilingBase(s, s.current_milestone), s.total);
}

const usd = (base: number) => `$${(base / USDC_BASE).toFixed(2)}`;

export function PhoneUserApp({ onBack }: PhoneUserAppProps) {
  const account = useCurrentAccount();
  const [role, setRole] = useState<Role | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const addr = account?.address;
  const receiverQ = useStreams({ freelancer: role === "receiver" ? addr : undefined });
  const payerQ = useStreams({ sender: role === "payer" ? addr : undefined });

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  useLiveUpdates(() => {
    receiverQ.refetch();
    payerQ.refetch();
  });

  const isReceiver = role === "receiver";
  const streams = useMemo(
    () => (isReceiver ? receiverQ.data : payerQ.data) ?? [],
    [isReceiver, receiverQ.data, payerQ.data]
  );

  const view = useMemo(() => {
    const active = streams[0];
    if (isReceiver) {
      const earned = streams.reduce((a, s) => a + earnedBase(s, now), 0);
      const progress = active && active.total > 0 ? (earnedBase(active, now) / active.total) * 100 : 0;
      const dripping = active && effectiveState(active) === "dripping";
      const nextDrip = dripping
        ? `${Math.max(0, Math.ceil((active.last_drip_ms + active.drip_interval_ms - now) / 1000))}s`
        : "—";
      return {
        heroLabel: "Earned (live)",
        hero: usd(earned),
        progress,
        m1Label: "Milestone",
        m1: active ? `${completedMilestones(active)} / ${active.n_milestones}` : "—",
        m2Label: "Next drip",
        m2: nextDrip,
      };
    }
    const deployed = streams.reduce((a, s) => a + s.total, 0);
    const paid = streams.reduce((a, s) => a + (s.total - s.remaining), 0);
    const review = streams.filter((s) => effectiveState(s) === "pending_review").length;
    return {
      heroLabel: "Deployed",
      hero: usd(deployed),
      progress: deployed > 0 ? (paid / deployed) * 100 : 0,
      m1Label: "Milestone",
      m1: active ? `${completedMilestones(active)} / ${active.n_milestones}` : "—",
      m2Label: "Review",
      m2: review > 0 ? `${review} pending` : "0",
    };
  }, [streams, isReceiver, now]);

  if (!account) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
        <p className="text-[10px] text-[#888]">Connect wallet to continue</p>
        <WalletButton className="sl-glass-btn sl-glass-btn-primary mt-4 !px-4 !py-2 !text-[9px]" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#888]">
          Pick your role
        </p>
        <div className="mt-4 space-y-2.5">
          {(
            [
              { role: "receiver" as const, title: "Freelancer", body: "Earn as you deliver" },
              { role: "payer" as const, title: "Client", body: "Pay as work lands" },
            ] as const
          ).map((c) => (
            <button
              key={c.role}
              type="button"
              onClick={() => setRole(c.role)}
              className="w-full rounded-xl border border-white/60 bg-white/75 px-3.5 py-3 text-left backdrop-blur-md transition-colors hover:border-black/20"
            >
              <p className="text-xs font-bold text-[#111]">{c.title}</p>
              <p className="mt-0.5 text-[10px] text-[#666]">{c.body}</p>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onBack}
          className="mt-auto pt-4 text-[10px] font-medium text-black/50"
        >
          ← All apps
        </button>
      </div>
    );
  }

  const loading = isReceiver ? receiverQ.isLoading : payerQ.isLoading;
  const empty = !loading && streams.length === 0;

  return (
    <div className="mt-1 flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        onClick={() => setRole(null)}
        className="mb-3 self-start text-[10px] font-medium text-black/50"
      >
        ← Change role
      </button>

      <div className="rounded-2xl border border-white/60 bg-white/75 p-3.5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] backdrop-blur-md">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-[#888]">
          {view.heroLabel}
        </p>
        <p className="mt-1 text-[1.5rem] font-bold tabular leading-none text-[#111]">
          {loading ? "…" : view.hero}
        </p>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-black/8">
          <div
            className="h-full rounded-full bg-[#111] transition-[width] duration-200"
            style={{ width: `${Math.min(100, Math.max(2, view.progress))}%` }}
          />
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/50 bg-white/65 p-3 backdrop-blur-md">
          <p className="text-[8px] font-medium uppercase tracking-wider text-[#888]">
            {view.m1Label}
          </p>
          <p className="mt-0.5 text-sm font-bold text-[#111]">{view.m1}</p>
        </div>
        <div className="rounded-xl border border-white/50 bg-white/65 p-3 backdrop-blur-md">
          <p className="text-[8px] font-medium uppercase tracking-wider text-[#888]">
            {view.m2Label}
          </p>
          <p className="mt-0.5 text-sm font-bold text-[#111]">{view.m2}</p>
        </div>
      </div>

      {empty && (
        <p className="mt-3 text-center text-[9px] text-[#999]">
          No streams yet — open the full workspace to{" "}
          {isReceiver ? "watch incoming streams" : "create one"}.
        </p>
      )}

      <a
        href="/app/user"
        className="sl-glass-btn sl-glass-btn-primary mt-auto !w-full !py-2.5 !text-[9px]"
      >
        Open full workspace →
      </a>
    </div>
  );
}
