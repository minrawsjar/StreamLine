"use client";

import { useEffect, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";

import { WalletButton } from "@/components/wallet/WalletButton";

const DEPARTMENTS = [
  { name: "Engineering", amt: "$84,200", status: "Dripping", contractors: 18 },
  { name: "Design", amt: "$31,500", status: "Approved", contractors: 9 },
  { name: "Operations", amt: "$18,900", status: "Pending", contractors: 6 },
  { name: "Marketing", amt: "$12,400", status: "Dripping", contractors: 4 },
];

export function ProDashboard() {
  const account = useCurrentAccount();
  const [paid, setPaid] = useState(248500);

  useEffect(() => {
    const t = setInterval(() => {
      setPaid((p) => p + Math.floor(Math.random() * 40));
    }, 2800);
    return () => clearInterval(t);
  }, []);

  if (!account) {
    return (
      <div className="flex min-h-[calc(100dvh-57px)] flex-col items-center justify-center gap-6 px-6 text-center font-[family-name:var(--font-inter)]">
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/35">
          StreamLine.pro
        </p>
        <h1 className="max-w-xl text-[clamp(24px,4vw,40px)] font-semibold leading-[1.05] tracking-[-0.02em]">
          Connect to manage payroll runs.
        </h1>
        <WalletButton className="sl-glass-btn-dark sl-glass-btn-dark-primary !px-8 !py-3" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10 font-[family-name:var(--font-inter)]">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/35">
        Payroll run · Q2
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(32px,5vw,52px)] font-semibold tabular leading-none tracking-tight">
            ${paid.toLocaleString()}
          </h1>
          <p className="mt-2 text-[13px] text-white/45">
            42 contractors · 6 departments · streaming live
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="sl-glass-btn-dark !px-4 !py-2 !text-[10px]"
          >
            Export audit
          </button>
          <button
            type="button"
            className="sl-glass-btn-dark sl-glass-btn-dark-primary !px-4 !py-2 !text-[10px]"
          >
            New run
          </button>
        </div>
      </div>

      <div className="mt-10 grid gap-3">
        {DEPARTMENTS.map((row) => (
          <div
            key={row.name}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4"
          >
            <div>
              <p className="text-sm font-medium text-white/85">{row.name}</p>
              <p className="mt-0.5 text-[11px] text-white/35">
                {row.contractors} contractors · {row.status}
              </p>
            </div>
            <p className="text-base font-semibold tabular text-white/75">
              {row.amt}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Next disbursement", value: "Friday · 09:00 UTC" },
          { label: "Pending approvals", value: "3 milestones" },
          { label: "Avg drip cycle", value: "≤60s" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4"
          >
            <p className="text-[9px] uppercase tracking-wider text-white/30">
              {stat.label}
            </p>
            <p className="mt-1.5 text-sm font-medium text-white/75">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
