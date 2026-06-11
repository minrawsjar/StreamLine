"use client";

import { useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";

import { WalletButton } from "@/components/wallet/WalletButton";
import { StreamCreator } from "../StreamCreator";
import { FreelancerDashboard } from "../FreelancerDashboard";
import { ClientDashboard } from "../ClientDashboard";
import { ConfidentialDemo } from "../ConfidentialDemo";
import { RoleSelect, type Role } from "./RoleSelect";

const PAYER_TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "create", label: "Create stream" },
  { id: "confidential", label: "Confidential 🔒" },
] as const;

const RECEIVER_TABS = [
  { id: "earn", label: "Dashboard" },
  { id: "collateral", label: "Collateral" },
  { id: "confidential", label: "Confidential 🔒" },
] as const;

export function UserAppShell() {
  const account = useCurrentAccount();
  const [role, setRole] = useState<Role | null>(null);
  const [tab, setTab] = useState<string>("create");

  const selectRole = (r: Role) => {
    setRole(r);
    setTab(r === "payer" ? "dashboard" : "earn");
  };

  const tabs = role === "payer" ? PAYER_TABS : RECEIVER_TABS;

  if (!account) {
    return (
      <div className="flex min-h-[calc(100dvh-57px)] flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[#5b54e6]">
          StreamLine
        </p>
        <h1 className="max-w-2xl text-[clamp(24px,4vw,40px)] font-black leading-[0.95] tracking-[-0.03em]">
          Connect to create and watch streams.
        </h1>
        <WalletButton className="sl-glass-btn sl-glass-btn-primary !px-8 !py-3" />
      </div>
    );
  }

  if (!role) {
    return <RoleSelect onSelect={selectRole} />;
  }

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <button
        type="button"
        onClick={() => setRole(null)}
        className="mb-8 border border-[#2b2a5e]/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[#2b2a5e]/60 hover:border-[#5b54e6]"
      >
        ← change role
      </button>

      <nav className="mb-10 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-[12px] uppercase tracking-[0.1em] transition-colors ${
              tab === t.id
                ? "bg-[#2b2a5e] text-white"
                : "border border-[#2b2a5e]/20 text-[#2b2a5e]/70 hover:border-[#5b54e6]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "create" && <StreamCreator />}
      {tab === "dashboard" && <ClientDashboard />}
      {tab === "earn" && <FreelancerDashboard />}
      {tab === "collateral" && <ComingSoon title="Collateral panel" />}
      {tab === "confidential" && <ConfidentialDemo />}
    </div>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="border border-dashed border-[#2b2a5e]/25 px-8 py-20 text-center">
      <p className="text-[13px] uppercase tracking-[0.16em] text-[#2b2a5e]/50">
        {title}
      </p>
      <p className="mt-2 text-[13px] text-[#2b2a5e]/50">
        Lands next: live earn counter, milestone approvals, collateral panel.
      </p>
    </div>
  );
}
