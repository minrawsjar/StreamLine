"use client";

import { useEffect, useState } from "react";
import { useCurrentAccount, useSuiClientContext } from "@mysten/dapp-kit";

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

// Sandbox keys (pk_test_…) only work against buy.onramper.dev; prod keys use .com.
const WIDGET_HOST = API_KEY.startsWith("pk_test")
  ? "buy.onramper.dev"
  : "buy.onramper.com";

/** Whether the Onramper key is configured (build-time NEXT_PUBLIC). */
export const onramperConfigured = !!API_KEY;

/**
 * Build the widget URL and (if a signing secret is configured) sign the
 * sensitive params. Onramper rejects unsigned URLs with "Signature validation
 * failed" when verification is on — it HMAC-signs `signContent` (the `wallets`
 * param, sorted by key) and expects a matching `&signature=` (hex). Signing runs
 * server-side via /api/onramper/sign so the secret never reaches the browser.
 */
async function buildSignedUrl(mode: OnrampMode, address: string): Promise<string> {
  const wallets = `${CRYPTO}:${address}`;
  const p = new URLSearchParams({
    apiKey: API_KEY,
    mode,
    wallets,
    themeName: "light",
  });
  // Lock to USDC-on-Sui. Sandbox coverage for this token is limited to
  // onramp.money (the only provider that quotes usdc_sui), which is exactly the
  // demo target — its quote screen is as far as a sandbox usdc_sui flow goes.
  // Banxa/Guardarian etc. don't carry usdc_sui and dead-end, so keep the lock.
  if (mode === "buy") {
    p.set("onlyCryptos", CRYPTO);
    p.set("defaultCrypto", CRYPTO);
    p.set("defaultFiat", "usd");
  } else {
    p.set("sell_onlyCryptos", CRYPTO);
    p.set("sell_defaultCrypto", CRYPTO);
    p.set("sell_defaultFiat", "usd");
  }
  // signContent = the sensitive params (only `wallets` here), key-sorted.
  try {
    const res = await fetch("/api/onramper/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signContent: `wallets=${wallets}` }),
    });
    if (res.ok) {
      const { signature } = (await res.json()) as { signature?: string };
      if (signature) p.set("signature", signature);
    }
    // 501 (no secret) → load unsigned; works only if verification is off.
  } catch {
    /* network blip — fall through to unsigned */
  }
  return `https://${WIDGET_HOST}/?${p.toString()}`;
}

/** Onramper iframe body (mainnet: real ramp, real settlement). */
function OnramperIframe({ mode, address }: { mode: OnrampMode; address: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    void buildSignedUrl(mode, address).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [mode, address]);

  const title = mode === "buy" ? "Buy USDC" : "Cash out USDC";
  return url ? (
    <iframe
      title={`${title} via Onramper`}
      src={url}
      className="min-h-0 flex-1 border-0"
      allow="accelerometer; autoplay; camera; gyroscope; payment; microphone"
    />
  ) : (
    <div className="flex min-h-0 flex-1 items-center justify-center text-[12px] text-[#888]">
      Loading…
    </div>
  );
}

const FEE_RATE = 0.01; // 1% spread, so the quote looks like a real aggregator
const QUICK = [50, 100, 300];

/**
 * Testnet checkout — mirrors an on-ramp aggregator widget (You spend / You get /
 * Pay using / Buy) but the delivery leg is our keeper faucet: on "Buy", the
 * keeper mints test USDC straight to the buyer's Sui wallet (no signature), so
 * the buy *feels* real and USDC actually lands. Testnet demo only; mainnet uses
 * the real ramp above. Deliberately unbranded — not "Powered by Onramper".
 */
function TestnetCheckout({
  mode,
  address,
  onClose,
}: {
  mode: OnrampMode;
  address: string;
  onClose: () => void;
}) {
  const [spend, setSpend] = useState(300);
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [digest, setDigest] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const buy = mode === "buy";
  // Buy: fiat in → USDC out (minus fee). Sell: USDC in → fiat out (minus fee).
  const receive = Math.round(spend * (1 - FEE_RATE) * 100) / 100;

  const submit = async () => {
    setStatus("busy");
    setErr(null);
    if (!buy) {
      // Sell is a display-only confirmation (no token movement).
      setTimeout(() => setStatus("done"), 1100);
      return;
    }
    try {
      const res = await fetch("/api/faucet/deliver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, amount: receive }),
      });
      const data = (await res.json()) as { digest?: string; error?: string };
      if (!res.ok || !data.digest) throw new Error(data.error || "delivery failed");
      setDigest(data.digest);
      setStatus("done");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "delivery failed");
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eafbea] text-[26px] text-[#2f9e44]">
          ✓
        </div>
        <p className="text-[14px] font-semibold text-[#111]">
          {buy
            ? `${receive} USDC delivered to your Sui wallet`
            : `$${receive} on its way to your bank`}
        </p>
        {digest && (
          <a
            href={`https://suiscan.xyz/testnet/tx/${digest}`}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-medium text-[#5b54e6] underline"
          >
            View transaction ↗
          </a>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-2 rounded-xl bg-[#111] px-6 py-2.5 text-[13px] font-semibold text-white"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
      {/* You spend */}
      <div className="rounded-2xl bg-[#f5f5f6] px-4 py-3.5">
        <p className="mb-1 text-[13px] text-[#888]">
          {buy ? "You spend" : "You cash out"}
        </p>
        <div className="flex items-center justify-between gap-2">
          <input
            type="number"
            min={1}
            value={spend}
            onChange={(e) => setSpend(Math.max(0, Number(e.target.value)))}
            className="w-full bg-transparent text-[28px] font-bold text-[#111] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[13px] font-semibold text-[#111] shadow-sm">
            {buy ? "🇺🇸 USD" : "💵 USDC"}
          </span>
        </div>
      </div>

      {/* You get */}
      <div className="rounded-2xl bg-[#f5f5f6] px-4 py-3.5">
        <p className="mb-1 text-[13px] text-[#888]">You get</p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[28px] font-bold text-[#111]">{receive}</span>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[13px] font-semibold text-[#111] shadow-sm">
              {buy ? "🪙 USDC" : "🏦 USD"}
            </span>
            <span className="text-[11px] text-[#999]">
              {buy ? "🌊 Sui" : "to bank"}
            </span>
          </div>
        </div>
      </div>

      <p className="px-1 text-[11px] text-[#999]">
        1 USDC ≈ $1.00 · {Math.round(FEE_RATE * 100)}% fee included
      </p>

      {/* quick amounts */}
      <div className="flex gap-2">
        {QUICK.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setSpend(v)}
            className={`flex-1 rounded-lg border px-2 py-1.5 text-[12px] font-semibold transition-colors ${
              spend === v
                ? "border-[#5b54e6] bg-[#f3f2ff] text-[#2b2a5e]"
                : "border-black/10 text-[#666] hover:border-[#5b54e6]/50"
            }`}
          >
            ${v}
          </button>
        ))}
      </div>

      {/* Pay using */}
      <div>
        <p className="mb-1.5 text-[13px] text-[#888]">
          {buy ? "Pay using" : "Deposit to"}
        </p>
        <div className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3">
          <span className="flex h-6 w-9 items-center justify-center rounded bg-black text-[10px] font-bold text-white">
            {buy ? " Pay" : "ACH"}
          </span>
          <span className="text-[13px] font-medium text-[#222]">
            {buy ? "Apple Pay" : "Bank •••• 6789"}
          </span>
        </div>
      </div>

      {status === "error" && (
        <p className="text-[11px] leading-snug text-[#c0533a] [overflow-wrap:anywhere]">
          {err}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={status === "busy" || spend <= 0}
        className="mt-1 rounded-2xl bg-[#111] px-5 py-3.5 text-[14px] font-semibold text-white disabled:opacity-40"
      >
        {status === "busy"
          ? "Processing…"
          : buy
            ? "Buy USDC"
            : "Cash out"}
      </button>
      <p className="text-center text-[10px] text-[#bbb]">
        Testnet demo · delivered from faucet
      </p>
    </div>
  );
}

/** Full-screen modal: testnet → mock checkout (faucet delivery), mainnet → Onramper. */
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
  const { network } = useSuiClientContext();
  const testnet = network === "testnet";

  if (!open || !account) return null;
  if (!testnet && !API_KEY) return null; // mainnet needs a configured ramp
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
        {testnet ? (
          <TestnetCheckout mode={mode} address={account.address} onClose={onClose} />
        ) : (
          <OnramperIframe mode={mode} address={account.address} />
        )}
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
