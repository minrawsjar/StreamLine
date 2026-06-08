"use client";

import { useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClientContext,
} from "@mysten/dapp-kit";

import { TEST_USDC } from "@/lib/networks";
import { buildMintTestUsdc } from "@/lib/streamline-tx";
import { toBaseUnits } from "@/lib/stream-math";

/** Mints test USDC to the connected wallet. Testnet only. */
export function FaucetButton({ amount = 1000 }: { amount?: number }) {
  const account = useCurrentAccount();
  const { network } = useSuiClientContext();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const [done, setDone] = useState(false);

  if (!account || network !== "testnet") return null;

  const onMint = () => {
    setDone(false);
    signAndExecute(
      {
        transaction: buildMintTestUsdc({
          packageId: TEST_USDC.packageId,
          treasuryId: TEST_USDC.treasuryId,
          amountBase: toBaseUnits(amount),
        }),
      },
      {
        onSuccess: () => {
          setDone(true);
          setTimeout(() => setDone(false), 2500);
        },
      }
    );
  };

  return (
    <button
      onClick={onMint}
      disabled={isPending}
      data-sl-cursor="on-light"
      className="border border-[#2b2a5e]/25 px-3 py-2.5 text-[11px] uppercase tracking-[0.1em] text-[#2b2a5e]/70 transition-colors hover:border-[#5b54e6] disabled:opacity-40"
      title="Mint test USDC to your wallet"
    >
      {isPending ? "minting…" : done ? `+${amount} USDC ✓` : `+${amount} test USDC`}
    </button>
  );
}
