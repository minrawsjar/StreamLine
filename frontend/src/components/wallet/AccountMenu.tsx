"use client";

import { useEffect, useRef, useState } from "react";
import {
  useCurrentAccount,
  useCurrentWallet,
  useDisconnectWallet,
  useAccounts,
  useSwitchAccount,
  useSuiClientContext,
} from "@mysten/dapp-kit";

import {
  shortAddress,
  explorerUrl,
  copyToClipboard,
} from "@/lib/format";
import type { NetworkName } from "@/lib/networks";
import { FaucetButton } from "./FaucetButton";
import {
  ProfileIcon,
  profileIconButtonClass,
} from "@/components/app/phone/PhoneHeaderActions";

function profileBtnPrimary(dark: boolean) {
  return dark
    ? "w-full rounded-2xl bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#111] transition-opacity hover:opacity-90 disabled:opacity-40"
    : "w-full rounded-2xl bg-[#111] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90 disabled:opacity-40";
}

function profileBtnSecondary(dark: boolean) {
  return dark
    ? "w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white/10"
    : "w-full rounded-2xl border border-black/12 bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#111] transition-colors hover:bg-[#fafafa]";
}

function profileBtnDanger(dark: boolean) {
  return dark
    ? "w-full rounded-2xl border border-[#e07060]/30 bg-[#e07060]/10 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#e07060] transition-colors hover:bg-[#e07060]/15"
    : "w-full rounded-2xl border border-[#c0533a]/20 bg-[#c0533a]/[0.04] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#c0533a] transition-colors hover:bg-[#c0533a]/[0.08]";
}

/**
 * Connected-state control: shows the active address with a dropdown for copy,
 * explorer, account switching, and disconnect. Replaces the connect button
 * once a wallet/zkLogin session is active.
 */
export function AccountMenu({
  className,
  showFaucet = false,
  faucetAmount = 1000,
  variant = "default",
  profilePro = false,
}: {
  className?: string;
  showFaucet?: boolean;
  faucetAmount?: number;
  variant?: "default" | "profile";
  profilePro?: boolean;
}) {
  const account = useCurrentAccount();
  const { currentWallet } = useCurrentWallet();
  const accounts = useAccounts();
  const { mutate: switchAccount } = useSwitchAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const { network } = useSuiClientContext();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  if (!account) return null;

  const onCopy = async () => {
    if (await copyToClipboard(account.address)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  const isProfile = variant === "profile";
  const dark = isProfile && profilePro;

  return (
    <div
      className="relative"
      ref={ref}
      data-sl-cursor={isProfile ? (profilePro ? "on-dark" : "on-light") : className ? "on-light" : "on-dark"}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className={
          isProfile
            ? profileIconButtonClass(profilePro)
            : `flex items-center gap-2 transition-opacity ${
                className ??
                "border border-white/20 bg-[#2b2a5e] px-4 py-2.5 text-[12px] text-white hover:opacity-90"
              }`
        }
        aria-label="Account menu"
        aria-expanded={open}
      >
        {isProfile ? <ProfileIcon /> : (
          <>
            {currentWallet?.icon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentWallet.icon} alt="" className="h-[1.1em] w-[1.1em] shrink-0" />
            )}
            <span className="tabular truncate">
              {account.label ?? shortAddress(account.address)}
            </span>
            <span className="text-[0.8em] opacity-60">▼</span>
          </>
        )}
      </button>

      {open && isProfile && (
        <div
          className={`absolute right-0 z-[120] mt-2 w-[min(17.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border shadow-[0_12px_40px_rgba(0,0,0,0.14)] ${
            dark
              ? "border-white/10 bg-[#161616] text-white"
              : "border-black/10 bg-white text-[#111]"
          }`}
        >
          <div className="p-3.5">
            <p
              className={`text-[9px] font-semibold uppercase tracking-[0.16em] ${
                dark ? "text-white/45" : "text-[#888]"
              }`}
            >
              Wallet
            </p>

            <div className="mt-2.5 flex items-center gap-2.5">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                  dark
                    ? "border-white/10 bg-white/8"
                    : "border-black/8 bg-[#fafafa]"
                }`}
              >
                {currentWallet?.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentWallet.icon} alt="" className="h-5 w-5" />
                ) : (
                  <ProfileIcon />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold tracking-tight">
                  {currentWallet?.name ?? "Connected"}
                </p>
                <p
                  className={`mt-0.5 text-[9px] font-medium uppercase tracking-[0.12em] ${
                    dark ? "text-white/40" : "text-[#888]"
                  }`}
                >
                  {network}
                </p>
              </div>
            </div>

            <div
              className={`mt-3 rounded-xl border px-3 py-2.5 ${
                dark
                  ? "border-white/10 bg-white/[0.04]"
                  : "border-black/10 bg-[#fafafa]"
              }`}
            >
              <p
                className={`text-[8px] font-semibold uppercase tracking-[0.14em] ${
                  dark ? "text-white/40" : "text-[#888]"
                }`}
              >
                Address
              </p>
              <p
                className={`mt-1 break-all font-mono text-[10px] leading-relaxed ${
                  dark ? "text-white/75" : "text-[#333]"
                }`}
              >
                {shortAddress(account.address, 8, 6)}
              </p>
            </div>
          </div>

          <div
            className={`flex flex-col gap-2 border-t px-3 py-3 ${
              dark ? "border-white/8" : "border-black/6"
            }`}
          >
            <button type="button" onClick={onCopy} className={profileBtnPrimary(dark)}>
              {copied ? "Copied ✓" : "Copy address"}
            </button>
            <a
              href={explorerUrl(network as NetworkName, "account", account.address)}
              target="_blank"
              rel="noreferrer"
              className={`text-center ${profileBtnSecondary(dark)}`}
            >
              View on explorer
            </a>

            {showFaucet && (
              <FaucetButton
                amount={faucetAmount}
                label={`Mint ${faucetAmount.toLocaleString()} USDC`}
                className={profileBtnSecondary(dark)}
              />
            )}

            {accounts.length > 1 && (
              <div className="flex flex-col gap-1.5 pt-1">
                <p
                  className={`px-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] ${
                    dark ? "text-white/35" : "text-[#aaa]"
                  }`}
                >
                  Switch account
                </p>
                {accounts
                  .filter((a) => a.address !== account.address)
                  .map((a) => (
                    <button
                      key={a.address}
                      type="button"
                      onClick={() => {
                        switchAccount({ account: a });
                        setOpen(false);
                      }}
                      className={`rounded-xl border px-3 py-2 text-left font-mono text-[10px] transition-colors ${
                        dark
                          ? "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]"
                          : "border-black/8 bg-[#fafafa] text-[#444] hover:bg-[#f3f3f3]"
                      }`}
                    >
                      {shortAddress(a.address, 8, 6)}
                    </button>
                  ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
              className={`mt-1 ${profileBtnDanger(dark)}`}
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {open && !isProfile && (
        <div className="absolute right-0 z-[120] mt-2 w-64 border border-[#2b2a5e]/15 bg-[#f1efe9] text-[#2b2a5e] shadow-2xl">
          <div className="border-b border-[#2b2a5e]/10 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#2b2a5e]/50">
              {currentWallet?.name ?? "Wallet"} · {network}
            </p>
            <p className="mt-1 break-all font-mono text-[12px]">
              {shortAddress(account.address, 10, 6)}
            </p>
          </div>

          <div className="flex flex-col py-1 text-[12px]">
            <button
              onClick={onCopy}
              className="px-4 py-2 text-left hover:bg-[#2b2a5e]/[0.05]"
            >
              {copied ? "Copied ✓" : "Copy address"}
            </button>
            <a
              href={explorerUrl(network as NetworkName, "account", account.address)}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 hover:bg-[#2b2a5e]/[0.05]"
            >
              View on explorer ↗
            </a>
          </div>

          {showFaucet && (
            <div className="border-t border-[#2b2a5e]/10 px-3 py-2">
              <FaucetButton
                amount={faucetAmount}
                label={`Mint ${faucetAmount.toLocaleString()} USDC`}
                className="w-full rounded-xl border border-[#2b2a5e]/20 bg-white px-3 py-2 text-[11px] font-medium text-[#2b2a5e]/85 transition-colors hover:border-[#5b54e6] hover:bg-[#2b2a5e]/[0.03] disabled:opacity-40"
              />
            </div>
          )}

          {accounts.length > 1 && (
            <div className="border-t border-[#2b2a5e]/10 py-1">
              <p className="px-4 py-1 text-[10px] uppercase tracking-[0.16em] text-[#2b2a5e]/40">
                Switch account
              </p>
              {accounts
                .filter((a) => a.address !== account.address)
                .map((a) => (
                  <button
                    key={a.address}
                    onClick={() => {
                      switchAccount({ account: a });
                      setOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left font-mono text-[12px] hover:bg-[#2b2a5e]/[0.05]"
                  >
                    {shortAddress(a.address)}
                  </button>
                ))}
            </div>
          )}

          <div className="border-t border-[#2b2a5e]/10 py-1">
            <button
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-[12px] text-[#c0533a] hover:bg-[#c0533a]/[0.08]"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
