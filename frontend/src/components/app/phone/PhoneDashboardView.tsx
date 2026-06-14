"use client";

import type { ReactNode } from "react";

const SECTION_GAP = "mb-7";

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
    id: "transfer",
    label: "Transfer",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M7 17 17 7" />
        <path d="M7 7h10v10" />
      </svg>
    ),
  },
  {
    id: "withdraw",
    label: "Withdraw",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3v12" />
        <path d="m8 11 4 4 4-4" />
        <path d="M5 21h14" />
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
  amount: string;
  subtitle: string;
  progress?: number;
  empty?: boolean;
};

type PhoneDashboardViewProps = {
  macro: {
    label: string;
    amount: string;
    subtitle: string;
  };
  backCards: StreamCardData[];
  activity: readonly PhoneActivityItem[];
  onQuickAction?: (id: string) => void;
  onBackCardClick?: () => void;
  trailing?: ReactNode;
};

const BACK_OFFSETS = [
  { inset: "mx-5", top: 0, tone: "bg-white/38 border-white/30" },
  { inset: "mx-2", top: 24, tone: "bg-white/50 border-white/42" },
] as const;

function StreamCardFace({
  card,
  className = "",
  macro = false,
}: {
  card: StreamCardData;
  className?: string;
  macro?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-white/70 bg-white/88 p-4 shadow-[0_10px_32px_rgba(0,0,0,0.1)] backdrop-blur-md ${className}`}>
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
      {!card.empty && card.progress !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/8">
          <div
            className="h-full rounded-full bg-[#111] transition-[width] duration-300"
            style={{ width: `${Math.min(100, Math.max(4, card.progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function PhoneDashboardView({
  macro,
  backCards,
  activity,
  onQuickAction,
  onBackCardClick,
  trailing,
}: PhoneDashboardViewProps) {
  const layers = BACK_OFFSETS.map((layer, i) => ({
    ...layer,
    card: backCards[i] ?? {
      id: `empty-${i}`,
      label: "Empty stream",
      amount: "$0.00",
      subtitle: "No active stream",
      empty: true,
    },
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={`relative mx-0.5 ${SECTION_GAP}`}>
        {layers.map((layer, i) => (
          <button
            key={layer.card.id}
            type="button"
            onClick={onBackCardClick}
            className={`absolute inset-x-0 ${layer.inset} text-left transition-transform active:scale-[0.99]`}
            style={{ top: `${layer.top}px`, zIndex: i + 1 }}
          >
            <div
              className={`flex min-h-[88px] flex-col justify-start rounded-2xl border px-4 pt-3.5 shadow-[0_4px_16px_rgba(0,0,0,0.04)] backdrop-blur-md ${layer.tone}`}
            >
              <p
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  layer.card.empty ? "text-[#aaa]/70" : "text-[#666]/50"
                }`}
              >
                {layer.card.label}
              </p>
              {!layer.card.empty && (
                <>
                  <p className="mt-1 text-sm font-bold tabular-nums text-[#333]/80">
                    {layer.card.amount}
                  </p>
                  <p className="mt-0.5 text-[9px] text-[#666]/60">
                    {layer.card.subtitle}
                  </p>
                </>
              )}
            </div>
          </button>
        ))}

        <div className="relative z-10 mt-[54px]">
          <StreamCardFace
            macro
            card={{
              id: "macro",
              label: macro.label,
              amount: macro.amount,
              subtitle: macro.subtitle,
            }}
          />
        </div>
      </div>

      <div className={`grid grid-cols-3 gap-2 ${SECTION_GAP}`}>
        {PHONE_QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => onQuickAction?.(action.id)}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/80 bg-white px-1 py-3.5 shadow-[0_4px_16px_rgba(0,0,0,0.05)] backdrop-blur-md transition-colors hover:bg-white/95 active:scale-[0.98]"
          >
            <span className="flex h-8 w-8 items-center justify-center text-[#111]">
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
          {activity.map((item) => (
            <div
              key={`${item.time}-${item.text}`}
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
          ))}
        </div>
      </div>

      {trailing}
    </div>
  );
}
