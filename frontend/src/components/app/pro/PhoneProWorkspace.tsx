"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";

import { useNetworkVariable } from "@/lib/networks";
import { USDC_BASE } from "@/lib/stream-math";
import { shortAddress } from "@/lib/format";
import { useProWorkspace } from "./ProWorkspaceContext";
import { onProAction } from "./pro-actions";
import {
  YIELD_APY,
  bucketLabel,
  fmtUsd,
  groupCommitted,
  monthlyToPerSec,
} from "./types";
import {
  OnramperModal,
  onramperConfigured,
  type OnrampMode,
} from "@/components/wallet/OnramperWidget";
import { ProActionModals } from "./modals/ProActionModals";
import { StatusPill } from "./ui";
import { ReportsScreen } from "./screens/ReportsScreen";
import { ToolsScreen } from "./screens/ToolsScreen";

type PhoneTab = "overview" | "streams" | "people" | "treasury" | "tools" | "reports";

export function PhoneProWorkspace() {
  const [tab, setTab] = useState<PhoneTab>("overview");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    return onProAction((action) => {
      if (action === "compliance") setTab("reports");
    });
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col font-[family-name:var(--font-inter)]">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tab === "overview" && (
          <OverviewTab
            expanded={expanded}
            onToggle={(id) =>
              setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
            }
          />
        )}
        {tab === "streams" && <StreamsTab />}
        {tab === "people" && <PeopleTab />}
        {tab === "treasury" && <TreasuryTab />}
        {tab === "tools" && <ToolsScreen />}
        {tab === "reports" && (
          <ReportsTab onBack={() => setTab("overview")} />
        )}
      </div>

      <ProPhoneDock tab={tab} onTab={setTab} />

      <ProActionModals />
    </div>
  );
}

/** Floating mobile dock: Overview · Treasury · Streams · People · Tools */
function ProPhoneDock({
  tab,
  onTab,
}: {
  tab: PhoneTab;
  onTab: (t: PhoneTab) => void;
}) {
  const items: { id: PhoneTab; label: string; icon: ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <IconOverview /> },
    { id: "treasury", label: "Treasury", icon: <IconTreasury /> },
    { id: "streams", label: "Streams", icon: <IconStreams /> },
    { id: "people", label: "People", icon: <IconPeople /> },
    { id: "tools", label: "Tools", icon: <IconTools /> },
  ];

  return (
    <div className="relative z-20 shrink-0 px-1 pb-0.5 pt-3">
      <div className="relative flex items-center justify-around rounded-[1.75rem] border border-white/[0.08] bg-[#171717]/96 px-1.5 py-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        {items.map((item) => (
          <DockTab
            key={item.id}
            active={tab === item.id}
            label={item.label}
            icon={item.icon}
            onClick={() => onTab(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

function DockTab({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1 transition-colors ${
        active ? "text-white" : "text-white/35 active:text-white/70"
      }`}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full ${
          active ? "bg-white/12 text-white" : "text-inherit"
        }`}
      >
        {icon}
      </span>
      <span
        className={`text-[6.5px] font-semibold uppercase tracking-[0.1em] ${
          active ? "text-white/85" : "text-inherit"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function IconTools() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14.7 6.3a4 4 0 0 0-5.6 5.6L4 17l3 3 5.1-5.1a4 4 0 0 0 5.6-5.6l-2.5 2.5-2.5-2.5 2.5-2.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconOverview() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function IconStreams() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h11M4 12h16M4 17h9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="18" cy="7" r="1.6" fill="currentColor" />
      <circle cx="15" cy="17" r="1.6" fill="currentColor" />
    </svg>
  );
}

function IconPeople() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M3.5 19c.6-3 2.8-4.5 5.5-4.5S14 16 14.5 19"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="17" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M16 14.5c1.8.2 3.2 1.2 3.8 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTreasury() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 19V11M12 19V5M19 19v-7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function OverviewTab({
  expanded,
  onToggle,
}: {
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  const { workspace, totals, setModal } = useProWorkspace();
  const ungrouped = workspace.workers.filter((w) => !w.groupId);
  const alloc = workspace.pool.allocation;
  const poolTotal = alloc.idle + alloc.yield_vault + alloc.reserve || 1;

  const payrollPerSec = useMemo(
    () =>
      workspace.workers
        .filter((w) => w.status === "dripping")
        .reduce((s, w) => s + monthlyToPerSec(w.monthlyUsd), 0),
    [workspace.workers]
  );
  const yieldPerSec = useMemo(() => {
    const vault = workspace.pool.allocation.yield_vault;
    return vault * (YIELD_APY / 365 / 24 / 3600);
  }, [workspace.pool.allocation.yield_vault]);

  const netPerSec = yieldPerSec - payrollPerSec;
  const coverPct =
    payrollPerSec > 0
      ? Math.round((yieldPerSec / payrollPerSec) * 100)
      : yieldPerSec > 0
        ? 100
        : 0;

  const periodLabel = new Date()
    .toLocaleDateString(undefined, { month: "short", year: "2-digit" })
    .toUpperCase();

  const bars = useMemo(() => {
    const groupBars = workspace.groups.slice(0, 4).map((g, i) => {
      const v = groupCommitted(workspace, g.id);
      return {
        key: g.id,
        value: Math.max(v, 1),
        label: compactUsd(v),
        up: i !== 1,
      };
    });
    while (groupBars.length < 4) {
      const seeds = [
        totals.claimable,
        totals.monthly * 0.35,
        totals.poolBalance * 0.12,
        totals.yieldEarned * 40 || totals.monthly * 0.22,
      ];
      const i = groupBars.length;
      groupBars.push({
        key: `pad-${i}`,
        value: Math.max(seeds[i] || 1, 1),
        label: compactUsd(seeds[i] || 1),
        up: i % 2 === 0,
      });
    }
    const max = Math.max(...groupBars.map((b) => b.value), 1);
    const heroIdx = groupBars.reduce(
      (best, b, i, arr) => (b.value > arr[best].value ? i : best),
      0
    );
    return groupBars.map((b, i) => ({
      ...b,
      height: Math.max(24, Math.round((b.value / max) * 100)),
      hero: i === heroIdx,
    }));
  }, [workspace, totals]);

  const donut = useMemo(() => {
    const segs = [
      { key: "idle", value: alloc.idle, stroke: "rgba(255,255,255,0.78)" },
      { key: "yield", value: alloc.yield_vault, stroke: "#22c55e" },
      { key: "reserve", value: alloc.reserve, stroke: "rgba(255,255,255,0.28)" },
    ];
    let offset = 0;
    return segs.map((seg) => {
      const pct = (seg.value / poolTotal) * 100;
      const item = { ...seg, dash: `${pct} ${100 - pct}`, offset: -offset };
      offset += pct;
      return item;
    });
  }, [alloc, poolTotal]);

  const recentWorkers = useMemo(
    () =>
      [...workspace.workers]
        .sort((a, b) => b.monthlyUsd - a.monthlyUsd)
        .slice(0, 5),
    [workspace.workers]
  );

  return (
    <div className="flex flex-col gap-2.5 px-0.5 pb-1 pt-0.5">
      {/* Pool balance */}
      <div className="px-0.5">
        <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-white/35">
          Pool balance
        </p>
        <p className="mt-1 text-[1.85rem] font-semibold tabular leading-none tracking-tight text-white">
          {fmtUsd(totals.displayTotal, totals.displayTotal % 1 ? 2 : 0)}
        </p>
        <p className="mt-1.5 text-[9px] text-white/35">
          Manage funds on Treasury
        </p>
      </div>

      {/* Finance hero — striped run chart */}
      <section className="sl-pro-card sl-pro-card--flush p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] text-white/45">Total run</p>
            <p className="mt-1.5 text-[1.15rem] font-semibold tabular leading-none text-[#22c55e]">
              {netPerSec >= 0 ? "+" : "−"}
              {coverPct}%
            </p>
            <p className="mt-1 text-[8px] leading-snug text-white/40">
              {netPerSec >= 0 ? "yield covering payroll" : "payroll ahead of yield"}
            </p>
          </div>
          <span className="sl-pro-chip shrink-0 !py-1 !text-[8px]">Live</span>
        </div>

        <div className="mt-3">
          <div className="sl-pro-bars">
            {bars.map((bar) => (
              <div
                key={bar.key}
                className="sl-pro-bar"
                style={{ height: `${bar.height}%` }}
              >
                <div
                  className={`absolute inset-0 overflow-hidden rounded-full ${
                    bar.hero
                      ? "bg-white"
                      : bar.up
                        ? "bg-white/35"
                        : "bg-white/20"
                  }`}
                >
                  <span
                    className={`absolute inset-0 ${
                      bar.hero
                        ? "sl-pro-stripe opacity-45"
                        : "sl-pro-stripe-light opacity-55"
                    }`}
                    aria-hidden
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between gap-1">
            {bars.map((bar) => (
              <p key={`lbl-${bar.key}`} className="sl-pro-bar-label flex-1">
                {bar.up ? "↗" : "↙"} {bar.label}
              </p>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <div className="rounded-[1.1rem] bg-[#22c55e]/[0.12] px-2.5 py-2.5">
            <p className="text-[7px] font-semibold uppercase tracking-[0.14em] text-[#22c55e]/75">
              Yield in
            </p>
            <p className="mt-1 text-[12px] font-semibold tabular leading-none text-[#22c55e]">
              +{fmtUsd(yieldPerSec, 4)}
              <span className="text-[8px] font-medium text-[#22c55e]/55">/s</span>
            </p>
          </div>
          <div className="rounded-[1.1rem] bg-white/[0.045] px-2.5 py-2.5">
            <p className="text-[7px] font-semibold uppercase tracking-[0.14em] text-white/40">
              Payroll out
            </p>
            <p className="mt-1 text-[12px] font-semibold tabular leading-none text-white/85">
              −{fmtUsd(payrollPerSec, 4)}
              <span className="text-[8px] font-medium text-white/35">/s</span>
            </p>
          </div>
        </div>
      </section>

      {/* Payroll twin stats */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setModal("invest")}
          className="sl-pro-card sl-pro-card--flush p-3 text-left transition-transform active:scale-[0.99]"
        >
          <div className="flex items-center gap-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#22c55e]/15 text-[#22c55e]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M4 7h11M4 12h16M4 17h9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="text-[10px] font-medium text-white/55">Streaming</span>
            <span className="ml-auto text-[10px] tabular text-white/35">
              {totals.active} ›
            </span>
          </div>
          <p className="mt-2.5 text-[1.05rem] font-semibold tabular tracking-tight text-white">
            {fmtUsd(totals.monthly, 0)}
          </p>
          <p className="mt-0.5 text-[8px] text-white/35">/mo committed</p>
        </button>

        <div className="sl-pro-card sl-pro-card--flush p-3">
          <div className="flex items-center gap-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/8 text-white/70">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect
                  x="4"
                  y="5"
                  width="16"
                  height="14"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M8 9h8M8 13h5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="text-[10px] font-medium text-white/55">Claimable</span>
            <span className="ml-auto text-[10px] tabular text-white/35">
              {workspace.workers.length} ›
            </span>
          </div>
          <p className="mt-2.5 text-[1.05rem] font-semibold tabular tracking-tight text-white">
            {fmtUsd(totals.claimable)}
          </p>
          <p className="mt-0.5 text-[8px] text-white/35">open across roster</p>
        </div>
      </div>

      {/* Finance pool holdings + donut */}
      <section className="sl-pro-card sl-pro-card--flush p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[12px] font-medium text-white/90">Pool holdings</p>
            <p className="mt-0.5 text-[9px] text-white/35">
              {fmtUsd(totals.poolBalance)} total
            </p>
          </div>
          <button
            type="button"
            aria-label="Rebalance"
            onClick={() => setModal("invest")}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#22c55e] text-white shadow-[0_6px_18px_rgba(34,197,94,0.35)] transition-transform active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M7 17L17 7M17 7H9M17 7v8"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="mt-2 flex items-center gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            {(
              [
                {
                  key: "idle",
                  label: bucketLabel("idle"),
                  value: alloc.idle,
                  color: "bg-white/75",
                },
                {
                  key: "yield",
                  label: bucketLabel("yield_vault"),
                  value: alloc.yield_vault,
                  color: "bg-[#22c55e]",
                },
                {
                  key: "reserve",
                  label: bucketLabel("reserve"),
                  value: alloc.reserve,
                  color: "bg-white/30",
                },
              ] as const
            ).map((seg) => (
              <div key={seg.key} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 text-[9px] text-white/50">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${seg.color}`} />
                  <span className="truncate">{seg.label}</span>
                </span>
                <span className="shrink-0 tabular text-[9px] text-white/75">
                  {fmtUsd(seg.value, 0)}
                </span>
              </div>
            ))}
          </div>

          <div className="sl-pro-donut-wrap">
            <svg viewBox="0 0 140 84" aria-hidden>
              <path
                d="M16 78 A54 54 0 0 1 124 78"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="14"
                strokeLinecap="round"
                pathLength={100}
              />
              {donut.map((seg) => (
                <path
                  key={seg.key}
                  d="M16 78 A54 54 0 0 1 124 78"
                  fill="none"
                  stroke={seg.stroke}
                  strokeWidth="14"
                  strokeLinecap="butt"
                  pathLength={100}
                  strokeDasharray={seg.dash}
                  strokeDashoffset={seg.offset}
                />
              ))}
            </svg>
            <div className="sl-pro-donut-center">
              <p className="text-[7px] uppercase tracking-[0.14em] text-white/35">
                Total
              </p>
              <p className="mt-0.5 text-[12px] font-semibold tabular leading-none text-white">
                {compactUsd(totals.poolBalance)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Payroll payment cards */}
      <div>
        <div className="mb-2 flex items-center justify-between px-0.5">
          <p className="text-[13px] font-semibold text-white">Recent streams</p>
          <span className="text-[9px] text-white/35">
            {workspace.groups.length} groups
          </span>
        </div>

        <div className="space-y-2">
          {workspace.groups.map((group) => {
            const members = workspace.workers.filter((w) => w.groupId === group.id);
            const dripping = members.filter((w) => w.status === "dripping");
            const committed = groupCommitted(workspace, group.id);
            const isOpen = !!expanded[group.id];
            const lead = members[0];
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => onToggle(group.id)}
                className="sl-pro-card sl-pro-card--flush w-full p-3 text-left transition-transform active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-[11px] font-semibold text-white/80 ring-1 ring-white/10">
                    {group.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-white">
                      {group.name}
                    </p>
                    <p className="truncate text-[9px] text-white/40">
                      {members.length} people · {dripping.length} streaming
                      {lead ? ` · ${lead.alias}` : ""}
                    </p>
                  </div>
                  <span className="text-[14px] text-white/25">{isOpen ? "‹" : "›"}</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[7px] font-medium uppercase tracking-[0.14em] text-white/30">
                      Pay period
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-white/85">
                      {periodLabel}
                    </p>
                  </div>
                  <div>
                    <p className="text-[7px] font-medium uppercase tracking-[0.14em] text-white/30">
                      Rate
                    </p>
                    <p className="mt-1 text-[11px] font-semibold tabular text-white/85">
                      {fmtUsd(committed, 0)}
                      <span className="text-[8px] font-medium text-white/35">/mo</span>
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-[1rem] bg-black/35 px-3 py-2.5">
                  <p className="text-[8px] font-medium uppercase tracking-[0.14em] text-white/35">
                    Monthly total
                  </p>
                  <p className="text-[13px] font-semibold tabular text-white">
                    {fmtUsd(committed, 0)}
                  </p>
                </div>

                {isOpen && members.length > 0 ? (
                  <div className="mt-2.5 space-y-1.5 border-t border-white/[0.06] pt-2.5">
                    {members.map((w) => (
                      <div
                        key={w.id}
                        className="flex items-center justify-between gap-2 rounded-xl px-1 py-1"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/8 text-[8px] font-semibold text-white/70">
                            {w.alias.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[10px] font-medium text-white/80">
                              {w.alias}
                            </p>
                            <p className="text-[8px] text-white/30">
                              {fmtUsd(w.monthlyUsd, 0)}/mo
                            </p>
                          </div>
                        </div>
                        <StatusPill status={w.status} compact />
                      </div>
                    ))}
                  </div>
                ) : null}
              </button>
            );
          })}

          {recentWorkers
            .filter((w) => !w.groupId)
            .slice(0, 2)
            .map((w) => (
              <div key={w.id} className="sl-pro-card sl-pro-card--flush w-full p-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-[11px] font-semibold text-white/80 ring-1 ring-white/10">
                    {w.alias.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-white">
                      {w.alias}
                    </p>
                    <p className="truncate text-[9px] text-white/40">
                      {shortAddress(w.walletAddress)} · ungrouped
                    </p>
                  </div>
                  <StatusPill status={w.status} compact />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[7px] font-medium uppercase tracking-[0.14em] text-white/30">
                      Pay period
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-white/85">
                      {periodLabel}
                    </p>
                  </div>
                  <div>
                    <p className="text-[7px] font-medium uppercase tracking-[0.14em] text-white/30">
                      Rate
                    </p>
                    <p className="mt-1 text-[11px] font-semibold tabular text-white/85">
                      {fmtUsd(w.monthlyUsd, 0)}
                      <span className="text-[8px] font-medium text-white/35">/mo</span>
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-[1rem] bg-black/35 px-3 py-2.5">
                  <p className="text-[8px] font-medium uppercase tracking-[0.14em] text-white/35">
                    Monthly total
                  </p>
                  <p className="text-[13px] font-semibold tabular text-white">
                    {fmtUsd(w.monthlyUsd, 0)}
                  </p>
                </div>
              </div>
            ))}

          {workspace.groups.length === 0 && ungrouped.length === 0 ? (
            <div className="sl-pro-card sl-pro-card--flush px-3 py-8 text-center">
              <p className="text-[12px] text-white/40">
                No substreams yet — tap + to start a run.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function compactUsd(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return abs >= 10 ? n.toFixed(0) : n.toFixed(1);
}

function StreamsTab() {
  const { workspace, setWorkerStatus, createWorkerStream, creating, deleteWorker } =
    useProWorkspace();

  return (
    <div className="flex flex-col px-0.5 pb-1 pt-0.5">
      <p className="text-[8px] font-medium uppercase tracking-[0.18em] text-white/40">
        Live substreams
      </p>
      <p className="mt-0.5 text-[9px] text-white/30">
        Pause or resume drips. Delete removes them from the run.
      </p>
      <div className="mt-2 space-y-1.5">
        {workspace.workers.map((w) => {
          const group = workspace.groups.find((g) => g.id === w.groupId);
          const drip = monthlyToPerSec(w.monthlyUsd);
          return (
            <div
              key={w.id}
              className="sl-pro-card sl-pro-card--flush px-2.5 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-white/85">
                    {w.alias}
                  </p>
                  <p className="text-[8px] text-white/35">
                    {group?.name ?? "Ungrouped"} · {shortAddress(w.walletAddress)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-semibold tabular text-white/80">
                    {fmtUsd(w.monthlyUsd, 0)}
                    <span className="text-[8px] font-normal text-white/35">
                      /mo
                    </span>
                  </p>
                  <p className="text-[8px] tabular text-white/40">
                    {w.status === "dripping" ? `−${fmtUsd(drip, 4)}/s` : "—"}
                  </p>
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                <StatusPill status={w.status} compact />
                <span className="flex-1" />
                {w.status === "dripping" ? (
                  <MiniBtn onClick={() => setWorkerStatus(w.id, "paused")}>
                    Pause
                  </MiniBtn>
                ) : null}
                {w.status === "paused" || w.status === "pending" ? (
                  <MiniBtn
                    disabled={creating}
                    onClick={() =>
                      w.streamId
                        ? setWorkerStatus(w.id, "dripping")
                        : createWorkerStream(w.id)
                    }
                  >
                    {w.streamId ? "Resume" : "Start"}
                  </MiniBtn>
                ) : null}
                <MiniBtn
                  danger
                  onClick={() => {
                    if (window.confirm(`Remove ${w.alias} from the run?`)) {
                      deleteWorker(w.id);
                    }
                  }}
                >
                  Delete
                </MiniBtn>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PeopleTab() {
  const { workspace, setModal } = useProWorkspace();
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...workspace.workers]
      .sort((a, b) => a.alias.localeCompare(b.alias))
      .filter(
        (w) =>
          !q ||
          w.alias.toLowerCase().includes(q) ||
          w.walletAddress.toLowerCase().includes(q)
      );
  }, [workspace.workers, query]);

  return (
    <div className="flex flex-col gap-2.5 px-0.5 pb-1 pt-0.5">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-[13px] font-semibold text-white">People</p>
        <button
          type="button"
          onClick={() => setModal("worker")}
          className="rounded-full bg-[#22c55e] px-3 py-1 text-[9px] font-semibold text-white shadow-[0_4px_12px_rgba(34,197,94,0.3)]"
        >
          + Add
        </button>
      </div>

      <label className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#1a1a1a] px-3 py-2.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="6.5" stroke="rgba(255,255,255,0.35)" strokeWidth="1.7" />
          <path
            d="M16.5 16.5L20 20"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search roster"
          className="w-full bg-transparent text-[12px] text-white outline-none placeholder:text-white/30"
        />
      </label>

      <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {workspace.groups.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setModal({ kind: "group-edit", groupId: g.id })}
            className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] text-white/70"
          >
            {g.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setModal("group")}
          className="shrink-0 rounded-full border border-dashed border-white/15 px-2.5 py-1 text-[9px] text-white/40"
        >
          + Group
        </button>
      </div>

      <div className="sl-pro-card sl-pro-card--flush divide-y divide-white/[0.05] overflow-hidden p-0">
        {rows.map((w) => {
          const group = workspace.groups.find((g) => g.id === w.groupId);
          const active = w.status === "dripping";
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => setModal({ kind: "worker-edit", workerId: w.id })}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors active:bg-white/[0.04]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-[11px] font-semibold text-white/80 ring-1 ring-white/10">
                {w.alias.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-white">
                  {w.alias}
                </p>
                <p className="truncate text-[9px] text-white/40">
                  {group?.name ?? "Ungrouped"} · {fmtUsd(w.monthlyUsd, 0)}/mo
                </p>
              </div>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  active
                    ? "bg-[#22c55e] text-white"
                    : "border border-white/15 text-transparent"
                }`}
                aria-hidden
              >
                {active ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  "·"
                )}
              </span>
            </button>
          );
        })}
        {rows.length === 0 ? (
          <p className="px-3 py-6 text-center text-[11px] text-white/35">
            No people match.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ReportsTab({ onBack }: { onBack: () => void }) {
  return <ReportsScreen onBack={onBack} />;
}

function TreasuryTab() {
  const { workspace, totals, setModal } = useProWorkspace();
  const account = useCurrentAccount();
  const [rampMode, setRampMode] = useState<OnrampMode | null>(null);
  const alloc = workspace.pool.allocation;
  const total = alloc.idle + alloc.yield_vault + alloc.reserve || 1;
  const canRamp = onramperConfigured && !!account;
  const segments = [
    {
      key: "idle",
      label: bucketLabel("idle"),
      value: alloc.idle,
      color: "bg-white/75",
      stripe: true,
    },
    {
      key: "yield",
      label: bucketLabel("yield_vault"),
      value: alloc.yield_vault,
      color: "bg-[#1d9e75]",
      stripe: false,
    },
    {
      key: "reserve",
      label: bucketLabel("reserve"),
      value: alloc.reserve,
      color: "bg-white/35",
      stripe: true,
    },
  ];

  return (
    <div className="flex flex-col gap-2.5 px-0.5 pb-1 pt-0.5">
      <section className="sl-pro-card sl-pro-card--flush p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[8px] font-medium uppercase tracking-[0.16em] text-white/40">
              Treasury
            </p>
            <p className="mt-1.5 text-[1.45rem] font-semibold tabular leading-none text-white">
              {fmtUsd(totals.poolBalance)}
            </p>
          </div>
          <span className="sl-pro-chip !px-2 !py-1 !text-[8px]">Pool</span>
        </div>
        <p className="mt-1.5 text-[9px] tabular text-[#1d9e75]">
          +{fmtUsd(totals.yieldEarned, 4)} accrued
          {alloc.yield_vault > 0 && (
            <span className="text-[#1d9e75]/60">
              {" · +"}
              {fmtUsd(alloc.yield_vault * (YIELD_APY / 365 / 24 / 3600), 6)}/s
            </span>
          )}
        </p>

        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-white/[0.04] p-0.5">
          {segments.map((seg) => (
            <div
              key={seg.key}
              className={`relative h-full overflow-hidden rounded-full ${seg.color}`}
              style={{ width: `${(seg.value / total) * 100}%` }}
            >
              {seg.stripe ? (
                <span
                  className="pointer-events-none absolute inset-0 sl-pro-stripe-light opacity-70"
                  aria-hidden
                />
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-2.5 space-y-1">
          {segments.map((seg) => (
            <div
              key={seg.key}
              className="flex items-center justify-between rounded-xl bg-white/[0.04] px-2.5 py-2 text-[10px]"
            >
              <span className="flex items-center gap-1.5 text-white/45">
                <span className={`h-1.5 w-1.5 rounded-full ${seg.color}`} />
                {seg.label}
              </span>
              <span className="tabular text-white/80">{fmtUsd(seg.value, 0)}</span>
            </div>
          ))}
        </div>

        <p className="mt-3 text-[9px] leading-snug text-white/35">
          Floor {fmtUsd(totals.floor, 0)} stays liquid · investable{" "}
          {fmtUsd(totals.investable, 0)}
        </p>

        <WalletBalanceRow />
      </section>

      <section className="sl-pro-card sl-pro-card--flush p-3.5">
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setModal("fund")}
            className="flex flex-col items-center gap-1 rounded-2xl bg-[#22c55e] px-2 py-3 text-[11px] font-semibold tracking-tight text-white shadow-[0_8px_24px_rgba(34,197,94,0.28)] transition-transform active:scale-[0.98]"
          >
            <PhoneFundIcon />
            Fund
          </button>
          <button
            type="button"
            onClick={() => setModal("withdraw")}
            className="flex flex-col items-center gap-1 rounded-2xl border border-white/12 bg-white/[0.06] px-2 py-3 text-[11px] font-semibold tracking-tight text-white transition-colors active:bg-white/[0.1]"
          >
            <PhoneWithdrawIcon />
            Withdraw
          </button>
          <button
            type="button"
            onClick={() => setModal("invest")}
            className="flex flex-col items-center gap-1 rounded-2xl border border-white/12 bg-white/[0.06] px-2 py-3 text-[11px] font-semibold tracking-tight text-white transition-colors active:bg-white/[0.1]"
          >
            <PhoneRebalanceIcon />
            Rebalance
          </button>
        </div>
        {canRamp ? (
          <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-white/[0.06] pt-2">
            <button
              type="button"
              onClick={() => setRampMode("buy")}
              className="rounded-xl border border-white/[0.08] bg-transparent px-2 py-2 text-[10px] font-medium text-white/50 transition-colors active:text-white/80"
            >
              Add funds
            </button>
            <button
              type="button"
              onClick={() => setRampMode("sell")}
              className="rounded-xl border border-white/[0.08] bg-transparent px-2 py-2 text-[10px] font-medium text-white/50 transition-colors active:text-white/80"
            >
              Cash out
            </button>
          </div>
        ) : null}
      </section>

      <OnramperModal
        open={rampMode !== null}
        mode={rampMode ?? "buy"}
        onClose={() => setRampMode(null)}
      />
    </div>
  );
}

function PhoneFundIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PhoneWithdrawIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5v10M8 11l4 4 4-4M5 19h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PhoneRebalanceIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h12M16 7l-2.5-2.5M16 7l-2.5 2.5M20 17H8M8 17l2.5-2.5M8 17l2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Connected wallet's spendable USDC — the balance you fund the pool from. */
function WalletBalanceRow() {
  const account = useCurrentAccount();
  const usdcType = useNetworkVariable("usdcType");
  const { data } = useSuiClientQuery(
    "getBalance",
    { owner: account?.address ?? "", coinType: usdcType },
    { enabled: !!account, refetchInterval: 15000 }
  );
  if (!account) return null;
  const bal = data ? Number(BigInt(data.totalBalance)) / USDC_BASE : 0;
  return (
    <div className="mt-2 flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5">
      <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.12em] text-white/40">
        <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
        In your wallet
      </span>
      <span className="tabular text-[11px] font-semibold text-white">
        {fmtUsd(bal, 2)}
      </span>
    </div>
  );
}

function MiniBtn({
  children,
  onClick,
  accent,
  danger,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  accent?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`rounded-full px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wider disabled:opacity-30 ${
        danger
          ? "border border-[#c0533a]/35 text-[#c0533a]"
          : accent
            ? "border border-[#1d9e75]/35 bg-[#1d9e75]/10 text-[#1d9e75]"
            : "border border-white/12 text-white/55"
      }`}
    >
      {children}
    </button>
  );
}
