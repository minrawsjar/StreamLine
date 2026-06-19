"use client";

import { useState } from "react";

export function ProDemoBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-full border border-[#1d9e75]/30 bg-[#1d9e75]/10 font-semibold uppercase tracking-wider text-[#1d9e75] ${
        compact ? "px-1.5 py-px text-[7px]" : "px-2 py-0.5 text-[8px]"
      }`}
    >
      Demo
    </span>
  );
}

type ProAction = "fund" | "withdraw" | "analytics";

const ACTIONS: { id: ProAction; label: string }[] = [
  { id: "fund", label: "Fund" },
  { id: "withdraw", label: "Withdraw" },
  { id: "analytics", label: "Analytics" },
];

const DEMO_MESSAGES: Record<ProAction, string> = {
  fund: "Demo: fund payroll capital from treasury or wallet.",
  withdraw: "Demo: withdraw unused committed balance.",
  analytics: "Demo: pay run analytics, drip rates, and yield reports.",
};

export function ProActionButtons({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const [active, setActive] = useState<ProAction | null>(null);

  return (
    <div className={className}>
      <div className={`flex flex-wrap items-center ${compact ? "gap-1" : "gap-1.5"}`}>
        {ACTIONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActive((prev) => (prev === id ? null : id))}
            className={`sl-glass-btn-dark transition-colors ${
              active === id ? "sl-glass-btn-dark-primary" : ""
            } ${compact ? "!px-2 !py-1 !text-[7px]" : "!px-3 !py-1.5 !text-[9px]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {active && (
        <p
          className={`mt-2 text-[#1d9e75] ${
            compact ? "text-[8px] leading-snug" : "text-[10px] leading-relaxed"
          }`}
        >
          {DEMO_MESSAGES[active]}
        </p>
      )}
    </div>
  );
}

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
      <ProDemoBadge compact={compact} />
    </div>
  );
}
