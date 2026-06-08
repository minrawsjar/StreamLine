"use client";

import { useEffect, useState } from "react";
import { ConnectButton } from "@mysten/dapp-kit";

/**
 * StreamLine wallet entry point. Wraps dApp Kit's ConnectButton (which also
 * surfaces zkLogin / Google sign-in when configured). Mount-gated so the
 * connected/disconnected state never mismatches between SSR and hydration.
 */
export function WalletButton({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <span
        className={
          className ??
          "inline-flex items-center bg-[#2b2a5e] px-4 py-2.5 text-[11px] uppercase tracking-[0.12em] text-white"
        }
      >
        connect
      </span>
    );
  }

  return (
    <div className={className} data-sl-cursor="on-dark">
      <ConnectButton connectText="connect wallet" />
    </div>
  );
}
