"use client";

import type { ReactNode } from "react";

import type { PanelMode, ScenePanel, SceneTheme } from "./heroScenes";
import { StoreDownloadCard, type StorePlatform } from "./StoreSoonBadges";

type SceneTextPanelProps = {
  side: "left" | "right";
  content: ScenePanel;
  theme: SceneTheme;
  visible: boolean;
  panelMode?: PanelMode;
  storeCard?: StorePlatform;
  compact?: boolean;
};

const PANEL_W = "w-full max-w-[360px] min-h-[280px]";
const TILE_W = "w-full max-w-[min(100%,520px)]";
const TILE_W_COMPACT = "w-full flex-1 min-w-0";

function AccentText({
  children,
  isPro,
}: {
  children: ReactNode;
  isPro: boolean;
}) {
  return (
    <span
      className={`sl-shiny animate-shiny ${isPro ? "sl-shiny-dark" : ""}`}
    >
      {children}
    </span>
  );
}

export function SceneTextPanel({
  side,
  content,
  theme,
  visible,
  panelMode = "full",
  storeCard,
  compact,
}: SceneTextPanelProps) {
  const isPro = theme === "pro";
  const isTiles = panelMode === "tiles";

  if (storeCard) {
    return (
      <div
        className={`${PANEL_W} flex flex-col transition-all duration-500 ease-out ${
          side === "left"
            ? "items-center lg:items-end"
            : "items-center lg:items-start"
        } ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
      >
        <StoreDownloadCard
          store={storeCard}
          size={compact ? "sm" : "md"}
        />
      </div>
    );
  }

  if (isTiles) {
    return (
      <div
        className={`${compact ? TILE_W_COMPACT : TILE_W} transition-all duration-500 ease-out ${
          side === "left" && !compact ? "lg:ml-auto lg:text-right" : ""
        } ${side === "right" && !compact ? "lg:mr-auto lg:text-left" : ""} ${
          compact ? "text-center" : side === "left" ? "lg:text-right" : "lg:text-left"
        } ${visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
      >
        <p
          className={`inline-block font-semibold uppercase tracking-[0.2em] ${
            compact ? "text-[10px]" : "text-[10px] lg:text-[11px]"
          } ${isPro ? "text-white/45" : "text-black/40"}`}
        >
          {content.label}
        </p>
        <h2
          className={`font-semibold leading-[1.06] tracking-[-0.03em] ${
            compact
              ? "mt-1.5 text-[1.05rem]"
              : "mt-1 text-[clamp(2.25rem,4.5vw,3.9rem)] lg:mt-1.5"
          } ${isPro ? "font-medium text-white" : "font-bold text-[#111]"}`}
        >
          {content.headline}
          <br />
          <AccentText isPro={isPro}>{content.accent}</AccentText>
        </h2>
        {content.body && (
          <p
            className={`mt-3 max-w-[28ch] leading-[1.55] ${
              compact ? "text-[11px]" : "text-[12px] lg:mt-4 lg:text-[13px]"
            } ${side === "left" && !compact ? "lg:ml-auto" : ""} ${
              side === "right" && !compact ? "lg:mr-auto" : ""
            } ${isPro ? "text-white/50" : "text-black/45"}`}
          >
            {content.body}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`${PANEL_W} flex flex-col transition-all duration-500 ease-out ${
        side === "left"
          ? "items-center text-center lg:items-end lg:text-right"
          : "items-center text-center lg:items-start lg:text-left"
      } ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"} ${
        isPro ? "font-[family-name:var(--font-inter)]" : ""
      }`}
    >
      {content.label ? (
        <p
          className={`h-4 text-[10px] font-semibold uppercase tracking-[0.22em] ${
            isPro ? "text-white/50" : "text-black/40"
          }`}
        >
          {content.label}
        </p>
      ) : (
        <div className="h-0" aria-hidden />
      )}

      <h2
        className={`${content.label ? "mt-4" : "mt-0"} text-[1.625rem] font-semibold leading-[1.12] tracking-[-0.02em] lg:text-[1.75rem] ${
          isPro ? "font-medium text-white" : "font-bold text-[#111]"
        }`}
      >
        {content.headline}{" "}
        <AccentText isPro={isPro}>{content.accent}</AccentText>
      </h2>

      {!compact && (
        <p
          className={`mt-4 text-[13px] leading-[1.65] ${
            isPro ? "font-normal text-white/60" : "font-medium text-[#555]"
          }`}
        >
          {content.body}
        </p>
      )}

      {!compact && content.bullets.length > 0 && (
        <ul
          className={`mt-5 space-y-2 ${
            side === "left" ? "lg:text-right" : "lg:text-left"
          }`}
        >
          {content.bullets.map((b) => (
            <li
              key={b}
              className={`flex items-start gap-2 text-[12px] leading-snug ${
                side === "left" ? "lg:flex-row-reverse" : ""
              } ${isPro ? "text-white/45" : "text-[#666]"}`}
            >
              <span
                className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${
                  isPro ? "bg-white/40" : "bg-black/50"
                }`}
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      {content.metric && !compact && (
        <div
          className={`mt-5 inline-flex items-baseline gap-2 rounded-lg px-3 py-2 ${
            isPro
              ? "border border-white/10 bg-white/5"
              : "border border-black/10 bg-black/[0.03]"
          } ${side === "left" ? "lg:ml-auto" : ""}`}
        >
          <span
            className={`text-lg font-semibold tabular ${
              isPro ? "text-white" : "text-[#111]"
            }`}
          >
            {content.metric.value}
          </span>
          <span
            className={`text-[10px] uppercase tracking-wider ${
              isPro ? "text-white/40" : "text-[#888]"
            }`}
          >
            {content.metric.label}
          </span>
        </div>
      )}

    </div>
  );
}
