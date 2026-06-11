import Link from "next/link";
import type { ScenePanel, SceneTheme } from "./heroScenes";
import { StoreSoonBadges } from "./StoreSoonBadges";

type SceneTextPanelProps = {
  side: "left" | "right";
  content: ScenePanel;
  theme: SceneTheme;
  visible: boolean;
  showLaunchCta?: boolean;
  compact?: boolean;
};

const PANEL_W = "w-full max-w-[360px] min-h-[280px]";

export function SceneTextPanel({
  side,
  content,
  theme,
  visible,
  showLaunchCta,
  compact,
}: SceneTextPanelProps) {
  const isPro = theme === "pro";

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
          isPro ? "text-white/50" : "text-[#1a9e8f]"
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
        <span className={isPro ? "text-[#c8d4d2]" : "text-[#1a9e8f]"}>
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
                  isPro ? "bg-white/40" : "bg-[#1a9e8f]"
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
              : "border border-[#1a9e8f]/15 bg-[#1a9e8f]/5"
          } ${side === "left" ? "lg:ml-auto" : ""}`}
        >
          <span
            className={`text-lg font-semibold tabular ${
              isPro ? "text-white" : "text-[#1a9e8f]"
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
          <Link href="/app" className="sl-glass-btn sl-glass-btn-primary">
            Launch App →
          </Link>
        </div>
      )}
    </div>
  );
}
