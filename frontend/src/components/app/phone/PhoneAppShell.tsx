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
  const inWorkspace = route !== "launcher";

  return (
    <>
      <div className="flex shrink-0 items-center justify-between">
        <button
          type="button"
          onClick={() => inWorkspace && onNavigate("launcher")}
          disabled={!inWorkspace}
          className={`flex min-w-0 items-center gap-2 text-left ${
            inWorkspace ? "cursor-pointer" : "cursor-default"
          }`}
          aria-label={inWorkspace ? "Back to apps" : undefined}
        >
          <StreamLineMark size="sm" variant={isPro ? "pro" : "default"} />
          <span
            className={`truncate text-sm font-semibold tracking-tight ${
              isPro
                ? "font-[family-name:var(--font-inter)] text-white"
                : "font-bold text-[#111]"
            }`}
          >
            {isPro ? (
              <>
                streamline<span className="text-white/40">.pro</span>
              </>
            ) : (
              "Stream"
            )}
          </span>
        </button>
        <WalletButton
          className={
            isPro
              ? "sl-glass-btn-dark shrink-0 !px-2.5 !py-1 !text-[8px]"
              : "shrink-0 !bg-black/8 !px-2.5 !py-1 !text-[8px] !text-[#111] hover:!bg-black/12"
          }
        />
      </div>

      <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
        {route === "launcher" && <PhoneLauncher onOpen={onNavigate} />}
        {route === "user" && <PhoneUserApp />}
        {route === "pro" && <PhoneProApp />}
      </div>
    </>
  );
}
