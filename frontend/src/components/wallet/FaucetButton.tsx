"use client";

import { useState } from "react";
import { useCurrentAccount, useSuiClientContext } from "@mysten/dapp-kit";

import { TEST_USDC } from "@/lib/networks";
import { buildMintTestUsdc } from "@/lib/streamline-tx";
import { toBaseUnits } from "@/lib/stream-math";
import { useGaslessExecute } from "@/lib/use-gasless";

/** Mints test USDC to the connected wallet. Testnet only. */
export function FaucetButton({
  amount = 1000,
  className,
  label,
}: {
  amount?: number;
  className?: string;
  label?: string;
}) {
  const account = useCurrentAccount();
  const { network } = useSuiClientContext();
  const { execute, isPending } = useGaslessExecute();
  const [done, setDone] = useState(false);

  if (!account || network !== "testnet") return null;

  const onMint = () => {
    setDone(false);
    execute(
      buildMintTestUsdc({
        packageId: TEST_USDC.packageId,
        treasuryId: TEST_USDC.treasuryId,
        amountBase: toBaseUnits(amount),
      }),
      {
        onSuccess: () => {
          setDone(true);
          setTimeout(() => setDone(false), 2500);
        },
      }
    );
  };

  const buttonLabel = label ?? (isPending ? "minting…" : done ? `+${amount} USDC ✓` : `+${amount} test USDC`);

  return (
    <button
      onClick={onMint}
      disabled={isPending}
      data-sl-cursor="on-light"
      className={
        className ??
        "border border-[#2b2a5e]/25 px-3 py-2.5 text-[11px] uppercase tracking-[0.1em] text-[#2b2a5e]/70 transition-colors hover:border-[#5b54e6] disabled:opacity-40"
      }
      title="Mint test USDC to your wallet"
    >
      {buttonLabel}
    </button>
  );
}
