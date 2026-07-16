"use client";

import { requestProAction, type ProHeaderAction } from "./pro-actions";

const ACTIONS: { id: ProHeaderAction; label: string }[] = [
  { id: "fund", label: "Fund" },
  { id: "withdraw", label: "Withdraw" },
  { id: "invest", label: "Allocate" },
];

export function ProActionButtons({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className={`flex flex-wrap items-center ${compact ? "gap-1" : "gap-1.5"}`}>
        {ACTIONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => requestProAction(id)}
            className={`sl-glass-btn-dark transition-colors ${
              id === "fund" ? "sl-glass-btn-dark-primary" : ""
            } ${compact ? "!px-2 !py-1 !text-[7px]" : "!px-3 !py-1.5 !text-[9px]"}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Title used in AppChrome + phone shell. Kept name for import stability. */
export function ProTitleWithDemo({
  compact = false,
  title = "StreamLine",
}: {
  compact?: boolean;
  title?: string;
}) {
  return (
    <div className={`flex min-w-0 items-center ${compact ? "gap-1.5" : "gap-2"}`}>
      <span
        className={`truncate font-semibold tracking-tight text-white ${
          compact ? "text-sm" : "text-[14px] font-bold tracking-[-0.02em]"
        }`}
      >
        {title}
        <span className="font-medium text-white/40">.pro</span>
      </span>
    </div>
  );
}
