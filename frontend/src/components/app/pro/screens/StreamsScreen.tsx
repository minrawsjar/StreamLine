"use client";

import { shortAddress } from "@/lib/format";
import { useProWorkspace } from "../ProWorkspaceContext";
import {
  bucketLabel,
  fmtUsd,
  monthlyToPerSec,
} from "../types";
import {
  CompositionBar,
  ProCard,
  ProEyebrow,
  ProStat,
  StatusPill,
} from "../ui";

export function StreamsScreen() {
  const {
    workspace,
    totals,
    setModal,
    setWorkerStatus,
    createWorkerStream,
    creating,
    deleteWorker,
  } = useProWorkspace();
  const alloc = workspace.pool.allocation;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <ProEyebrow>Funding & streams</ProEyebrow>
          <h1 className="mt-2 text-[clamp(26px,3.5vw,36px)] font-semibold tracking-tight text-white">
            Run the payroll pool
          </h1>
          <p className="mt-1 max-w-xl text-[13px] text-white/45">
            One USDC pool for the org. Pause or resume drips, remove people from
            the run, and keep a liquid coverage floor while idle float earns.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="sl-glass-btn-dark !px-4 !py-2 !text-[11px]"
            onClick={() => setModal("withdraw")}
          >
            Withdraw
          </button>
          <button
            type="button"
            className="sl-glass-btn-dark !px-4 !py-2 !text-[11px]"
            onClick={() => setModal("invest")}
          >
            Allocate
          </button>
          <button
            type="button"
            className="sl-glass-btn-dark sl-glass-btn-dark-primary !px-4 !py-2 !text-[11px]"
            onClick={() => setModal("fund")}
          >
            Fund & start
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ProStat label="In pool" value={fmtUsd(totals.poolBalance)} accent />
        <ProStat
          label="Liquid / invested"
          value={`${fmtUsd(alloc.idle, 0)} / ${fmtUsd(alloc.yield_vault, 0)}`}
          hint={`Reserve ${fmtUsd(alloc.reserve, 0)}`}
        />
        <ProStat
          label="Coverage floor"
          value={fmtUsd(totals.floor, 0)}
          hint={`${workspace.pool.coverageWeeks} weeks committed`}
        />
      </div>

      <ProCard>
        <ProEyebrow>Capital mix</ProEyebrow>
        <div className="mt-4">
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

      <ProCard padding="sm">
        <div className="mb-3 flex items-center justify-between px-1.5 pt-1">
          <ProEyebrow>Live substreams</ProEyebrow>
          <p className="mt-1 text-[12px] text-white/45">
            Funded from the org treasury · pause / stop returns unearned capital
            to the pool
          </p>
          <span className="text-[11px] text-white/35">
            {workspace.workers.length} total
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.14em] text-white/35">
                <th className="px-2 py-2 font-medium">Recipient</th>
                <th className="px-2 py-2 font-medium">Rate</th>
                <th className="px-2 py-2 font-medium">Flow</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {workspace.workers.map((w) => {
                const group = workspace.groups.find((g) => g.id === w.groupId);
                const drip = monthlyToPerSec(w.monthlyUsd);
                return (
                  <tr
                    key={w.id}
                    className="border-b border-white/5 last:border-0"
                  >
                    <td className="px-2 py-3">
                      <p className="font-medium text-white">{w.alias}</p>
                      <p className="text-[11px] text-white/35">
                        {group?.name ?? "Ungrouped"} ·{" "}
                        {shortAddress(w.walletAddress)}
                      </p>
                    </td>
                    <td className="px-2 py-3 tabular text-white/80">
                      {fmtUsd(w.monthlyUsd, 0)}
                      <span className="text-white/35">
                        /{w.cadence === "HOURLY" ? "hr*" : "mo"}
                      </span>
                    </td>
                    <td className="px-2 py-3 tabular text-white/55">
                      {w.status === "dripping"
                        ? `−${fmtUsd(drip, 4)}/s`
                        : "—"}
                    </td>
                    <td className="px-2 py-3">
                      <StatusPill status={w.status} />
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex justify-end gap-1.5">
                        {w.status === "dripping" ? (
                          <button
                            type="button"
                            className="rounded-full border border-white/12 px-2.5 py-1 text-[10px] text-white/70 hover:bg-white/5"
                            onClick={() => setWorkerStatus(w.id, "paused")}
                          >
                            Pause
                          </button>
                        ) : null}
                        {w.status === "paused" || w.status === "pending" ? (
                          <button
                            type="button"
                            disabled={creating}
                            className="rounded-full border border-white/12 px-2.5 py-1 text-[10px] text-white/70 hover:bg-white/5 disabled:opacity-50"
                            onClick={() =>
                              w.streamId
                                ? setWorkerStatus(w.id, "dripping")
                                : createWorkerStream(w.id)
                            }
                          >
                            {w.streamId ? "Resume" : "Start"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="rounded-full border border-[#c0533a]/35 px-2.5 py-1 text-[10px] text-[#c0533a] hover:bg-[#c0533a]/10"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Remove ${w.alias} from the payroll run?`
                              )
                            ) {
                              deleteWorker(w.id);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 px-2 text-[11px] text-white/30">
          Claims are employee-side — recipients pull accrued pay themselves. Org
          controls are pause, resume, and remove.
        </p>
      </ProCard>
    </div>
  );
}
