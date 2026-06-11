import type { PanelMode, ScenePanel, SceneTheme } from "./heroScenes";
import { StoreSoonBadges } from "./StoreSoonBadges";

type SceneTextPanelProps = {
  side: "left" | "right";
  content: ScenePanel;
  theme: SceneTheme;
  visible: boolean;
  panelMode?: PanelMode;
  showLaunchCta?: boolean;
  onLaunchApp?: () => void;
  compact?: boolean;
};

const PANEL_W = "w-full max-w-[360px] min-h-[280px]";
const TILE_W = "w-full max-w-[min(100%,520px)]";
const TILE_W_COMPACT = "w-full flex-1 min-w-0";

export function SceneTextPanel({
  side,
  content,
  theme,
  visible,
  panelMode = "full",
  showLaunchCta,
  onLaunchApp,
  compact,
}: SceneTextPanelProps) {
  const isPro = theme === "pro";
  const isTiles = panelMode === "tiles";

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
          <span className={isPro ? "text-white/55" : "text-black/70"}>
            {content.accent}
          </span>
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
      {/* Fixed slot: label */}
      <p
        className={`h-4 text-[10px] font-semibold uppercase tracking-[0.22em] ${
          isPro ? "text-white/50" : "text-black/40"
        }`}
      >
        {content.label}
      </p>

      {/* Fixed slot: headline */}
      <h2
        className={`mt-4 text-[1.625rem] font-semibold leading-[1.12] tracking-[-0.02em] lg:text-[1.75rem] ${
          isPro ? "font-medium text-white" : "font-bold text-[#111]"
        }`}
      >
        {content.headline}{" "}
        <span className={isPro ? "text-white/55" : "text-black/70"}>
          {content.accent}
        </span>
      </h2>

      {/* Fixed slot: body */}
      {!compact && (
        <p
          className={`mt-4 text-[13px] leading-[1.65] ${
            isPro ? "font-normal text-white/60" : "font-medium text-[#555]"
          }`}
        >
          {content.body}
        </p>
      )}

      {/* Fixed slot: bullets */}
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

      {/* Fixed slot: metric */}
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

      {showLaunchCta && (
        <div
          className={`mt-6 flex flex-col gap-4 ${
            side === "left" ? "items-center lg:items-end" : "items-center lg:items-start"
          }`}
        >
          <StoreSoonBadges className="hidden lg:flex" />
          <button
            type="button"
            onClick={onLaunchApp}
            className="sl-glass-btn sl-glass-btn-primary"
          >
            Launch App →
          </button>
        </div>
      )}
    </div>
  );
}
