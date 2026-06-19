"use client";

import {
  groupBudget,
  groupDripRate,
  remainingBalance,
  type ProStreamGroup,
} from "./types";

function fmtUsd(n: number, decimals = 0) {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

type ProGroupCardProps = {
  group: ProStreamGroup;
  tick: number;
  expanded: boolean;
  compact?: boolean;
  onToggle: () => void;
  onEditGroup: () => void;
  onAddSubstream: () => void;
  onEditSubstream: (substreamId: string) => void;
};

export function ProGroupCard({
  group,
  tick,
  expanded,
  compact = false,
  onToggle,
  onEditGroup,
  onAddSubstream,
  onEditSubstream,
}: ProGroupCardProps) {
  const committed = groupBudget(group);
  const remaining = group.substreams.reduce(
    (sum, s) => sum + remainingBalance(s, tick),
    0
  );
  const drip = groupDripRate(group);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04]">
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-start justify-between gap-3 text-left ${
          compact ? "px-3 py-3" : "px-5 py-4"
        }`}
      >
        <div className="min-w-0">
          <p className={`font-medium text-white ${compact ? "text-[11px]" : "text-sm"}`}>
            {group.name}
          </p>
          <p className={`mt-0.5 text-white/35 ${compact ? "text-[9px]" : "text-[11px]"}`}>
            {group.substreams.length} substream
            {group.substreams.length === 1 ? "" : "s"}
            {group.description ? ` · ${group.description}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={`font-semibold tabular text-white ${
              compact ? "text-[11px]" : "text-base"
            }`}
          >
            {fmtUsd(remaining, remaining % 1 ? 2 : 0)}
          </p>
          <p className={`tabular text-white/40 ${compact ? "text-[8px]" : "text-[10px]"}`}>
            {drip > 0 ? `${drip.toFixed(1)}/sec` : "idle"}
          </p>
        </div>
      </button>

      {expanded && (
        <div
          className={`border-t border-white/10 ${
            compact ? "space-y-2 px-3 py-3" : "space-y-2 px-5 py-4"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className={`text-white/35 ${compact ? "text-[8px]" : "text-[10px]"}`}>
              Committed {fmtUsd(committed)} · Remaining {fmtUsd(remaining, 2)}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onEditGroup}
                className={`font-medium text-white/50 hover:text-white/80 ${
                  compact ? "text-[8px]" : "text-[10px]"
                }`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onAddSubstream}
                className={`font-medium text-[#1d9e75] hover:text-[#2bb88a] ${
                  compact ? "text-[8px]" : "text-[10px]"
                }`}
              >
                + Substream
              </button>
            </div>
          </div>

          {group.substreams.length === 0 ? (
            <p
              className={`rounded-lg bg-white/[0.03] px-3 py-4 text-center text-white/35 ${
                compact ? "text-[9px]" : "text-[11px]"
              }`}
            >
              No substreams yet. Add members, vendors, or individual pay runs.
            </p>
          ) : (
            group.substreams.map((substream) => {
              const balance = remainingBalance(substream, tick);
              return (
                <button
                  key={substream.id}
                  type="button"
                  onClick={() => onEditSubstream(substream.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg bg-white/[0.03] text-left transition-colors hover:bg-white/[0.06] ${
                    compact ? "px-2 py-2" : "px-3 py-2.5"
                  }`}
                >
                  <div className="min-w-0">
                    <p
                      className={`truncate font-medium text-white/80 ${
                        compact ? "text-[10px]" : "text-[12px]"
                      }`}
                    >
                      {substream.name}
                    </p>
                    <p className={`text-white/30 ${compact ? "text-[8px]" : "text-[9px]"}`}>
                      {substream.status}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`font-semibold tabular text-white/70 ${
                        compact ? "text-[10px]" : "text-[12px]"
                      }`}
                    >
                      {fmtUsd(balance, 2)}
                    </p>
                    <p className={`tabular text-white/35 ${compact ? "text-[8px]" : "text-[9px]"}`}>
                      {substream.status === "dripping"
                        ? `${substream.dripPerSec}/sec`
                        : "—"}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
