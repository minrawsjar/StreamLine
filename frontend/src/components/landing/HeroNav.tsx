"use client";

import Link from "next/link";
import { WalletButton } from "@/components/wallet/WalletButton";
import { StreamLineMark } from "./StreamLineMark";
import type { SceneTheme } from "./heroScenes";

type HeroNavProps = {
  onSceneSelect?: (index: number) => void;
  theme?: SceneTheme;
};

export function HeroNav({ onSceneSelect, theme = "light" }: HeroNavProps) {
  const isPro = theme === "pro";

  return (
    <nav
      className={`relative z-20 flex shrink-0 items-center justify-between px-[5%] py-5 transition-colors duration-700 ${
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

      <ul className="flex list-none items-center gap-2.5">
        <li className="hidden min-[419px]:block">
          <button
            type="button"
            className={isPro ? "sl-glass-btn-dark" : "sl-glass-btn"}
            onClick={() => onSceneSelect?.(2)}
          >
            How it works
          </button>
        </li>
        <li className="hidden md:block">
          <WalletButton
            className={isPro ? "sl-glass-btn-dark" : "sl-glass-btn"}
          />
        </li>
        <li>
          <Link
            href="/app"
            className={
              isPro
                ? "sl-glass-btn-dark sl-glass-btn-dark-primary"
                : "sl-glass-btn sl-glass-btn-primary"
            }
          >
            {isPro ? "Request demo" : "Launch App"}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
