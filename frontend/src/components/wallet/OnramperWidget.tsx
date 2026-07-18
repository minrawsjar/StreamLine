"use client";

import { useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";

/**
 * Fiat ⇄ USDC via the Onramper aggregator widget (30+ providers, one iframe).
 *   mode="buy"  — on-ramp:  fiat → USDC into the connected Sui wallet.
 *   mode="sell" — off-ramp: USDC from the wallet → fiat to a bank/card.
 *
 * Config (env):
 *   NEXT_PUBLIC_ONRAMPER_API_KEY — required; the widget hides without it.
 *   NEXT_PUBLIC_ONRAMPER_CRYPTO  — Onramper token id, default "usdc_sui".
 *
 * Onramper aggregates real providers on mainnet — actual buys/sells settle in
 * mainnet USDC. On a testnet app the widget is the demoable flow; it flips to
 * live by using a Sui *mainnet* address. No backend, no new dependency.
 *
 * Sell mode uses `sell_`-prefixed params; `apiKey` + `wallets` are shared.
 */

export type OnrampMode = "buy" | "sell";

const API_KEY = process.env.NEXT_PUBLIC_ONRAMPER_API_KEY?.trim() || "";
const CRYPTO = process.env.NEXT_PUBLIC_ONRAMPER_CRYPTO?.trim() || "usdc_sui";

/** Whether the Onramper key is configured (build-time NEXT_PUBLIC). */
export const onramperConfigured = !!API_KEY;

function widgetUrl(mode: OnrampMode, address: string): string {
  const p = new URLSearchParams({
    apiKey: API_KEY,
    mode,
    wallets: `${CRYPTO}:${address}`,
    themeName: "light",
  });
  if (mode === "buy") {
    p.set("onlyCryptos", CRYPTO);
    p.set("defaultCrypto", CRYPTO);
    p.set("defaultFiat", "usd");
  } else {
    p.set("sell_onlyCryptos", CRYPTO);
    p.set("sell_defaultCrypto", CRYPTO);
    p.set("sell_defaultFiat", "usd");
  }
  return `https://buy.onramper.com/?${p.toString()}`;
}

/** Full-screen modal hosting the Onramper iframe. Controlled. */
export function OnramperModal({
  open,
  mode,
  onClose,
}: {
  open: boolean;
  mode: OnrampMode;
  onClose: () => void;
}) {
  const account = useCurrentAccount();
  if (!open || !API_KEY || !account) return null;
  const title = mode === "buy" ? "Buy USDC" : "Cash out USDC";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex h-[680px] max-h-[90vh] w-[420px] max-w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-2.5">
          <span className="text-[12px] font-semibold text-[#111]">{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[#666] hover:bg-black/5"
          >
            Close
          </button>
        </div>
        <iframe
          title={`${title} via Onramper`}
          src={widgetUrl(mode, account.address)}
          className="min-h-0 flex-1 border-0"
          allow="accelerometer; autoplay; camera; gyroscope; payment; microphone"
        />
      </div>
    </div>
  );
}

/** Button that opens the Onramper widget in the given mode. */
export function OnramperButton({
  mode,
  label,
  className,
}: {
  mode: OnrampMode;
  label?: string;
  className?: string;
}) {
  const account = useCurrentAccount();
  const [open, setOpen] = useState(false);
  if (!API_KEY || !account) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-sl-cursor="on-light"
        className={
          className ??
          "border border-[#2b2a5e]/25 px-3 py-2.5 text-[11px] uppercase tracking-[0.1em] text-[#2b2a5e]/70 transition-colors hover:border-[#5b54e6]"
        }
        title={mode === "buy" ? "Buy USDC with cash (on-ramp)" : "Cash out USDC to fiat (off-ramp)"}
      >
        {label ?? (mode === "buy" ? "Buy USDC" : "Cash out")}
      </button>
      <OnramperModal open={open} mode={mode} onClose={() => setOpen(false)} />
    </>
  );
}
