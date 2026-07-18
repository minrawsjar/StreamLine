"use client";

import { StreamLineMark } from "@/components/landing/StreamLineMark";
import type { PhoneAppRoute } from "./types";

const APPS: {
  route: PhoneAppRoute;
  label: string;
  sublabel?: string;
  pro?: boolean;
}[] = [
  { route: "user", label: "StreamLine" },
  { route: "pro", label: "StreamLine", sublabel: "Pro", pro: true },
];

type PhoneLauncherProps = {
  onOpen: (route: PhoneAppRoute) => void;
};

export function PhoneLauncher({ onOpen }: PhoneLauncherProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col pt-8">
      <div className="grid w-full grid-cols-3 gap-4">
        {APPS.map((app) => (
          <button
            key={app.route}
            type="button"
            onClick={() => onOpen(app.route)}
            className="group flex flex-col items-center gap-2 text-center"
          >
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-transform group-hover:scale-105 group-active:scale-95 ${
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
