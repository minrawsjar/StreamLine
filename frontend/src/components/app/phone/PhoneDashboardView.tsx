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
    id: "gift",
    label: "Gift",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="8" width="18" height="13" rx="2" />
        <path d="M12 8v13" />
        <path d="M3 12h18" />
        <path d="M12 8c-1.5-3-4-4-4-4s1 2.5 4 4Z" />
        <path d="M12 8c1.5-3 4-4 4-4s-1 2.5-4 4Z" />
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
  amount?: string;
  subtitle?: string;
  meta?: string;
  isLive?: boolean;
  /** Dripping pay stream (outgoing) — live outflow styling */
  liveOutgoing?: boolean;
  /** Amount ticks down (remaining / net outflow) vs up */
  amountDecreasing?: boolean;
  empty?: boolean;
};

export type PhoneTopStat = {
  label: string;
  value: string;
  /** Net positive drip rate */
  live?: boolean;
  /** Net negative drip rate */
  negative?: boolean;
};

type PhoneDashboardViewProps = {
  cards: StreamCardData[];
  activeCardIndex?: number;
  topStats?: readonly PhoneTopStat[];
  activity: readonly PhoneActivityItem[];
  activityLoading?: boolean;
  /** Landing hero phone only — macro layout + subtitle under balance amount. */
  heroPreview?: boolean;
  onQuickAction?: (id: string) => void;
  onShiftCards?: () => void;
  onPrimaryCardClick?: () => void;
  onPrimaryCardDetails?: () => void;
  trailing?: ReactNode;
};

function isBalanceCard(card: StreamCardData) {
  return card.id === "macro" || card.id === "demo-macro";
}

const BACK_OFFSETS = [
  { inset: "mx-5", top: 6, tone: "bg-white/38 border-white/30" },
  { inset: "mx-2", top: 22, tone: "bg-white/50 border-white/42" },
] as const;

function StreamCardFace({
  card,
  belowStats = [],
  className = "",
  primary = false,
  amountLive = false,
  liveOutgoing = false,
  amountDecreasing = false,
  macroSubtitle = false,
  onDetails,
}: {
  card: StreamCardData;
  belowStats?: readonly PhoneTopStat[];
  className?: string;
  /** Front / active card — same size and type scale as total balance */
  primary?: boolean;
  amountLive?: boolean;
  liveOutgoing?: boolean;
  amountDecreasing?: boolean;
  macroSubtitle?: boolean;
  onDetails?: () => void;
}) {
  const isBalance = card.id === "macro" || card.id === "demo-macro";
  const isStream = !isBalance && !card.empty;
  const liveUp = amountLive && !amountDecreasing && !isBalance;
  const liveDown = amountLive && amountDecreasing && !isBalance;
  const showFooter = primary && (belowStats.length > 0 || (isStream && card.meta) || macroSubtitle);

  return (
    <div
      className={`rounded-2xl border border-white/70 bg-white/88 p-4 shadow-[0_10px_32px_rgba(0,0,0,0.1)] backdrop-blur-md ${
        primary ? "min-h-[7.875rem] flex flex-col" : ""
      } ${className}`}
    >
      <div className={`min-w-0 ${primary ? "flex flex-1 flex-col" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p
              className={`text-[10px] font-semibold uppercase tracking-wider ${
                card.empty ? "text-[#bbb]" : "text-[#888]"
              }`}
            >
              {card.label}
            </p>
            {isStream && card.subtitle && !amountLive && !primary && (
              <p
                className={`mt-1 inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.08em] ${
                  liveDown || liveOutgoing
                    ? "text-[#c0533a]"
                    : liveUp
                      ? "text-[#1d9e75]"
                      : "text-[#666]"
                }`}
              >
                {amountLive && (
                  <span
                    className={`h-1.5 w-1.5 animate-pulse rounded-full ${
                      liveDown || liveOutgoing ? "bg-[#c0533a]" : "bg-[#1d9e75]"
                    }`}
                    aria-hidden
                  />
                )}
                {card.subtitle}
              </p>
            )}
          </div>
          {!!onDetails && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDetails();
              }}
              className="shrink-0 text-[8px] font-semibold uppercase tracking-[0.14em] text-[#666]"
            >
              Details
            </button>
          )}
        </div>
        <p
          className={`mt-3 font-bold tabular-nums leading-none transition-[color] duration-300 ${
            primary ? "text-[1.85rem]" : "text-[1.35rem]"
          } ${
            card.empty
              ? "text-[#ccc]"
              : liveDown
                ? "text-[#9a3b28]"
                : liveUp
                  ? "text-[#1a5c38]"
                  : "text-[#111]"
          }`}
        >
          {card.amount ?? "$0.00"}
        </p>
        {primary && (
          <div className={`mt-auto pt-3 ${showFooter ? "" : "min-h-[1.25rem]"}`}>
            {belowStats.length > 0 && (
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                {belowStats.map((stat) => (
                  <div key={stat.label} className="flex items-baseline gap-1.5">
                    <span className="text-[7px] uppercase tracking-[0.14em] text-[#8a8a8a]">
                      {stat.label}
                    </span>
                    <span
                      className={`text-[10px] font-semibold tabular-nums ${
                        stat.negative
                          ? "text-[#9a3b28]"
                          : stat.live
                            ? "text-[#1a5c38]"
                            : "text-[#111]"
                      }`}
                    >
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {macroSubtitle && card.subtitle && (
              <p className="text-[10px] font-medium leading-snug text-[#555]">
                {card.subtitle}
              </p>
            )}
            {isStream && card.meta && belowStats.length === 0 && (
              <p className="text-[9px] font-medium leading-snug tracking-wide text-[#888]">
                {card.meta}
              </p>
            )}
          </div>
        )}
        {!primary && isStream && card.meta && (
          <p className="mt-2 text-[9px] font-medium tracking-wide text-[#888]">
            {card.meta}
          </p>
        )}
      </div>
    </div>
  );
}

function StackCardPeek({ card }: { card: StreamCardData }) {
  if (card.empty) return null;
  const isLive = !!card.isLive;
  const decreasing = !!card.amountDecreasing || !!card.liveOutgoing;
  return (
  <>
    <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-[#666]/80">
      {card.label}
    </p>
    {card.amount && (
      <p
        className={`mt-1 text-[13px] font-bold tabular-nums leading-none ${
          isLive
            ? decreasing
              ? "text-[#c0533a]/70"
              : "text-[#1d9e75]/70"
            : "text-[#111]/45"
        }`}
      >
        {card.amount}
      </p>
    )}
  </>
  );
}

export function PhoneDashboardView({
  cards,
  activeCardIndex = 0,
  topStats = [],
  activity,
  activityLoading = false,
  heroPreview = false,
  onQuickAction,
  onShiftCards,
  onPrimaryCardClick,
  onPrimaryCardDetails,
  trailing,
}: PhoneDashboardViewProps) {
  const normalizedCards = cards.length
    ? cards
    : [{ id: "macro-empty", label: "Total balance", amount: "$0.00", subtitle: "" }];
  const n = normalizedCards.length;
  const active = ((activeCardIndex % n) + n) % n;
  const mainCard = normalizedCards[active];
  const peekNext = n > 1 ? normalizedCards[(active + 1) % n] : null;
  const decorativeCard: StreamCardData = {
    id: "decorative",
    label: "",
    empty: true,
  };
  const layers = BACK_OFFSETS.map((layer, i) => ({
    ...layer,
    card: i === 1 && peekNext ? peekNext : decorativeCard,
    clickable: i === 1 && n > 1,
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-visible">
      <div className={`relative z-20 mt-2 shrink-0 overflow-visible pb-3 ${SECTION_GAP}`}>
        {layers.map((layer, i) => {
          const inner = (
            <div
              className={`flex min-h-[7.875rem] flex-col justify-start rounded-2xl border p-4 shadow-[0_4px_16px_rgba(0,0,0,0.04)] backdrop-blur-md ${layer.tone}`}
            >
              <StackCardPeek card={layer.card} />
            </div>
          );
          return layer.clickable ? (
            <button
              key={`back-${i}-${layer.card.id}`}
              type="button"
              onClick={() => onShiftCards?.()}
              className={`absolute inset-x-0 ${layer.inset} text-left transition-transform active:scale-[0.99]`}
              style={{ top: `${layer.top}px`, zIndex: i + 1 }}
            >
              {inner}
            </button>
          ) : (
            <div
              key={`back-${i}-decorative`}
              className={`pointer-events-none absolute inset-x-0 ${layer.inset}`}
              style={{ top: `${layer.top}px`, zIndex: i + 1 }}
              aria-hidden
            >
              {inner}
            </div>
          );
        })}

        <div
          role="button"
          tabIndex={0}
          onClick={onPrimaryCardClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onPrimaryCardClick?.();
            }
          }}
          className="relative z-30 mt-[56px] block w-full cursor-pointer text-left"
        >
          <StreamCardFace
            primary
            macroSubtitle={heroPreview && isBalanceCard(mainCard)}
            amountLive={!isBalanceCard(mainCard) && !!mainCard.isLive}
            liveOutgoing={!isBalanceCard(mainCard) && !!mainCard.liveOutgoing}
            amountDecreasing={!isBalanceCard(mainCard) && !!mainCard.amountDecreasing}
            onDetails={onPrimaryCardDetails}
            belowStats={isBalanceCard(mainCard) ? topStats : []}
            card={mainCard}
          />
        </div>
      </div>

      <div className="sl-scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
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
    </div>
  );
}
