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
export function WalletButton({
  className,
  showFaucetInMenu = false,
  variant = "default",
  profilePro = false,
}: {
  className?: string;
  showFaucetInMenu?: boolean;
  variant?: "default" | "profile";
  profilePro?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const account = useCurrentAccount();

  useEffect(() => setMounted(true), []);

  const buttonClass =
    className ??
    "inline-flex items-center bg-[#2b2a5e] px-4 py-2.5 text-[11px] uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-90";

  const connectClass =
    variant === "profile"
      ? className?.includes("sl-glass-btn-dark")
        ? "sl-glass-btn-dark shrink-0 !px-2.5 !py-1 !text-[8px]"
        : "inline-flex shrink-0 items-center rounded-full border border-black/10 bg-white px-2.5 py-1 text-[8px] font-medium uppercase tracking-[0.12em] text-[#111] transition-colors hover:bg-[#f8f8f8]"
      : buttonClass;

  if (!mounted) {
    return <span className={connectClass}>connect</span>;
  }

  if (account) {
    return (
      <AccountMenu
        className={className}
        showFaucet={showFaucetInMenu}
        variant={variant}
        profilePro={profilePro}
      />
    );
  }

  return (
    <>
      <button className={connectClass} onClick={() => setOpen(true)}>
        connect wallet
      </button>
      <ConnectModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
