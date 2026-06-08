"use client";

import { useEffect, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";

import { ConnectModal } from "./ConnectModal";
import { AccountMenu } from "./AccountMenu";

/**
 * StreamLine wallet entry point. Shows the connected account menu when a
 * wallet / zkLogin session is active, otherwise a button that opens our custom
 * connect modal. Mount-gated so SSR and hydration agree on the connection state.
 */
export function WalletButton({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const account = useCurrentAccount();

  useEffect(() => setMounted(true), []);

  const buttonClass =
    className ??
    "inline-flex items-center bg-[#2b2a5e] px-4 py-2.5 text-[11px] uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-90";

  if (!mounted) {
    return <span className={buttonClass}>connect</span>;
  }

  if (account) {
    return <AccountMenu />;
  }

  return (
    <>
      <button className={buttonClass} onClick={() => setOpen(true)}>
        connect wallet
      </button>
      <ConnectModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
