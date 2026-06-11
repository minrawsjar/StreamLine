"use client";

import { useEffect, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";

import { WalletButton } from "@/components/wallet/WalletButton";

type PhoneProAppProps = {
  onBack: () => void;
};

export function PhoneProApp({ onBack }: PhoneProAppProps) {
  const account = useCurrentAccount();
  const [paid, setPaid] = useState(248500);

  useEffect(() => {
    const t = setInterval(() => {
      setPaid((p) => p + Math.floor(Math.random() * 80));
    }, 2800);
    return () => clearInterval(t);
  }, []);

  if (!account) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center font-[family-name:var(--font-inter)]">
        <p className="text-[10px] text-white/40">Connect wallet to continue</p>
        <WalletButton className="sl-glass-btn-dark sl-glass-btn-dark-primary mt-4 !px-4 !py-2 !text-[9px]" />
      </div>
    );
  }

  return (
    <div className="mt-1 flex min-h-0 flex-1 flex-col font-[family-name:var(--font-inter)]">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 self-start text-[10px] font-medium text-white/45"
      >
        ← All apps
      </button>
      <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-white/35">
        Payroll · Q2
      </p>
      <p className="mt-1.5 text-[1.5rem] font-semibold tabular leading-none text-white">
        ${paid.toLocaleString()}
      </p>
      <p className="mt-1 text-[10px] text-white/40">42 contractors</p>

      <div className="mt-4 space-y-2">
        {[
          { name: "Engineering", amt: "$84,200", status: "Dripping" },
          { name: "Design", amt: "$31,500", status: "Approved" },
        ].map((row) => (
          <div
            key={row.name}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
          >
            <div>
              <p className="text-[10px] font-medium text-white/80">{row.name}</p>
              <p className="text-[8px] text-white/30">{row.status}</p>
            </div>
            <p className="text-[10px] font-semibold tabular text-white/65">
              {row.amt}
            </p>
          </div>
        ))}
      </div>

      <a
        href="/app/pro"
        className="sl-glass-btn-dark sl-glass-btn-dark-primary mt-auto !w-full !py-2.5 !text-[9px]"
      >
        Open full workspace →
      </a>
    </div>
  );
}
