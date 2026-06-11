"use client";

import { useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";

import { WalletButton } from "@/components/wallet/WalletButton";
import type { Role } from "../user/RoleSelect";

type PhoneUserAppProps = {
  onBack: () => void;
};

export function PhoneUserApp({ onBack }: PhoneUserAppProps) {
  const account = useCurrentAccount();
  const [role, setRole] = useState<Role | null>(null);

  if (!account) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
        <p className="text-[10px] text-[#888]">Connect wallet to continue</p>
        <WalletButton className="sl-glass-btn sl-glass-btn-primary mt-4 !px-4 !py-2 !text-[9px]" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#888]">
          Pick your role
        </p>
        <div className="mt-4 space-y-2.5">
          {(
            [
              { role: "receiver" as const, title: "Freelancer", body: "Earn as you deliver" },
              { role: "payer" as const, title: "Client", body: "Pay as work lands" },
            ] as const
          ).map((c) => (
            <button
              key={c.role}
              type="button"
              onClick={() => setRole(c.role)}
              className="w-full rounded-xl border border-white/60 bg-white/75 px-3.5 py-3 text-left backdrop-blur-md transition-colors hover:border-black/20"
            >
              <p className="text-xs font-bold text-[#111]">{c.title}</p>
              <p className="mt-0.5 text-[10px] text-[#666]">{c.body}</p>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onBack}
          className="mt-auto pt-4 text-[10px] font-medium text-black/50"
        >
          ← All apps
        </button>
      </div>
    );
  }

  const isReceiver = role === "receiver";

  return (
    <div className="mt-1 flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        onClick={() => setRole(null)}
        className="mb-3 self-start text-[10px] font-medium text-black/50"
      >
        ← Change role
      </button>
      <div className="rounded-2xl border border-white/60 bg-white/75 p-3.5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] backdrop-blur-md">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-[#888]">
          {isReceiver ? "Earned today" : "Deployed"}
        </p>
        <p className="mt-1 text-[1.5rem] font-bold tabular leading-none text-[#111]">
          {isReceiver ? "$142.50" : "$4,200"}
        </p>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-black/8">
          <div
            className="h-full rounded-full bg-[#111]"
            style={{ width: isReceiver ? "68%" : "42%" }}
          />
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/50 bg-white/65 p-3 backdrop-blur-md">
          <p className="text-[8px] font-medium uppercase tracking-wider text-[#888]">
            Milestone
          </p>
          <p className="mt-0.5 text-sm font-bold text-[#111]">3 / 5</p>
        </div>
        <div className="rounded-xl border border-white/50 bg-white/65 p-3 backdrop-blur-md">
          <p className="text-[8px] font-medium uppercase tracking-wider text-[#888]">
            {isReceiver ? "Next drip" : "Review"}
          </p>
          <p className="mt-0.5 text-sm font-bold text-[#111]">
            {isReceiver ? "42s" : "2 pending"}
          </p>
        </div>
      </div>
      <a
        href="/app/user"
        className="sl-glass-btn sl-glass-btn-primary mt-auto !w-full !py-2.5 !text-[9px]"
      >
        Open full workspace →
      </a>
    </div>
  );
}
