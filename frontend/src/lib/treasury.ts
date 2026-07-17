"use client";

import { useQuery } from "@tanstack/react-query";
import { Transaction } from "@mysten/sui/transactions";
import type { SuiClient } from "@mysten/sui/client";

import { USDC_BASE } from "@/lib/stream-math";

/** Decode a little-endian u64 (Move devInspect return) to a JS number of USDC. */
function u64ToUsdc(bytes: number[] | Uint8Array): number {
  let v = 0n;
  for (let i = 0; i < bytes.length; i++) v |= BigInt(bytes[i]) << BigInt(8 * i);
  return Number(v) / USDC_BASE;
}

/** Find the Treasury shared object created by an `open` tx. */
export async function findCreatedTreasury(
  client: SuiClient,
  digest: string
): Promise<string | null> {
  try {
    await client.waitForTransaction({ digest });
    const tb = await client.getTransactionBlock({
      digest,
      options: { showObjectChanges: true },
    });
    const created = tb.objectChanges?.find(
      (c) =>
        c.type === "created" &&
        "objectType" in c &&
        typeof c.objectType === "string" &&
        c.objectType.includes("::treasury::Treasury")
    );
    return created && "objectId" in created ? created.objectId : null;
  } catch {
    return null;
  }
}

export type TreasuryState = { idle: number; invested: number };

/** Read live idle + invested USDC via the treasury's view functions. */
export async function readTreasuryState(
  client: SuiClient,
  a: {
    packageId: string;
    usdcType: string;
    treasuryId: string;
    vaultId: string;
    sender: string;
  }
): Promise<TreasuryState> {
  const tx = new Transaction();
  tx.moveCall({
    target: `${a.packageId}::treasury::idle_value`,
    typeArguments: [a.usdcType],
    arguments: [tx.object(a.treasuryId)],
  });
  tx.moveCall({
    target: `${a.packageId}::treasury::invested_value`,
    typeArguments: [a.usdcType],
    arguments: [
      tx.object(a.treasuryId),
      tx.object(a.vaultId),
      tx.pure.u64(BigInt(Date.now())),
    ],
  });
  const res = await client.devInspectTransactionBlock({
    sender: a.sender,
    transactionBlock: tx,
  });
  const idleBytes = res.results?.[0]?.returnValues?.[0]?.[0] ?? [];
  const investedBytes = res.results?.[1]?.returnValues?.[0]?.[0] ?? [];
  return { idle: u64ToUsdc(idleBytes), invested: u64ToUsdc(investedBytes) };
}

export function useTreasuryState(
  client: SuiClient,
  a: {
    packageId: string;
    usdcType: string;
    treasuryId: string | undefined;
    vaultId: string;
    sender: string;
  }
) {
  return useQuery({
    queryKey: ["treasury", a.treasuryId, a.sender],
    queryFn: () =>
      readTreasuryState(client, {
        packageId: a.packageId,
        usdcType: a.usdcType,
        treasuryId: a.treasuryId!,
        vaultId: a.vaultId,
        sender: a.sender,
      }),
    enabled: !!(a.treasuryId && a.sender && a.packageId !== "0x0"),
    refetchInterval: 15_000,
  });
}
