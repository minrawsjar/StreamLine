"use client";

import { StreamLineMark } from "@/components/landing/StreamLineMark";
import type { PhoneAppRoute } from "./types";

type IconKind = "user" | "pro" | "lazy" | "shield" | "hidden";

const APPS: {
  route: PhoneAppRoute;
  label: string;
  sublabel: string;
  icon: IconKind;
}[] = [
  { route: "user", label: "Wallet", sublabel: "Personal", icon: "user" },
  { route: "pro", label: "Business", sublabel: "Payroll", icon: "pro" },
  { route: "lazy", label: "Lazy", sublabel: "Private streams", icon: "lazy" },
  { route: "shielded", label: "Shield", sublabel: "Shielded pool", icon: "shield" },
  { route: "confidential", label: "Hidden", sublabel: "Confidential", icon: "hidden" },
];

/** Distinct tile per app — flagship apps branded (white / dark), the three
 * privacy tools grouped by a colored gradient so they read as a family. */
const TILE: Record<IconKind, string> = {
  user: "border border-black/8 bg-white",
  pro: "border border-white/12 bg-[#141414]",
  lazy: "bg-gradient-to-br from-[#6d63f2] to-[#4c46e0]",
  shield: "bg-gradient-to-br from-[#14b8a6] to-[#0d9488]",
  hidden: "bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9]",
};

function Glyph({ icon }: { icon: IconKind }) {
  if (icon === "user")
    return <StreamLineMark size="sm" variant="default" className="!h-8 !w-8" />;
  if (icon === "pro")
    return <StreamLineMark size="sm" variant="pro" className="!h-8 !w-8" />;

  const svg = "h-7 w-7 text-white";
  const stroke = {
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (icon === "lazy")
    return (
      <svg viewBox="0 0 24 24" className={svg} {...stroke}>
        <path d="M7 3h10M7 21h10M7 3l5 6 5-6M7 21l5-6 5 6" />
      </svg>
    );
  if (icon === "shield")
    return (
      <svg viewBox="0 0 24 24" className={svg} {...stroke}>
        <path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z" />
        <path d="M9.2 12l1.9 1.9 3.7-3.9" />
      </svg>
    );
  // hidden — eye-off
  return (
    <svg viewBox="0 0 24 24" className={svg} {...stroke}>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 002.8 2.8" />
      <path d="M9.5 5.2A9.6 9.6 0 0112 5c5.5 0 9 5 9 7a12 12 0 01-2.2 3M6 6.3C3.8 7.7 2.4 9.9 2 12c.6 2 4 7 10 7a10 10 0 003-.5" />
    </svg>
  );
}

type PhoneLauncherProps = {
  onOpen: (route: PhoneAppRoute) => void;
};

export function PhoneLauncher({ onOpen }: PhoneLauncherProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col pt-6">
      <p className="mb-4 px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9aa0a6]">
        Your apps
      </p>
      <div className="grid grid-cols-3 gap-x-3 gap-y-5">
        {APPS.map((app) => (
          <button
            key={app.route}
            type="button"
            onClick={() => onOpen(app.route)}
            className="group flex flex-col items-center gap-2 text-center"
          >
            <div
              className={`flex h-[58px] w-[58px] items-center justify-center rounded-[18px] shadow-[0_6px_18px_rgba(0,0,0,0.12)] transition-transform duration-200 group-hover:scale-105 group-active:scale-95 ${TILE[app.icon]}`}
            >
              <Glyph icon={app.icon} />
            </div>
            <div className="leading-tight">
              <p className="text-[11px] font-semibold text-[#111]">{app.label}</p>
              <p className="text-[9px] font-medium text-[#9aa0a6]">
                {app.sublabel}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
