"use client";

import Link from "next/link";
import { useState } from "react";
import { useCurrentAccount, useSuiClientContext } from "@mysten/dapp-kit";

import { WalletButton } from "@/components/wallet/WalletButton";
import { StreamCreator } from "./StreamCreator";

type Tab = "create" | "streams" | "earn";

const TABS: { id: Tab; label: string }[] = [
  { id: "create", label: "Create stream" },
  { id: "streams", label: "Client dashboard" },
  { id: "earn", label: "Freelancer view" },
];

/**
 * The /app workspace. Gates on a connected wallet/zkLogin session; once
 * connected it shows the tabbed workspace (create, client dashboard, earn).
 */
export function AppShell() {
  const account = useCurrentAccount();
  const { network } = useSuiClientContext();
  const [tab, setTab] = useState<Tab>("create");

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
          <span className="hidden border border-[#2b2a5e]/20 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[#2b2a5e]/60 sm:inline">
            {network}
          </span>
        </div>
        <WalletButton />
      </header>

      {!account ? (
        <ConnectPrompt />
      ) : (
        <div className="mx-auto max-w-[1100px] px-6 py-10">
          <nav className="mb-10 flex flex-wrap gap-2">
            {TABS.map((t) => (
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
          {tab === "streams" && <ComingSoon title="Client dashboard" />}
          {tab === "earn" && <ComingSoon title="Freelancer view" />}
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
        Use the connect button up top — a Sui wallet, or Google via zkLogin (no
        seed phrase). Then create your first gasless milestone stream.
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
