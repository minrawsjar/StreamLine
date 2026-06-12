"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentAccount, useSuiClientContext } from "@mysten/dapp-kit";

import { WalletButton } from "@/components/wallet/WalletButton";
import { FaucetButton } from "@/components/wallet/FaucetButton";
import { TokenBalance } from "@/components/wallet/TokenBalance";
import { StreamLineMark } from "@/components/landing/StreamLineMark";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const account = useCurrentAccount();
  const { network } = useSuiClientContext();
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
        <div className="flex min-w-0 items-center gap-3">
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
            <span className="truncate text-[14px] font-bold tracking-[-0.02em]">
              {isPro ? (
                <>
                  StreamLine
                  <span className="font-medium text-white/40">.pro</span>
                </>
              ) : (
                "StreamLine"
              )}
            </span>
          </div>
          <span
            className={`hidden border px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] sm:inline ${
              isPro
                ? "border-white/15 text-white/35"
                : "border-[#2b2a5e]/20 text-[#2b2a5e]/50"
            }`}
          >
            {network}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {account && <TokenBalance dark={isPro} />}
          {account && !isPro && <FaucetButton amount={1000} />}
          <WalletButton
            className={
              isPro
                ? "sl-glass-btn-dark !px-4 !py-2 !text-[10px]"
                : "inline-flex items-center bg-[#2b2a5e] px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-90"
            }
          />
        </div>
      </header>
      {children}
    </div>
  );
}
