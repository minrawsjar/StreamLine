"use client";

import Link from "next/link";
import { useState } from "react";
import { useCurrentAccount, useSuiClientContext } from "@mysten/dapp-kit";

import { WalletButton } from "@/components/wallet/WalletButton";
import { FaucetButton } from "@/components/wallet/FaucetButton";
import { StreamCreator } from "./StreamCreator";
import { LiveEarnings } from "./LiveEarnings";
import { ClientDashboard } from "./ClientDashboard";
import { RoleSelect, type Role } from "./RoleSelect";

const PAYER_TABS = [
  { id: "create", label: "Create stream" },
  { id: "dashboard", label: "Client dashboard" },
] as const;

const RECEIVER_TABS = [
  { id: "earn", label: "Live earnings" },
  { id: "collateral", label: "Collateral" },
] as const;

/**
 * The /app workspace. Gates on a connected wallet, then shows the role-select
 * console (payer vs receiver). Picking a role opens that side's workspace.
 */
export function AppShell() {
  const account = useCurrentAccount();
  const { network } = useSuiClientContext();
  const [role, setRole] = useState<Role | null>(null);
  const [tab, setTab] = useState<string>("create");

  const selectRole = (r: Role) => {
    setRole(r);
    setTab(r === "payer" ? "create" : "earn");
  };

  const tabs = role === "payer" ? PAYER_TABS : RECEIVER_TABS;

  return (
    <main className="min-h-[100dvh] w-full bg-[#f1efe9] text-[#2b2a5e]">
      <header
        data-sl-cursor="on-light"
        className="sticky top-0 z-50 flex items-center justify-between border-b border-[#2b2a5e]/15 bg-[#f1efe9]/90 px-6 py-4 backdrop-blur"
      >
        <div className="flex items-center gap-4">
          <Link href="/" className="text-[15px] font-bold tracking-[-0.02em]">
            StreamLine
          </Link>
          {role && (
            <button
              onClick={() => setRole(null)}
              className="border border-[#2b2a5e]/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[#2b2a5e]/60 hover:border-[#5b54e6]"
            >
              ← change role
            </button>
          )}
          <span className="hidden border border-[#2b2a5e]/20 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[#2b2a5e]/60 sm:inline">
            {network}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {account && <FaucetButton amount={1000} />}
          <WalletButton />
        </div>
      </header>

      {!account ? (
        <ConnectPrompt />
      ) : !role ? (
        <RoleSelect onSelect={selectRole} />
      ) : (
        <div className="mx-auto max-w-[1100px] px-6 py-10">
          <nav className="mb-10 flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
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
          {tab === "earn" && <LiveEarnings />}
          {tab === "collateral" && <ComingSoon title="Collateral panel" />}
        </div>
      )}
    </main>
  );
}

function ConnectPrompt() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[#5b54e6]">
        StreamLine app
      </p>
      <h1 className="max-w-2xl text-[clamp(28px,5vw,52px)] font-black leading-[0.95] tracking-[-0.03em]">
        Connect to create and watch streams.
      </h1>
      <p className="max-w-md text-[13px] leading-relaxed text-[#2b2a5e]/60">
        Use the connect button up top — connect a Sui wallet (set to Testnet).
        Then choose whether you&rsquo;re paying or getting paid.
      </p>
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
