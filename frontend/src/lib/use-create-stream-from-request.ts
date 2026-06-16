"use client";

import { useCallback, useState } from "react";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";

import { useNetworkVariable } from "@/lib/networks";
import { useGaslessExecute } from "@/lib/use-gasless";
import { formatUsd, toBaseUnits } from "@/lib/stream-math";
import {
  buildCreateStreamV2,
  splitMilestoneAmounts,
  DEFAULT_DISPUTE_WINDOW_MS,
} from "@/lib/streamline-tx";
import {
  buildCreateConfidentialStreamV2,
  commit,
  proveWrap,
  randomBlinding,
} from "@/lib/confidential";
import { encryptSecrets } from "@/lib/seal";
import {
  addSecret,
  findCreatedConfidentialStream,
} from "@/lib/confidential-store";
import {
  resolveStreamRequest,
  validateResolvedStreamRequest,
  type StreamRequestParams,
} from "@/lib/request-link";

export function useCreateStreamFromRequest() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const packageId = useNetworkVariable("packageId");
  const usdcType = useNetworkVariable("usdcType");
  const originalPackageId = useNetworkVariable("originalPackageId");
  const { execute, isPending } = useGaslessExecute();
  const [proving, setProving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const deployed = packageId && packageId !== "0x0";
  const busy = isPending || proving;

  const createFromRequest = useCallback(
    async (request: StreamRequestParams): Promise<boolean> => {
      if (!account) return false;
      if (!deployed) {
        setStatus("Move package not deployed on this network yet.");
        return false;
      }

      const resolved = resolveStreamRequest(request);
      const errors = validateResolvedStreamRequest(resolved);
      if (errors.length > 0) {
        setStatus(errors[0]);
        return false;
      }

      const {
        freelancer,
        amount,
        durationMs,
        isPrivate,
        milestones,
        splits,
      } = resolved;

      if (isPrivate) {
        setProving(true);
        try {
          setStatus("Generating commitments + proof in your browser…");
          const totalBase = toBaseUnits(amount);
          const recipient = freelancer.trim();
          const rRemaining = randomBlinding();
          const rEarned = randomBlinding();
          const remainingC = await commit(totalBase, rRemaining);
          const earnedC = await commit(0n, rEarned);
          const wrap = await proveWrap(totalBase, rRemaining);

          setStatus("Encrypting stream secrets to both wallets (Seal)…");
          const envelope = await encryptSecrets({
            suiClient: client,
            sealNamespace: originalPackageId,
            sender: account.address,
            freelancer: recipient,
            payload: {
              v: 1,
              coinType: usdcType,
              totalBase: totalBase.toString(),
              milestones: milestones.length,
              freelancer: recipient,
              remainingBase: totalBase.toString(),
              rRemaining: rRemaining.toString(),
              earnedBase: "0",
              rEarned: rEarned.toString(),
            },
          });

          const tx = buildCreateConfidentialStreamV2({
            packageId,
            coinType: usdcType,
            sender: account.address,
            totalBase,
            freelancer: recipient,
            nMilestones: milestones.length,
            remainingCommitment: remainingC,
            wrapProof: wrap.proof,
            earnedCommitment: earnedC,
            disputeWindowMs: DEFAULT_DISPUTE_WINDOW_MS,
            encryptedSecrets: envelope,
          });

          setStatus("Awaiting wallet signature…");
          let success = false;
          await execute(tx, {
            onSuccess: async ({ digest }) => {
              success = true;
              setStatus("Confirming on-chain…");
              const streamId = await findCreatedConfidentialStream(client, digest);
              if (streamId) {
                addSecret(account.address, {
                  streamId,
                  coinType: usdcType,
                  totalBase: totalBase.toString(),
                  milestones: milestones.length,
                  freelancer: recipient,
                  remainingBase: totalBase.toString(),
                  rRemaining: rRemaining.toString(),
                  earnedBase: "0",
                  rEarned: rEarned.toString(),
                  createdAt: Date.now(),
                });
              }
              setStatus(
                `Private stream created — locked ${formatUsd(amount)}. Digest ${digest}`
              );
            },
            onError: (e) => setStatus(e.message),
          });
          return success;
        } catch (e) {
          setStatus(e instanceof Error ? e.message : String(e));
          return false;
        } finally {
          setProving(false);
        }
      }

      const totalBase = toBaseUnits(amount);
      const yieldBps = Math.round(
        splits
          .filter((s) => s.yield)
          .reduce((a, s) => a + (Number(s.pct) || 0), 0) * 100
      );
      const tx = buildCreateStreamV2({
        packageId,
        usdcType,
        sender: account.address,
        freelancer,
        milestoneNames: milestones,
        milestoneAmountsBase: splitMilestoneAmounts(totalBase, milestones.length),
        totalBase,
        durationMs,
        yieldBps,
      });
      setStatus("Awaiting wallet signature…");
      let success = false;
      await execute(tx, {
        onSuccess: (r) => {
          success = true;
          setStatus(`Stream created — locked ${formatUsd(amount)}. Digest ${r.digest}`);
        },
        onError: (e) => setStatus(e.message),
      });
      return success;
    },
    [
      account,
      client,
      deployed,
      execute,
      originalPackageId,
      packageId,
      usdcType,
    ]
  );

  return { createFromRequest, busy, status, deployed };
}
