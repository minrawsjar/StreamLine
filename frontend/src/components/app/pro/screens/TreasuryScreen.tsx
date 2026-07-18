"use client";

import { useProWorkspace } from "../ProWorkspaceContext";
import { YIELD_APY, bucketLabel, fmtUsd } from "../types";
import {
  CompositionBar,
  ProCard,
  ProEyebrow,
  ProStat,
} from "../ui";

export function TreasuryScreen() {
  const { workspace, totals, setModal, resetDemo } = useProWorkspace();
  const alloc = workspace.pool.allocation;
  const invested = alloc.yield_vault + alloc.reserve;
  const apyHint = `${(YIELD_APY * 100).toFixed(0)}% APR on yield vault`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <ProEyebrow>Treasury</ProEyebrow>
          <h1 className="mt-2 text-[clamp(26px,3.5vw,36px)] font-semibold tracking-tight text-white">
            Idle capital & yield
          </h1>
          <p className="mt-1 max-w-xl text-[13px] text-white/45">
            Unclaimed payroll float can sit liquid for claims or ride in
            StreamLine’s yield vault. Coverage floor stays reserved for drip
            liquidity.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="sl-glass-btn-dark !px-4 !py-2 !text-[11px]"
            onClick={() => setModal("withdraw")}
          >
            Withdraw excess
          </button>
          <button
            type="button"
            className="sl-glass-btn-dark sl-glass-btn-dark-primary !px-4 !py-2 !text-[11px]"
            onClick={() => setModal("invest")}
          >
            Allocate capital
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProStat
          label="Treasury total"
          value={fmtUsd(totals.poolBalance)}
          hint={apyHint}
          accent
        />
        <ProStat
          label="Yield accrued"
          value={fmtUsd(totals.yieldEarned)}
          hint="Simulated vault tick"
        />
        <ProStat
          label="Invested"
          value={fmtUsd(invested, 0)}
          hint={`${fmtUsd(alloc.yield_vault, 0)} vault · ${fmtUsd(alloc.reserve, 0)} reserve`}
        />
        <ProStat
          label="Liquid for claims"
          value={fmtUsd(alloc.idle, 0)}
          hint={`Floor ${fmtUsd(totals.floor, 0)}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <ProCard>
          <ProEyebrow>Allocation</ProEyebrow>
          <p className="mt-3 text-[28px] font-semibold tabular text-white">
            {fmtUsd(alloc.idle + alloc.yield_vault + alloc.reserve)}
          </p>
          <div className="mt-5">
            <CompositionBar
              segments={[
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
                },
                {
                  key: "reserve",
                  label: bucketLabel("reserve"),
                  value: alloc.reserve,
                  color: "bg-white/35",
                  stripe: true,
                },
              ]}
            />
          </div>
        </ProCard>

        <ProCard>
          <ProEyebrow>How it works</ProEyebrow>
          <ul className="mt-4 space-y-3 text-[13px] leading-relaxed text-white/55">
            <li>
              <span className="text-white">Liquid</span> — instantly available
              to cover claim PTBs.
            </li>
            <li>
              <span className="text-white">Yield vault</span> — StreamLine’s
              on-protocol vault (Scallop-shaped on testnet). Org keeps the yield.
            </li>
            <li>
              <span className="text-white">Reserve</span> — optional buffer you
              can peel back without touching the vault.
            </li>
            <li>
              Claims pull liquidity across buckets automatically when wired to
              chain.
            </li>
          </ul>
        </ProCard>
      </div>

      <ProCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <ProEyebrow>Workspace</ProEyebrow>
            <p className="mt-2 text-[14px] text-white/70">
              Org:{" "}
              <span className="text-white">{workspace.orgName}</span>
            </p>
            <p className="mt-1 text-[12px] text-white/35">
              Frontend workspace only — backend & Move payroll hooks come next.
            </p>
          </div>
          <button
            type="button"
            className="sl-glass-btn-dark !px-4 !py-2 !text-[11px]"
            onClick={() => {
              if (
                window.confirm(
                  "Reset this wallet’s Pro workspace to the sample payroll?"
                )
              ) {
                resetDemo();
              }
            }}
          >
            Reset sample data
          </button>
        </div>
      </ProCard>
    </div>
  );
}
