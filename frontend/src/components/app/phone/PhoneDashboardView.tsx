"use client";

import type { ReactNode } from "react";

const SECTION_GAP = "mb-5";

export const PHONE_QUICK_ACTIONS = [
  {
    id: "request",
    label: "Request",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    ),
  },
  {
    id: "create",
    label: "Create",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3v18" />
        <path d="M3 12h18" />
      </svg>
    ),
  },
  {
    id: "transfer",
    label: "Transfer",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M7 17 17 7" />
        <path d="M7 7h10v10" />
      </svg>
    ),
  },
] as const;

export type PhoneActivityItem = {
  time: string;
  text: string;
  amount: string | null;
};

export type StreamCardData = {
  id: string;
  label: string;
  empty?: boolean;
};

export type PhoneTopStat = {
  label: string;
  value: string;
};

type PhoneDashboardViewProps = {
  macro: {
    label: string;
    amount: string;
    subtitle: string;
  };
  backCards: StreamCardData[];
  topStats?: readonly PhoneTopStat[];
  activity: readonly PhoneActivityItem[];
  activityLoading?: boolean;
  onQuickAction?: (id: string) => void;
  onBackCardClick?: () => void;
  trailing?: ReactNode;
};

const BACK_OFFSETS = [
  { inset: "mx-5", top: 8, tone: "bg-white/38 border-white/30" },
  { inset: "mx-2", top: 32, tone: "bg-white/50 border-white/42" },
] as const;

function StreamCardFace({
  card,
  sideStats = [],
  className = "",
  macro = false,
}: {
  card: { label: string; amount: string; subtitle: string; empty?: boolean };
  sideStats?: readonly PhoneTopStat[];
  className?: string;
  macro?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-white/70 bg-white/88 p-4 shadow-[0_10px_32px_rgba(0,0,0,0.1)] backdrop-blur-md ${className}`}>
      <div className="flex items-stretch gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={`text-[10px] font-semibold uppercase tracking-wider ${
              card.empty ? "text-[#bbb]" : "text-[#888]"
            }`}
          >
            {card.label}
          </p>
          <p
            className={`mt-1.5 font-bold tabular-nums leading-none ${
              macro ? "text-[1.85rem]" : "text-[1.35rem]"
            } ${card.empty ? "text-[#ccc]" : "text-[#111]"}`}
          >
            {card.amount}
          </p>
          <p className="mt-2 text-[10px] font-medium leading-snug text-[#555]">
            {card.subtitle}
          </p>
        </div>
        {sideStats.length > 0 && (
          <div className="my-0.5 w-[34%] pl-2">
            <div className="flex h-full flex-col justify-center gap-2.5">
              {sideStats.map((stat) => (
                <div key={stat.label} className="text-right">
                  <p className="text-[10px] font-semibold tabular-nums text-[#111]">
                    {stat.value}
                  </p>
                  <p className="text-[7px] uppercase tracking-[0.14em] text-[#8a8a8a]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PhoneDashboardView({
  macro,
  backCards,
  topStats = [],
  activity,
  activityLoading = false,
  onQuickAction,
  onBackCardClick,
  trailing,
}: PhoneDashboardViewProps) {
  const layers = BACK_OFFSETS.map((layer, i) => ({
    ...layer,
    card: backCards[i] ?? {
      id: `empty-${i}`,
      label: "No stream",
      empty: true,
    },
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={`relative z-20 mx-0.5 mt-2 overflow-visible pb-2 ${SECTION_GAP}`}>
        {layers.map((layer, i) => (
          <button
            key={layer.card.id}
            type="button"
            onClick={onBackCardClick}
            className={`absolute inset-x-0 ${layer.inset} text-left transition-transform active:scale-[0.99]`}
            style={{ top: `${layer.top}px`, zIndex: i + 1 }}
          >
            <div
              className={`flex min-h-[52px] flex-col justify-center rounded-2xl border px-4 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.04)] backdrop-blur-md ${layer.tone}`}
            >
              <p
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  layer.card.empty ? "text-[#aaa]/70" : "text-[#666]/50"
                }`}
              >
                {i === 1 ? layer.card.label : ""}
              </p>
            </div>
          </button>
        ))}

        <div className="relative z-30 mt-[72px]">
          <StreamCardFace
            macro
            sideStats={topStats}
            card={{
              label: macro.label,
              amount: macro.amount,
              subtitle: macro.subtitle,
            }}
          />
        </div>
      </div>

      <div className={`mt-2 grid grid-cols-3 gap-2 ${SECTION_GAP}`}>
        {PHONE_QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => onQuickAction?.(action.id)}
            className="flex flex-col items-center gap-1 rounded-2xl border border-white/80 bg-white px-1 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.05)] backdrop-blur-md transition-colors hover:bg-white/95 active:scale-[0.98]"
          >
            <span className="flex h-6 w-6 items-center justify-center text-[#111]">
              {action.icon}
            </span>
            <span className="text-[9px] font-semibold tracking-wide text-[#111]">
              {action.label}
            </span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-white/50 bg-white/60 backdrop-blur-md">
        <p className="border-b border-black/6 px-3 py-2 text-[8px] font-semibold uppercase tracking-wider text-[#888]">
          Activity
        </p>
        <div className="divide-y divide-black/5">
          {activityLoading ? (
            <p className="px-3 py-3 text-[10px] text-[#999]">Loading…</p>
          ) : activity.length === 0 ? (
            <p className="px-3 py-3 text-[10px] text-[#999]">No activity yet</p>
          ) : (
            activity.map((item, i) => (
              <div
                key={`${item.time}-${item.text}-${i}`}
                className="flex items-center justify-between gap-2 px-3 py-2"
              >
              <div className="min-w-0">
                <p className="truncate text-[10px] font-medium text-[#111]">
                  {item.text}
                </p>
                <p className="text-[8px] text-[#999]">{item.time}</p>
              </div>
              {item.amount && (
                <p className="shrink-0 text-[10px] font-semibold tabular-nums text-[#111]">
                  {item.amount}
                </p>
              )}
            </div>
            ))
          )}
        </div>
      </div>

      {trailing}
    </div>
  );
}
