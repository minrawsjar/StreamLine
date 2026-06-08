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

/**
 * Connected-state control: shows the active address with a dropdown for copy,
 * explorer, account switching, and disconnect. Replaces the connect button
 * once a wallet/zkLogin session is active.
 */
export function AccountMenu() {
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

  return (
    <div className="relative" ref={ref} data-sl-cursor="on-dark">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 border border-white/20 bg-[#2b2a5e] px-4 py-2.5 text-[12px] text-white transition-opacity hover:opacity-90"
      >
        {currentWallet?.icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentWallet.icon} alt="" className="h-4 w-4" />
        )}
        <span className="tabular">
          {account.label ?? shortAddress(account.address)}
        </span>
        <span className="text-[9px] opacity-60">▼</span>
      </button>

      {open && (
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
