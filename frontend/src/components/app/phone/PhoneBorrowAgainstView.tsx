"use client";

import { useEffect, useMemo, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";

import type { StreamRecord } from "@/lib/indexer";
import { useNetworkVariable } from "@/lib/networks";
import { USDC_BASE } from "@/lib/stream-math";
import { effectiveState } from "@/lib/stream-state";
import { useGaslessExecute } from "@/lib/use-gasless";
import {
  maxBorrowableBase,
  useLending,
  PV_DISCOUNT,
} from "@/lib/use-lending";
import { buildBorrow } from "@/lib/streamline-tx";

const usd = (base: number, digits = 2) =>
  (base / USDC_BASE).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

type PhoneBorrowAgainstViewProps = {
  stream: StreamRecord;
  label: string;
  onBack: () => void;
};

export function PhoneBorrowAgainstView({
  stream,
  label,
  onBack,
}: PhoneBorrowAgainstViewProps) {
  const account = useCurrentAccount();
  const packageId = useNetworkVariable("packageId");
  const usdcType = useNetworkVariable("usdcType");
  const pool = useLending();
  const { execute, isPending } = useGaslessExecute();

  const [amountUsd, setAmountUsd] = useState(0);
  const [status, setStatus] = useState<string | null>(null);

  const view = effectiveState(stream);
  const isDripping = view === "dripping";
  const maxBorrowBase = maxBorrowableBase(stream.remaining, pool.reserveBase);
  const maxBorrowUsd = maxBorrowBase / USDC_BASE;

  const existingLoan = pool.loans.find((l) => l.streamId === stream.id);
  const deployed =
    !!packageId && packageId !== "0x0" && !!pool.poolId && pool.poolId !== "0x0";

  const blockReason = useMemo(() => {
    if (!isDripping) return "Only dripping streams can be borrowed against.";
    if (!deployed) return "Lending pool is not available on this network yet.";
    if (maxBorrowBase <= 0) {
      if (pool.reserveBase <= 0) return "Pool has no liquidity right now.";
      return "Nothing left to borrow against on this stream.";
    }
    return null;
  }, [isDripping, deployed, maxBorrowBase, pool.reserveBase]);

  useEffect(() => {
    if (blockReason) {
      setAmountUsd(0);
      return;
    }
    setAmountUsd((prev) => {
      if (prev <= 0 || prev > maxBorrowUsd) return maxBorrowUsd;
      return prev;
    });
  }, [blockReason, maxBorrowUsd]);

  const amountBase = Math.round(amountUsd * USDC_BASE);
  const canBorrow =
    !blockReason && amountBase > 0 && amountBase <= maxBorrowBase && !!account;

  const onBorrow = () => {
    if (!account || !canBorrow) return;
    setStatus("Awaiting signature…");
    execute(
      buildBorrow({
        packageId,
        usdcType,
        poolId: pool.poolId,
        sender: account.address,
        streamId: stream.id,
        principalBase: BigInt(amountBase),
      }),
      {
        onSuccess: () => {
          setStatus("Borrowed — USDC sent to your wallet.");
          pool.refetch();
        },
        onError: (e) => setStatus(e.message),
      }
    );
  };

  return (
    <div className="sl-scrollbar-hidden flex min-h-0 flex-1 flex-col overflow-y-auto">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 self-start text-[9px] font-medium text-[#666]"
      >
        ← Stream
      </button>

      <div className="flex flex-col gap-3 pb-2">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-[#111]">
            Borrow against
          </h2>
          <p className="mt-1 text-[12px] leading-snug text-[#666]">{label}</p>
        </div>

        <section className="rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#888]">
            You can borrow up to
          </p>
          <p className="mt-2 text-[2rem] font-bold tabular-nums leading-none text-[#111]">
            {usd(maxBorrowBase, 2)}
          </p>
          <p className="mt-2 text-[11px] leading-snug text-[#666]">
            {(PV_DISCOUNT * 100).toFixed(0)}% of remaining ({usd(stream.remaining, 2)}),
            capped by pool liquidity ({usd(pool.reserveBase, 2)}).
          </p>
        </section>

        {existingLoan && (
          <section className="rounded-2xl border border-[#c0533a]/20 bg-[#c0533a]/[0.04] px-3 py-2.5">
            <p className="text-[10px] font-semibold text-[#c0533a]">Active loan</p>
            <p className="mt-1 text-[11px] text-[#666]">
              Borrowed {usd(existingLoan.principalBase, 2)} · owe{" "}
              <span className="font-semibold tabular text-[#c0533a]">
                {usd(existingLoan.owedBase, 2)}
              </span>
            </p>
          </section>
        )}

        {blockReason ? (
          <p className="rounded-2xl border border-dashed border-black/12 bg-[#fafafa] px-3 py-4 text-center text-[11px] leading-snug text-[#666]">
            {blockReason}
          </p>
        ) : (
          <>
            <section className="rounded-2xl border border-black/10 bg-white p-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#888]">
                  Borrow amount
                </p>
                <p className="text-[18px] font-bold tabular-nums text-[#111]">
                  {usd(amountBase, 2)}
                </p>
              </div>
              <input
                type="range"
                min={0}
                max={maxBorrowUsd}
                step={maxBorrowUsd >= 100 ? 1 : 0.01}
                value={amountUsd}
                onChange={(e) => setAmountUsd(Number(e.target.value))}
                className="mt-4 w-full accent-[#c0533a]"
              />
              <div className="mt-2 flex justify-between text-[10px] tabular text-[#888]">
                <span>$0</span>
                <span>{usd(maxBorrowBase, 2)}</span>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="Borrow APR" value={`${pool.borrowAprPct.toFixed(0)}%`} />
              <MiniStat
                label="Repay"
                value="Auto from drips"
              />
            </div>

            <p className="text-[10px] leading-snug text-[#888]">
              Cash arrives now. Future drips repay the loan automatically — no
              liquidation risk as the stream drains.
            </p>
          </>
        )}

        {status && (
          <p className="text-center text-[11px] leading-snug text-[#666]">{status}</p>
        )}

        <button
          type="button"
          onClick={onBorrow}
          disabled={!canBorrow || isPending || pool.isLoading}
          className="mt-2 w-full rounded-2xl bg-[#c0533a] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white disabled:opacity-40"
        >
          {isPending ? "Borrowing…" : `Borrow ${usd(amountBase, 2)}`}
        </button>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white px-3 py-2.5">
      <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-[#888]">
        {label}
      </p>
      <p className="mt-1 text-[12px] font-semibold leading-snug text-[#111]">{value}</p>
    </div>
  );
}
