"use client";

import { useMemo, useState } from "react";

import { shortAddress } from "@/lib/format";
import { useProWorkspace } from "../ProWorkspaceContext";
import { fmtUsd, groupCommitted, type ProWorkerStatus } from "../types";
import { ProCard, ProEyebrow, ProStat, StatusPill } from "../ui";

const FILTERS: { id: "all" | ProWorkerStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "dripping", label: "Streaming" },
  { id: "paused", label: "Paused" },
  { id: "pending", label: "Pending" },
  { id: "stopped", label: "Stopped" },
];

export function PeopleScreen() {
  const { workspace, setModal } = useProWorkspace();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ProWorkerStatus>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workspace.workers.filter((w) => {
      if (status !== "all" && w.status !== status) return false;
      if (groupFilter !== "all" && w.groupId !== groupFilter) return false;
      if (!q) return true;
      return (
        w.alias.toLowerCase().includes(q) ||
        w.walletAddress.toLowerCase().includes(q)
      );
    });
  }, [workspace.workers, query, status, groupFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <ProEyebrow>People</ProEyebrow>
          <h1 className="mt-2 text-[clamp(26px,3.5vw,36px)] font-semibold tracking-tight text-white">
            Roster & stream groups
          </h1>
          <p className="mt-1 max-w-xl text-[13px] text-white/45">
            Stream groups are labels for the team. Rates live on each recipient;
            funding still hits the single org pool.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="sl-glass-btn-dark !px-4 !py-2 !text-[11px]"
            onClick={() => setModal("group")}
          >
            New group
          </button>
          <button
            type="button"
            className="sl-glass-btn-dark sl-glass-btn-dark-primary !px-4 !py-2 !text-[11px]"
            onClick={() => setModal("worker")}
          >
            Add substream
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ProStat
          label="Recipients"
          value={String(workspace.workers.length)}
          hint={`${workspace.workers.filter((w) => w.status === "dripping").length} streaming`}
        />
        <ProStat
          label="Stream groups"
          value={String(workspace.groups.length)}
        />
        <ProStat
          label="Monthly payroll"
          value={fmtUsd(
            workspace.workers.reduce((s, w) => s + w.monthlyUsd, 0),
            0
          )}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {workspace.groups.map((g) => {
          const members = workspace.workers.filter((w) => w.groupId === g.id);
          return (
            <ProCard key={g.id} padding="sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[14px] font-medium text-white">{g.name}</p>
                  <p className="mt-0.5 text-[11px] text-white/40">
                    {g.description || `${members.length} people`}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-[10px] uppercase tracking-wider text-white/35 hover:text-white"
                  onClick={() =>
                    setModal({ kind: "group-edit", groupId: g.id })
                  }
                >
                  Edit
                </button>
              </div>
              <p className="mt-3 text-[18px] font-semibold tabular text-white">
                {fmtUsd(groupCommitted(workspace, g.id), 0)}
                <span className="text-[12px] font-normal text-white/35">
                  /mo
                </span>
              </p>
              <p className="mt-1 text-[11px] text-white/35">
                {members.length} substream{members.length === 1 ? "" : "s"}
              </p>
            </ProCard>
          );
        })}
      </div>

      <ProCard padding="sm">
        <div className="flex flex-wrap items-center gap-2 px-1.5 pb-3 pt-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or wallet"
            className="min-w-[180px] flex-1 rounded-full border border-white/12 bg-white/[0.04] px-3 py-2 text-[12px] text-white outline-none placeholder:text-white/25"
          />
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-2 text-[12px] text-white outline-none"
          >
            <option value="all">All groups</option>
            {workspace.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatus(f.id)}
                className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider ${
                  status === f.id
                    ? "bg-white text-[#0a0a0a]"
                    : "border border-white/10 text-white/45 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.14em] text-white/35">
                <th className="px-2 py-2 font-medium">Name</th>
                <th className="px-2 py-2 font-medium">Group</th>
                <th className="px-2 py-2 font-medium">Rate</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium text-right"> </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => {
                const group = workspace.groups.find((g) => g.id === w.groupId);
                return (
                  <tr
                    key={w.id}
                    className="border-b border-white/5 last:border-0"
                  >
                    <td className="px-2 py-3">
                      <p className="font-medium text-white">{w.alias}</p>
                      <p className="text-[11px] text-white/35">
                        {shortAddress(w.walletAddress)}
                      </p>
                    </td>
                    <td className="px-2 py-3 text-white/70">
                      {group?.name ?? "—"}
                    </td>
                    <td className="px-2 py-3 tabular text-white/80">
                      {fmtUsd(w.monthlyUsd, 0)}/mo
                    </td>
                    <td className="px-2 py-3">
                      <StatusPill status={w.status} />
                    </td>
                    <td className="px-2 py-3 text-right">
                      <button
                        type="button"
                        className="text-[11px] text-white/40 hover:text-white"
                        onClick={() =>
                          setModal({ kind: "worker-edit", workerId: w.id })
                        }
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-2 py-8 text-center text-[13px] text-white/35"
                  >
                    No recipients match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </ProCard>
    </div>
  );
}
