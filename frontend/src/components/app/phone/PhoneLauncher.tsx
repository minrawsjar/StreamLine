"use client";

import { useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";

import { WalletButton } from "@/components/wallet/WalletButton";
import { StreamLineMark } from "@/components/landing/StreamLineMark";
import type { PhoneAppRoute } from "./types";

const APPS: {
  route: PhoneAppRoute;
  label: string;
  sublabel?: string;
  pro?: boolean;
  disabled?: boolean;
}[] = [
  { route: "user", label: "StreamLine" },
  { route: "pro", label: "StreamLine", sublabel: "Pro", pro: true, disabled: true },
];

type PhoneLauncherProps = {
  onOpen: (route: PhoneAppRoute) => void;
};

export function PhoneLauncher({ onOpen }: PhoneLauncherProps) {
  const account = useCurrentAccount();
  const [shaking, setShaking] = useState<PhoneAppRoute | null>(null);

  const handleAppClick = (route: PhoneAppRoute, disabled?: boolean) => {
    if (disabled) {
      setShaking(route);
      window.setTimeout(() => setShaking(null), 450);
      return;
    }
    onOpen(route);
  };

  if (!account) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 text-center">
        <StreamLineMark size="lg" className="!h-11 !w-11" />
        <p className="mt-5 text-[9px] font-semibold uppercase tracking-[0.2em] text-black/45">
          StreamLine
        </p>
        <h2 className="mt-2 text-base font-bold leading-tight tracking-tight text-[#111]">
          Connect wallet
        </h2>
        <WalletButton className="sl-glass-btn sl-glass-btn-primary mt-5 !px-4 !py-2 !text-[9px]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col pt-8">
      <div className="grid w-full grid-cols-3 gap-4">
        {APPS.map((app) => (
          <button
            key={app.route}
            type="button"
            onClick={() => handleAppClick(app.route, app.disabled)}
            className="group flex flex-col items-center gap-2 text-center"
          >
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-transform group-active:scale-95 ${
                shaking === app.route ? "animate-sl-shake" : ""
              } ${
                app.pro
                  ? "border border-white/12 bg-[#141414]"
                  : "border border-white/70 bg-white"
              }`}
            >
              <StreamLineMark
                size="sm"
                variant={app.pro ? "pro" : "default"}
                className="!h-8 !w-8"
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold leading-tight text-[#111]">
                {app.label}
              </p>
              {app.sublabel && (
                <p className="text-[9px] font-medium leading-tight text-[#888]">
                  {app.sublabel}
                </p>
              )}
            </div>
          </button>
        ))}
        <div aria-hidden className="h-14 w-14" />
      </div>
    </div>
  );
}
