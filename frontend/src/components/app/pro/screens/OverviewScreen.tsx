"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { usePhoneEmbedded } from "@/components/app/phone/PhoneEmbeddedContext";
import { shortAddress } from "@/lib/format";
import { useProWorkspace } from "../ProWorkspaceContext";
import {
  bucketLabel,
  fmtUsd,
  groupCommitted,
  workerClaimable,
} from "../types";
import { CompositionBar, ProCard, ProEyebrow, ProStat, StatusPill } from "../ui";

function SoftLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const embedded = usePhoneEmbedded();
  if (embedded) {
    return <span className={className}>{children}</span>;
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function OverviewScreen() {
  const embedded = usePhoneEmbedded();
  const { workspace, totals, nowMs, setModal } = useProWorkspace();
  const alloc = workspace.pool.allocation;
  const recent = workspace.activity.slice(0, 6);
  const topWorkers = [...workspace.workers]
    .sort((a, b) => b.monthlyUsd - a.monthlyUsd)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <ProEyebrow>Overview</ProEyebrow>
          <h1
            className={`mt-2 font-semibold tracking-tight text-white ${
              embedded
                ? "text-[1.35rem]"
                : "text-[clamp(28px,4vw,40px)]"
            }`}
          >
            {workspace.orgName}
          </h1>
          {!embedded ? (
            <p className="mt-1 text-[13px] text-white/45">
              Shared USDC pool · continuous substreams · idle capital can earn
              while unclaimed
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`sl-glass-btn-dark ${
              embedded ? "!px-2.5 !py-1 !text-[9px]" : "!px-4 !py-2 !text-[11px]"
            }`}
            onClick={() => setModal("invest")}
          >
            Allocate
          </button>
          <button
            type="button"
            className={`sl-glass-btn-dark sl-glass-btn-dark-primary ${
              embedded ? "!px-2.5 !py-1 !text-[9px]" : "!px-4 !py-2 !text-[11px]"
            }`}
            onClick={() => setModal("fund")}
          >
            Fund pool
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProStat
          label="Pool balance"
          value={fmtUsd(totals.poolBalance)}
          hint={`+${fmtUsd(totals.yieldEarned)} yield accrued`}
          accent
        />
        <ProStat
          label="Monthly committed"
          value={fmtUsd(totals.monthly, 0)}
          hint={`${totals.active} streaming now`}
        />
        <ProStat
          label="Open claimable"
          value={fmtUsd(totals.claimable)}
          hint="Unclaimed accrued across roster"
        />
        <ProStat
          label="Investable idle"
          value={fmtUsd(totals.investable, 0)}
          hint={`Floor ${fmtUsd(totals.floor, 0)}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ProCard>
          <div className="flex items-center justify-between gap-3">
            <ProEyebrow>Pool composition</ProEyebrow>
            <SoftLink
              href="/app/pro/treasury"
              className="text-[11px] text-white/40 hover:text-white"
            >
              Treasury →
            </SoftLink>
          </div>
          <p className="mt-3 text-[28px] font-semibold tabular tracking-tight text-white">
            {fmtUsd(alloc.idle + alloc.yield_vault + alloc.reserve)}
          </p>
          <p className="mt-1 text-[12px] text-white/40">
            Streamed to date {fmtUsd(workspace.pool.streamed)}
          </p>
          <div className="mt-5">
            <CompositionBar
              segments={[
                {
                  key: "idle",
                  label: bucketLabel("idle"),
                  value: alloc.idle,
                  color: "bg-white/70",
                },
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
              ]}
            />
          </div>
        </ProCard>

        <ProCard>
          <ProEyebrow>Stream groups</ProEyebrow>
          <div className="mt-4 space-y-3">
            {workspace.groups.length === 0 ? (
              <p className="text-[13px] text-white/40">No groups yet.</p>
            ) : (
              workspace.groups.map((g) => {
                const count = workspace.workers.filter(
                  (w) => w.groupId === g.id
                ).length;
                return (
                  <div
                    key={g.id}
                    className="flex items-center justify-between gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="text-[13px] font-medium text-white">
                        {g.name}
                      </p>
                      <p className="text-[11px] text-white/40">
                        {count} substream{count === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p className="text-[13px] tabular text-white/80">
                      {fmtUsd(groupCommitted(workspace, g.id), 0)}/mo
                    </p>
                  </div>
                );
              })
            )}
          </div>
          <SoftLink
            href="/app/pro/people"
            className="mt-4 inline-block text-[11px] text-white/40 hover:text-white"
          >
            Manage people →
          </SoftLink>
        </ProCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ProCard>
          <div className="flex items-center justify-between">
            <ProEyebrow>Top substreams</ProEyebrow>
            <SoftLink
              href="/app/pro/streams"
              className="text-[11px] text-white/40 hover:text-white"
            >
              Funding →
            </SoftLink>
          </div>
          <div className="mt-4 space-y-3">
            {topWorkers.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-white">
                    {w.alias}
                  </p>
                  <p className="text-[11px] text-white/35">
                    {shortAddress(w.walletAddress)} · claimable{" "}
                    {fmtUsd(workerClaimable(w, nowMs))}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusPill status={w.status} />
                  <span className="text-[12px] tabular text-white/70">
                    {fmtUsd(w.monthlyUsd, 0)}/mo
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ProCard>

        <ProCard>
          <ProEyebrow>Recent activity</ProEyebrow>
          <div className="mt-4 space-y-3">
            {recent.length === 0 ? (
              <p className="text-[13px] text-white/40">No activity yet.</p>
            ) : (
              recent.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start justify-between gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-[13px] text-white/85">{a.label}</p>
                    <p className="text-[11px] text-white/35">
                      {new Date(a.at).toLocaleString()}
                    </p>
                  </div>
                  {a.amount != null ? (
                    <span className="shrink-0 text-[12px] tabular text-[#1d9e75]">
                      {fmtUsd(a.amount)}
                    </span>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </ProCard>
      </div>
    </div>
  );
}
