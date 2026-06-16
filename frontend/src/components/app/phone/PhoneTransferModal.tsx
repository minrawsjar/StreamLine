"use client";

import { useState } from "react";

type TransferMode = "wallet" | "crosschain" | "bank";

type PhoneTransferModalProps = {
  open: boolean;
  onClose: () => void;
};

const MODES: { id: TransferMode; label: string; enabled: boolean }[] = [
  { id: "wallet", label: "Another wallet", enabled: true },
  { id: "crosschain", label: "Crosschain", enabled: false },
  { id: "bank", label: "Bank offramp", enabled: false },
];

export function PhoneTransferModal({ open, onClose }: PhoneTransferModalProps) {
  const [mode, setMode] = useState<TransferMode>("wallet");
  const [recipient, setRecipient] = useState("");
  const [coin, setCoin] = useState("USDC");
  const [amount, setAmount] = useState("");

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-white/95 backdrop-blur-md">
      <div className="flex shrink-0 items-center justify-between border-b border-black/6 px-1 pb-3 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="text-[10px] font-medium text-[#666]"
        >
          Cancel
        </button>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#888]">
          Transfer
        </p>
        <span className="w-10" aria-hidden />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-3">
        <div className="grid grid-cols-3 gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={!m.enabled}
              onClick={() => m.enabled && setMode(m.id)}
              className={`rounded-xl border px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] ${
                !m.enabled
                  ? "border-black/10 bg-black/[0.03] text-black/35"
                  : mode === m.id
                    ? "border-[#111] bg-[#111] text-white"
                    : "border-black/15 bg-white text-[#111]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === "wallet" && (
          <div className="mt-4 flex flex-col gap-3">
            <Field label="Recipient wallet">
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-[12px] font-mono outline-none focus:border-[#5b54e6]"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Coin">
                <select
                  value={coin}
                  onChange={(e) => setCoin(e.target.value)}
                  className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-[12px] outline-none focus:border-[#5b54e6]"
                >
                  <option>USDC</option>
                  <option>SUI</option>
                </select>
              </Field>
              <Field label="Amount">
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-[12px] outline-none focus:border-[#5b54e6]"
                />
              </Field>
            </div>

            <button
              type="button"
              disabled={!recipient || !amount}
              className="mt-1 rounded-xl bg-[#111] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white disabled:opacity-40"
            >
              Withdraw
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#777]">
        {label}
      </span>
      {children}
    </label>
  );
}
