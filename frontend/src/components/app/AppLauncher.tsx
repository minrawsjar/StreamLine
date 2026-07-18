"use client";

import Link from "next/link";
import { useCurrentAccount } from "@mysten/dapp-kit";

import { WalletButton } from "@/components/wallet/WalletButton";
import { StreamLineMark } from "@/components/landing/StreamLineMark";

const APPS = [
  {
    href: "/app/user",
    name: "StreamLine",
    subtitle: "User",
    description: "Earn, drip, milestones",
    variant: "default" as const,
  },
  {
    href: "/app/pro",
    name: "StreamLine",
    proSuffix: true,
    subtitle: "Business",
    description: "Payroll & contractor ops",
    variant: "pro" as const,
  },
  {
    href: "/app/lazy",
    name: "StreamLine",
    subtitle: "Lazy",
    description: "Private streams, one-proof settle",
    variant: "default" as const,
  },
  {
    href: "/app/shielded",
    name: "StreamLine",
    subtitle: "Shield",
    description: "Deposit, transfer & withdraw privately",
    variant: "default" as const,
  },
];

function ConnectGate() {
  return (
    <div className="flex min-h-[calc(100dvh-57px)] flex-col items-center justify-center px-6 text-center">
      <StreamLineMark size="lg" />
      <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.24em] text-black/45">
        StreamLine workspace
      </p>
      <h1 className="mt-3 max-w-md text-[clamp(26px,5vw,40px)] font-bold leading-[1.05] tracking-[-0.03em] text-[#111]">
        Connect your wallet to open apps
      </h1>
      <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-[#555]">
        Sign in with a Sui wallet or Google. Your apps and streams stay tied to
        this account.
      </p>
      <div className="mt-8">
        <WalletButton className="sl-glass-btn sl-glass-btn-primary !px-8 !py-3 !text-[11px]" />
      </div>
    </div>
  );
}

function AppIcon({ app }: { app: (typeof APPS)[number] }) {
  const isPro = app.variant === "pro";

  return (
    <Link
      href={app.href}
      className="group flex flex-col items-center gap-2.5 text-center"
    >
      <div
        className={`flex h-[72px] w-[72px] items-center justify-center rounded-[18px] shadow-[0_8px_28px_rgba(0,0,0,0.12)] transition-transform duration-300 group-hover:scale-105 group-active:scale-95 md:h-[84px] md:w-[84px] md:rounded-[22px] ${
          isPro
            ? "border border-white/12 bg-[#141414]"
            : "border border-white/80 bg-white"
        }`}
      >
        <StreamLineMark
          size="md"
          variant={isPro ? "pro" : "default"}
          className="!h-11 !w-11 md:!h-12 md:!w-12"
        />
      </div>
      <div>
        <p className="text-[13px] font-semibold tracking-tight text-[#111]">
          {app.name}
          {app.proSuffix && (
            <span className="font-medium text-[#111]/40">.pro</span>
          )}
        </p>
        <p className="text-[10px] uppercase tracking-[0.16em] text-[#888]">
          {app.subtitle}
        </p>
      </div>
    </Link>
  );
}

export function AppLauncher() {
  const account = useCurrentAccount();

  if (!account) {
    return <ConnectGate />;
  }

  return (
    <div className="flex min-h-[calc(100dvh-57px)] flex-col items-center justify-center px-6 py-12">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45">
        Your apps
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-[#111]">
        Open StreamLine
      </h1>
      <p className="mt-2 max-w-xs text-center text-[13px] text-[#666]">
        Pick the workspace that fits — personal streams or business payroll.
      </p>

      <div className="mt-12 grid grid-cols-2 gap-10 sm:gap-14 md:gap-20">
        {APPS.map((app) => (
          <AppIcon key={app.href} app={app} />
        ))}
      </div>
    </div>
  );
}
