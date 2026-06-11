"use client";

import { WalletButton } from "@/components/wallet/WalletButton";
import { StreamLineMark } from "@/components/landing/StreamLineMark";
import { PhoneLauncher } from "./PhoneLauncher";
import { PhoneUserApp } from "./PhoneUserApp";
import { PhoneProApp } from "./PhoneProApp";
import type { PhoneAppRoute } from "./types";

type PhoneAppShellProps = {
  route: PhoneAppRoute;
  onNavigate: (route: PhoneAppRoute) => void;
};

export function PhoneAppShell({ route, onNavigate }: PhoneAppShellProps) {
  const isPro = route === "pro";

  return (
    <>
      <div className="flex shrink-0 items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          {route !== "launcher" && (
            <button
              type="button"
              onClick={() => onNavigate("launcher")}
              className={`shrink-0 text-[10px] font-medium ${
                isPro ? "text-white/50" : "text-black/50"
              }`}
              aria-label="Back to apps"
            >
              ←
            </button>
          )}
          <StreamLineMark size="sm" variant={isPro ? "pro" : "default"} />
          <span
            className={`truncate text-sm font-semibold tracking-tight ${
              isPro
                ? "font-[family-name:var(--font-inter)] text-white"
                : "font-bold text-[#111]"
            }`}
          >
            streamline{isPro && <span className="text-white/40">.pro</span>}
          </span>
        </div>
        <WalletButton
          className={
            isPro
              ? "sl-glass-btn-dark shrink-0 !px-2.5 !py-1 !text-[8px]"
              : "shrink-0 !bg-black/8 !px-2.5 !py-1 !text-[8px] !text-[#111] hover:!bg-black/12"
          }
        />
      </div>

      {route === "launcher" && <PhoneLauncher onOpen={onNavigate} />}
      {route === "user" && (
        <PhoneUserApp onBack={() => onNavigate("launcher")} />
      )}
      {route === "pro" && (
        <PhoneProApp onBack={() => onNavigate("launcher")} />
      )}
    </>
  );
}
