"use client";

import { useEffect, useState } from "react";
import { useWallets, useConnectWallet } from "@mysten/dapp-kit";
import { isEnokiWallet, type EnokiWallet, type AuthProvider } from "@mysten/enoki";
import type { WalletWithRequiredFeatures } from "@mysten/wallet-standard";

type Props = {
  open: boolean;
  onClose: () => void;
};

const PROVIDER_LABEL: Partial<Record<AuthProvider, string>> = {
  google: "Continue with Google",
  facebook: "Continue with Facebook",
  twitch: "Continue with Twitch",
};

/**
 * StreamLine's own connect modal. Splits zkLogin social logins (seedless, the
 * "sign up with Gmail" path) from browser-extension wallets, and connects via
 * dApp Kit. Sharp corners + mono to match the brutalist landing aesthetic.
 */
export function ConnectModal({ open, onClose }: Props) {
  const wallets = useWallets();
  const { mutate: connect, isPending } = useConnectWallet();
  const [error, setError] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const enokiWallets = wallets.filter(isEnokiWallet) as EnokiWallet[];
  const standardWallets = wallets.filter(
    (w) => !isEnokiWallet(w)
  ) as WalletWithRequiredFeatures[];

  const onConnect = (wallet: WalletWithRequiredFeatures) => {
    setError(null);
    setPendingName(wallet.name);
    connect(
      { wallet },
      {
        onSuccess: () => onClose(),
        onError: (e) => setError(e.message ?? "Failed to connect"),
        onSettled: () => setPendingName(null),
      }
    );
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      data-sl-cursor="on-light"
    >
      <button
        aria-label="Close"
        className="absolute inset-0 bg-[#1d1c44]/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md border border-[#2b2a5e]/15 bg-[#f1efe9] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#2b2a5e]/15 bg-[#2b2a5e] px-5 py-4 text-white">
          <span className="text-[11px] uppercase tracking-[0.2em]">
            Connect to StreamLine
          </span>
          <button
            onClick={onClose}
            className="text-[18px] leading-none hover:opacity-60"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-5 p-5">
          {enokiWallets.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#2b2a5e]/50">
                Seedless · zkLogin
              </p>
              {enokiWallets.map((w) => (
                <button
                  key={w.name}
                  disabled={isPending}
                  onClick={() => onConnect(w)}
                  className="flex items-center gap-3 border border-[#2b2a5e]/20 bg-white px-4 py-3 text-left text-[13px] transition-colors hover:border-[#5b54e6] disabled:opacity-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={w.icon} alt="" className="h-5 w-5" />
                  <span className="font-medium">
                    {PROVIDER_LABEL[w.provider] ?? w.name}
                  </span>
                  {pendingName === w.name && (
                    <span className="ml-auto text-[11px] text-[#2b2a5e]/50">
                      …
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#2b2a5e]/50">
              Sui wallets
            </p>
            {standardWallets.length === 0 ? (
              <a
                href="https://slush.app"
                target="_blank"
                rel="noreferrer"
                className="border border-dashed border-[#2b2a5e]/25 px-4 py-3 text-[12px] text-[#2b2a5e]/60 hover:border-[#5b54e6]"
              >
                No Sui wallet detected — install Slush →
              </a>
            ) : (
              standardWallets.map((w) => (
                <button
                  key={w.name}
                  disabled={isPending}
                  onClick={() => onConnect(w)}
                  className="flex items-center gap-3 border border-[#2b2a5e]/20 bg-white px-4 py-3 text-left text-[13px] transition-colors hover:border-[#5b54e6] disabled:opacity-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={w.icon} alt="" className="h-5 w-5" />
                  <span className="font-medium">{w.name}</span>
                  {pendingName === w.name && (
                    <span className="ml-auto text-[11px] text-[#2b2a5e]/50">
                      …
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          {error && (
            <p className="border border-[#c0533a]/40 bg-[#c0533a]/10 px-3 py-2 text-[12px] text-[#c0533a]">
              {error}
            </p>
          )}

          <p className="text-[11px] leading-relaxed text-[#2b2a5e]/50">
            New here? zkLogin creates a Sui wallet from your Google account — no
            seed phrase, no extension. Gasless from the first drip.
          </p>
        </div>
      </div>
    </div>
  );
}
