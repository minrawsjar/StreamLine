"use client";

import Link from "next/link";

import { StreamLineMark } from "./StreamLineMark";
import { HERO_LAYOUT_MAX_CLASS } from "./heroLayout";
import type { SceneTheme } from "./heroScenes";

type HeroNavProps = {
  theme?: SceneTheme;
  inApp?: boolean;
  onLaunchApp?: () => void;
  onBackToMain?: () => void;
};

export function HeroNav({
  theme = "light",
  inApp = false,
  onLaunchApp,
  onBackToMain,
}: HeroNavProps) {
  const isPro = theme === "pro";

  return (
    <nav
      className={`relative z-20 mx-auto flex w-full ${HERO_LAYOUT_MAX_CLASS} shrink-0 items-center justify-between px-8 py-5 transition-colors duration-700 ${
        isPro ? "font-[family-name:var(--font-inter)]" : ""
      }`}
    >
      <Link href="/#top" className="flex items-center gap-3">
        <StreamLineMark size="md" variant={isPro ? "pro" : "default"} />
        <span
          className={`text-lg font-semibold tracking-tight transition-colors duration-700 ${
            isPro ? "text-white" : "text-[#111]"
          }`}
        >
          StreamLine
          {isPro && (
            <span className="ml-1 text-sm font-medium text-white/40">.pro</span>
          )}
        </span>
      </Link>

      <button
        type="button"
        onClick={inApp ? onBackToMain : onLaunchApp}
        className={`font-semibold ${
          isPro
            ? "sl-glass-btn-dark sl-glass-btn-dark-primary"
            : "sl-glass-btn sl-glass-btn-primary"
        }`}
      >
        {inApp ? "Back to main" : "Start App"}
      </button>
    </nav>
  );
}
