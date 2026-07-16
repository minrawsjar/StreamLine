"use client";

import { useMemo, useState, type ReactNode } from "react";

import { shortAddress } from "@/lib/format";
import { useProWorkspace } from "./ProWorkspaceContext";
import {
  YIELD_APY,
  bucketLabel,
  fmtUsd,
  groupCommitted,
  monthlyToPerSec,
} from "./types";
import { ProActionModals } from "./modals/ProActionModals";
import { StatusPill } from "./ui";

type PhoneTab = "overview" | "streams" | "people" | "capital";

export function PhoneProWorkspace() {
  const { setModal } = useProWorkspace();
  const [tab, setTab] = useState<PhoneTab>("overview");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [composeOpen, setComposeOpen] = useState(false);

  const handlePlus = () => {
    // Context-aware create: only Overview stays multimodal.
    if (tab === "overview") {
      setComposeOpen(true);
      return;
    }
    if (tab === "people") {
      setModal("worker");
      return;
    }
    if (tab === "capital") {
      setModal("fund");
      return;
    }
    // streams → create a new substream
    setModal("worker");
  };

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
        {tab === "capital" && <CapitalTab />}
      </div>

      <ProPhoneDock tab={tab} onTab={setTab} onCompose={handlePlus} />

      {composeOpen ? (
        <ComposeSheet
          onClose={() => setComposeOpen(false)}
          onPick={(action) => {
            setComposeOpen(false);
            if (action === "worker") {
              setTab("people");
              setModal("worker");
            } else if (action === "group") {
              setTab("people");
              setModal("group");
            } else if (action === "fund") {
              setTab("capital");
              setModal("fund");
            }
          }}
        />
      ) : null}

      <ProActionModals />
    </div>
  );
}

/** Floating mobile dock: 4 destinations + center create. */
function ProPhoneDock({
  tab,
  onTab,
  onCompose,
}: {
  tab: PhoneTab;
  onTab: (t: PhoneTab) => void;
  onCompose: () => void;
}) {
  const left: { id: PhoneTab; label: string; icon: ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <IconOverview /> },
    { id: "streams", label: "Streams", icon: <IconStreams /> },
  ];
  const right: { id: PhoneTab; label: string; icon: ReactNode }[] = [
    { id: "people", label: "People", icon: <IconPeople /> },
    { id: "capital", label: "Capital", icon: <IconCapital /> },
  ];

  return (
    <div className="relative z-20 shrink-0 px-1 pb-0.5 pt-3">
      <div className="relative flex items-center justify-between rounded-[1.35rem] border border-white/12 bg-[#141414]/92 px-1.5 py-1 shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="flex flex-1 items-center justify-around">
          {left.map((item) => (
            <DockTab
              key={item.id}
              active={tab === item.id}
              label={item.label}
              icon={item.icon}
              onClick={() => onTab(item.id)}
            />
          ))}
        </div>

        <div className="relative mx-0.5 flex w-[48px] shrink-0 items-center justify-center">
          <button
            type="button"
            onClick={onCompose}
            aria-label="Create"
            className="absolute -top-3.5 flex h-[44px] w-[44px] items-center justify-center rounded-full bg-white text-[#0a0a0a] shadow-[0_6px_20px_rgba(255,255,255,0.18)] transition-transform active:scale-95"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <span className="h-9 w-9" aria-hidden />
        </div>

        <div className="flex flex-1 items-center justify-around">
          {right.map((item) => (
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

function ComposeSheet({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (action: "worker" | "group" | "fund") => void;
}) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative mx-1 mb-1 rounded-[1.35rem] border border-white/12 bg-[#161616] p-3 shadow-2xl">
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <div>
            <p className="text-[8px] font-medium uppercase tracking-[0.18em] text-white/35">
              Create
            </p>
            <p className="mt-0.5 text-[13px] font-semibold tracking-tight text-white">
              Grow the payroll run
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] text-white/45"
          >
            Close
          </button>
        </div>

        <div className="space-y-1.5">
          <ComposeRow
            title="Add recipient"
            subtitle="New substream on the org pool"
            onClick={() => onPick("worker")}
          />
          <ComposeRow
            title="New stream group"
            subtitle="Label a team — Engineering, Design…"
            onClick={() => onPick("group")}
          />
          <ComposeRow
            title="Fund & start"
            subtitle="Deposit runway and activate pending"
            accent
            onClick={() => onPick("fund")}
          />
        </div>
        <p className="mt-2.5 px-0.5 text-[9px] leading-snug text-white/30">
          Allocate idle capital and withdraw excess on the Capital tab.
        </p>
      </div>
    </div>
  );
}

function ComposeRow({
  title,
  subtitle,
  onClick,
  accent,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors active:scale-[0.99] ${
        accent
          ? "border-white/20 bg-white text-[#0a0a0a]"
          : "border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.07]"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[16px] font-light ${
          accent ? "bg-[#0a0a0a]/8 text-white" : "bg-white/8 text-white/80"
        }`}
      >
        +
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] font-semibold tracking-tight">
          {title}
        </span>
        <span
          className={`block text-[9px] leading-snug ${
            accent ? "text-[#0a0a0a]/55" : "text-white/40"
          }`}
        >
          {subtitle}
        </span>
      </span>
    </button>
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

function IconCapital() {
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
  const { workspace, totals } = useProWorkspace();
  const ungrouped = workspace.workers.filter((w) => !w.groupId);

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

  return (
    <div className="flex flex-col px-0.5 pb-1 pt-0.5">
      <p className="text-[8px] font-medium uppercase tracking-[0.18em] text-white/40">
        Payroll run
      </p>

      <div className="mt-1.5">
        <p className="text-[1.65rem] font-semibold tabular leading-none tracking-tight text-white">
          {fmtUsd(totals.displayTotal, totals.displayTotal % 1 ? 2 : 0)}
        </p>
      </div>

      <div className="mt-1.5 grid grid-cols-2 gap-1">
        <div className="rounded-md border border-[#1d9e75]/20 bg-[#1d9e75]/[0.06] px-1.5 py-1">
          <p className="text-[6px] font-semibold uppercase tracking-[0.12em] text-[#1d9e75]/70">
            Yield in
          </p>
          <p className="mt-0.5 text-[10px] font-semibold tabular leading-none text-[#1d9e75]">
            +{fmtUsd(yieldPerSec, 4)}
            <span className="text-[7px] font-medium text-[#1d9e75]/60">/s</span>
          </p>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-1">
          <p className="text-[6px] font-semibold uppercase tracking-[0.12em] text-white/35">
            Payroll out
          </p>
          <p className="mt-0.5 text-[10px] font-semibold tabular leading-none text-white/75">
            −{fmtUsd(payrollPerSec, 4)}
            <span className="text-[7px] font-medium text-white/35">/s</span>
          </p>
        </div>
      </div>

      <p className="mt-1.5 text-[9px] text-white/35">
        {workspace.groups.length} group{workspace.groups.length === 1 ? "" : "s"} ·{" "}
        {totals.active} streaming · {fmtUsd(totals.monthly, 0)}/mo
      </p>

      <div className="mt-3 space-y-1.5">
        {workspace.groups.map((group) => {
          const members = workspace.workers.filter((w) => w.groupId === group.id);
          const dripping = members.filter((w) => w.status === "dripping");
          const dripPerSec = dripping.reduce(
            (s, w) => s + monthlyToPerSec(w.monthlyUsd),
            0
          );
          const isOpen = !!expanded[group.id];
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onToggle(group.id)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-white/85">
                    {group.name}
                  </p>
                  <p className="text-[9px] text-white/35">
                    {members.length} · {dripping.length} streaming
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-semibold tabular text-white/75">
                    {fmtUsd(groupCommitted(workspace, group.id), 0)}
                    <span className="text-[8px] font-normal text-white/35">
                      /mo
                    </span>
                  </p>
                  <p className="text-[8px] font-medium tabular text-white/40">
                    −{dripPerSec.toFixed(2)}/sec
                  </p>
                </div>
              </div>
              {isOpen && members.length > 0 ? (
                <div className="mt-2 space-y-1 border-t border-white/10 pt-2">
                  {members.map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between gap-2 rounded-md bg-white/[0.03] px-1.5 py-1"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-medium text-white/75">
                          {w.alias}
                        </p>
                        <p className="text-[8px] text-white/30">
                          {fmtUsd(w.monthlyUsd, 0)}/mo
                        </p>
                      </div>
                      <StatusPill status={w.status} compact />
                    </div>
                  ))}
                </div>
              ) : null}
            </button>
          );
        })}

        {ungrouped.length > 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2">
            <p className="text-[11px] font-medium text-white/80">Ungrouped</p>
            <div className="mt-1.5 space-y-1">
              {ungrouped.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between gap-2"
                >
                  <p className="truncate text-[10px] text-white/70">{w.alias}</p>
                  <StatusPill status={w.status} compact />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {workspace.groups.length === 0 && ungrouped.length === 0 ? (
          <p className="py-6 text-center text-[11px] text-white/35">
            No substreams yet — tap + to grow the run.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function StreamsTab() {
  const { workspace, setWorkerStatus, deleteWorker } = useProWorkspace();

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
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2"
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
                  <MiniBtn onClick={() => setWorkerStatus(w.id, "dripping")}>
                    Resume
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
  const rows = useMemo(
    () =>
      [...workspace.workers].sort((a, b) => a.alias.localeCompare(b.alias)),
    [workspace.workers]
  );

  return (
    <div className="flex flex-col px-0.5 pb-1 pt-0.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[8px] font-medium uppercase tracking-[0.18em] text-white/40">
          Roster
        </p>
        <button
          type="button"
          onClick={() => setModal("worker")}
          className="rounded-full border border-white/12 px-2 py-0.5 text-[8px] uppercase tracking-wider text-white/55"
        >
          Add
        </button>
      </div>

      <div className="mt-2 flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

      <div className="mt-1.5 space-y-1.5">
        {rows.map((w) => {
          const group = workspace.groups.find((g) => g.id === w.groupId);
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => setModal({ kind: "worker-edit", workerId: w.id })}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-left"
            >
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-white/85">
                  {w.alias}
                </p>
                <p className="text-[8px] text-white/35">
                  {group?.name ?? "Ungrouped"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11px] tabular text-white/75">
                  {fmtUsd(w.monthlyUsd, 0)}
                </p>
                <StatusPill status={w.status} compact />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CapitalTab() {
  const { workspace, totals, setModal } = useProWorkspace();
  const alloc = workspace.pool.allocation;
  const total = alloc.idle + alloc.yield_vault + alloc.reserve || 1;
  const segments = [
    { key: "idle", label: bucketLabel("idle"), value: alloc.idle, color: "bg-white/70" },
    {
      key: "yield",
      label: bucketLabel("yield_vault"),
      value: alloc.yield_vault,
      color: "bg-[#1d9e75]",
    },
    {
      key: "reserve",
      label: bucketLabel("reserve"),
      value: alloc.reserve,
      color: "bg-[#5b54e6]",
    },
  ];

  return (
    <div className="flex flex-col px-0.5 pb-1 pt-0.5">
      <p className="text-[8px] font-medium uppercase tracking-[0.18em] text-white/40">
        Capital
      </p>
      <p className="mt-1 text-[1.4rem] font-semibold tabular leading-none text-white">
        {fmtUsd(totals.poolBalance)}
      </p>
      <p className="mt-0.5 text-[9px] tabular text-[#1d9e75]">
        +{fmtUsd(totals.yieldEarned, 2)} accrued
      </p>

      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/5">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className={seg.color}
            style={{ width: `${(seg.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-2 space-y-1">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className="flex items-center justify-between text-[10px]"
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

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => setModal("withdraw")}
          className="sl-glass-btn-dark !px-2 !py-2 !text-[9px]"
        >
          Withdraw
        </button>
        <button
          type="button"
          onClick={() => setModal("invest")}
          className="sl-glass-btn-dark sl-glass-btn-dark-primary !px-2 !py-2 !text-[9px]"
        >
          Allocate
        </button>
      </div>
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
