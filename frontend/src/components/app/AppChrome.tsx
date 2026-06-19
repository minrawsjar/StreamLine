"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCurrentAccount, useSuiClientContext } from "@mysten/dapp-kit";

import { WalletButton } from "@/components/wallet/WalletButton";
import { FaucetButton } from "@/components/wallet/FaucetButton";
import { TokenBalance } from "@/components/wallet/TokenBalance";
import { StreamLineMark } from "@/components/landing/StreamLineMark";
import { ScanIconButton } from "@/components/app/phone/PhoneHeaderActions";
import { ProActionButtons, ProTitleWithDemo } from "@/components/app/pro/ProHeaderExtras";
import { ProScanModal } from "@/components/app/pro/ProScanModal";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const account = useCurrentAccount();
  const { network } = useSuiClientContext();
  const [scanOpen, setScanOpen] = useState(false);
  const isLauncher = pathname === "/app" || pathname === "/app/";
  const isPro = pathname?.startsWith("/app/pro");

  return (
    <div
      className={`min-h-[100dvh] font-[family-name:var(--font-poppins)] ${
        isPro ? "bg-[#0a0a0a] text-white" : "bg-[#f1efe9] text-[#2b2a5e]"
      }`}
    >
      <header
        className={`sticky top-0 z-50 flex items-center justify-between border-b px-5 py-3.5 backdrop-blur md:px-6 ${
          isPro
            ? "border-white/10 bg-[#0a0a0a]/90"
            : "border-[#2b2a5e]/15 bg-[#f1efe9]/90"
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href={isLauncher ? "/" : "/app"}
            className={`shrink-0 text-[11px] uppercase tracking-[0.14em] transition-opacity hover:opacity-60 ${
              isPro ? "text-white/50" : "text-[#2b2a5e]/55"
            }`}
          >
            {isLauncher ? "← Site" : "← Apps"}
          </Link>
          <div className="flex min-w-0 items-center gap-2.5">
            <StreamLineMark size="sm" variant={isPro ? "pro" : "default"} />
            {isPro ? (
              <ProTitleWithDemo />
            ) : (
              <span className="truncate text-[14px] font-bold tracking-[-0.02em]">
                StreamLine
              </span>
            )}
          </div>
          {isPro ? (
            <ProActionButtons className="hidden min-w-0 md:block" />
          ) : null}
          <span
            className={`hidden border px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] sm:inline ${
              isPro
                ? "border-white/15 text-white/35 lg:inline"
                : "border-[#2b2a5e]/20 text-[#2b2a5e]/50"
            } ${isPro ? "md:hidden lg:inline" : ""}`}
          >
            {network}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {account && <TokenBalance dark={isPro} />}
          {account && !isPro && <FaucetButton amount={1000} />}
          {isPro && account && <ScanIconButton pro onClick={() => setScanOpen(true)} />}
          <WalletButton
            showFaucetInMenu={!isPro}
            className={
              isPro
                ? "sl-glass-btn-dark !px-4 !py-2 !text-[10px]"
                : "inline-flex items-center rounded-full border border-[#2b2a5e]/15 bg-white px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-[#2b2a5e] transition-colors hover:bg-[#f7f7fb]"
            }
          />
        </div>
      </header>
      {isPro && (
        <div className="border-b border-white/10 bg-[#0a0a0a]/90 px-5 py-2.5 md:hidden">
          <ProActionButtons compact />
        </div>
      )}
      {children}
      {scanOpen && (
        <ProScanModal
          onClose={() => setScanOpen(false)}
          onResult={() => setScanOpen(false)}
        />
      )}
    </div>
  );
}
