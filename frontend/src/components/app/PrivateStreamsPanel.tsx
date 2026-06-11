"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useCurrentAccount,
  useSignPersonalMessage,
  useSuiClient,
  useSuiClientContext,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { toBase64 } from "@mysten/sui/utils";

import { useNetworkVariable, type NetworkName } from "@/lib/networks";
import { useGaslessExecute } from "@/lib/use-gasless";
import {
  commit,
  proveDrip,
  proveUnwrap,
  randomBlinding,
  buildConfidentialDripV2,
  buildClaimV2,
  buildConfRaiseCompletion,
  buildConfApproveMilestone,
  buildConfDispute,
} from "@/lib/confidential";
import {
  decryptSecrets,
  encryptSecrets,
  loadOrCreateSessionKey,
  type PrivateStreamPayload,
} from "@/lib/seal";
import {
  fetchPrivateStream,
  findPrivateStreamIds,
  type PrivateStreamOnChain,
} from "@/lib/private-streams";
import {
  loadSecrets,
  saveSecrets,
  updateSecret,
  type PrivateStreamSecret,
} from "@/lib/confidential-store";
import { Card, StateBadge } from "./dashboard-ui";

const STATE_LABELS = [
  "locked",
  "pending_review",
  "dripping",
  "paused",
  "done",
] as const;

const usd = (base: bigint) => `$${(Number(base) / 1e6).toFixed(2)}`;
const short = (a: string) => `${a.slice(0, 8)}…${a.slice(-4)}`;
const scan = (id: string) => `https://suiscan.xyz/testnet/object/${id}`;

type Role = "sender" | "freelancer";

/** Map of stream id → owned StreamCap (original package type — see networks). */
function useStreamCaps(originalPackageId: string) {
  const account = useCurrentAccount();
  const { data } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: account?.address ?? "",
      filter: { StructType: `${originalPackageId}::stream::StreamCap` },
      options: { showContent: true },
    },
    { enabled: !!account && originalPackageId !== "0x0" }
  );
  return useMemo(() => {
    const map = new Map<string, string>();
    for (const o of data?.data ?? []) {
      const content = o.data?.content;
      if (content?.dataType === "moveObject") {
        const fields = content.fields as Record<string, unknown>;
        const streamId = fields["stream_id"] as string | undefined;
        if (streamId && o.data?.objectId) map.set(streamId, o.data.objectId);
      }
    }
    return map;
  }, [data]);
}

/**
 * Private streams for the connected wallet, in either role. Reads the chain
 * directly (no indexer): discovery via ConfStreamCreated events + the local
 * secrets cache, state via object reads.
 */
function usePrivateStreams(role: Role) {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const confPackageId = useNetworkVariable("confPackageId");
  const addr = account?.address;

  return useQuery({
    queryKey: ["private-streams", addr, role],
    enabled: !!addr && confPackageId !== "0x0",
    refetchInterval: 15_000,
    queryFn: async (): Promise<PrivateStreamOnChain[]> => {
      const eventIds = await findPrivateStreamIds(client, confPackageId, addr!);
      const localIds = loadSecrets(addr!).map((s) => s.streamId);
      const ids = [...new Set([...eventIds, ...localIds])];
      const streams = await Promise.all(
        ids.map((id) => fetchPrivateStream(client, id).catch(() => null))
      );
      return streams
        .filter((s): s is PrivateStreamOnChain => !!s)
        .filter((s) =>
          role === "sender" ? s.sender === addr : s.freelancer === addr
        )
        .filter((s) => s.state !== 4 || s.reserve > 0n);
    },
  });
}

function payloadFromLocal(s: PrivateStreamSecret): PrivateStreamPayload {
  return {
    v: 1,
    coinType: s.coinType,
    totalBase: s.totalBase,
    milestones: s.milestones,
    freelancer: s.freelancer,
    remainingBase: s.remainingBase,
    rRemaining: s.rRemaining,
    earnedBase: s.earnedBase,
    rEarned: s.rEarned,
  };
}

async function matchesChain(
  payload: PrivateStreamPayload,
  stream: PrivateStreamOnChain
): Promise<boolean> {
  const c = await commit(BigInt(payload.remainingBase), BigInt(payload.rRemaining));
  return toBase64(c) === toBase64(stream.remainingCommitment);
}

export function PrivateStreamsPanel({ role }: { role: Role }) {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { network } = useSuiClientContext();
  const packageId = useNetworkVariable("packageId");
  const originalPackageId = useNetworkVariable("originalPackageId");
  const { execute, isPending } = useGaslessExecute();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const caps = useStreamCaps(originalPackageId);

  const { data: streams, isLoading, refetch } = usePrivateStreams(role);
  const [unlocked, setUnlocked] = useState<Map<string, PrivateStreamPayload>>(
    new Map()
  );
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const addr = account?.address;

  const setPayload = useCallback(
    (streamId: string, payload: PrivateStreamPayload) => {
      setUnlocked((m) => new Map(m).set(streamId, payload));
    },
    []
  );

  /** Persist refreshed secrets locally so future sessions skip Seal. */
  const persistLocal = useCallback(
    (streamId: string, payload: PrivateStreamPayload) => {
      if (!addr) return;
      const existing = loadSecrets(addr);
      if (existing.some((s) => s.streamId === streamId)) {
        updateSecret(addr, streamId, {
          remainingBase: payload.remainingBase,
          rRemaining: payload.rRemaining,
          earnedBase: payload.earnedBase,
          rEarned: payload.rEarned,
        });
      } else {
        saveSecrets(addr, [
          {
            streamId,
            coinType: payload.coinType,
            totalBase: payload.totalBase,
            milestones: payload.milestones,
            freelancer: payload.freelancer,
            remainingBase: payload.remainingBase,
            rRemaining: payload.rRemaining,
            earnedBase: payload.earnedBase,
            rEarned: payload.rEarned,
            createdAt: Date.now(),
          },
          ...existing,
        ]);
      }
    },
    [addr]
  );

  /** Local cache first (no popup); fall back to Seal decryption. */
  const unlock = useCallback(
    async (stream: PrivateStreamOnChain) => {
      if (!addr) return;
      setBusy(stream.id);
      setStatus(null);
      try {
        const local = loadSecrets(addr).find((s) => s.streamId === stream.id);
        if (local) {
          const payload = payloadFromLocal(local);
          if (await matchesChain(payload, stream)) {
            setPayload(stream.id, payload);
            return;
          }
        }
        if (stream.encryptedSecrets.length === 0) {
          if (local) {
            // Stale local secrets and nothing on-chain to recover from (pre-v3
            // stream) — surface the mismatch instead of mis-proving.
            setStatus(
              "Secrets out of sync with chain and no Seal envelope found on this stream."
            );
            setPayload(stream.id, payloadFromLocal(local));
            return;
          }
          setStatus("No Seal envelope on this stream — ask the other party to re-share.");
          return;
        }
        setStatus("Requesting decryption keys from Seal…");
        const sessionKey = await loadOrCreateSessionKey({
          suiClient: client,
          address: addr,
          network: network as NetworkName,
          sealNamespace: originalPackageId,
          signPersonalMessage: (message) => signPersonalMessage({ message }),
        });
        const payload = await decryptSecrets({
          suiClient: client,
          currentPackageId: packageId,
          envelopeBytes: stream.encryptedSecrets,
          role,
          sessionKey,
          address: addr,
        });
        setPayload(stream.id, payload);
        persistLocal(stream.id, payload);
        setStatus(null);
      } catch (e) {
        setStatus(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [addr, client, network, originalPackageId, packageId, role, signPersonalMessage, setPayload, persistLocal]
  );

  /** Drip a hidden milestone-sized delta and rotate the Seal ciphertext. */
  const onDrip = useCallback(
    async (stream: PrivateStreamOnChain, payload: PrivateStreamPayload) => {
      if (!addr) return;
      setBusy(stream.id);
      try {
        const remaining = BigInt(payload.remainingBase);
        const earned = BigInt(payload.earnedBase);
        let delta = BigInt(payload.totalBase) / BigInt(payload.milestones);
        if (delta > remaining) delta = remaining;
        if (delta <= 0n) {
          setStatus("Nothing left to drip.");
          return;
        }
        setStatus("Proving the confidential drip…");
        const rRemNew = randomBlinding();
        const rEarnNew = randomBlinding();
        const newRemaining = remaining - delta;
        const newEarned = earned + delta;
        const [newRemC, newEarnC, proof] = await Promise.all([
          commit(newRemaining, rRemNew),
          commit(newEarned, rEarnNew),
          proveDrip({
            senderOld: remaining,
            rSenderOld: BigInt(payload.rRemaining),
            rSenderNew: rRemNew,
            recipientOld: earned,
            rRecipientOld: BigInt(payload.rEarned),
            rRecipientNew: rEarnNew,
            delta,
          }),
        ]);

        const next: PrivateStreamPayload = {
          ...payload,
          remainingBase: newRemaining.toString(),
          rRemaining: rRemNew.toString(),
          earnedBase: newEarned.toString(),
          rEarned: rEarnNew.toString(),
        };
        setStatus("Re-encrypting secrets for both wallets…");
        const envelope = await encryptSecrets({
          suiClient: client,
          sealNamespace: originalPackageId,
          sender: stream.sender,
          freelancer: stream.freelancer,
          payload: next,
        });

        setStatus("Submitting drip…");
        await execute(
          buildConfidentialDripV2({
            packageId,
            coinType: stream.coinType,
            streamId: stream.id,
            newRemainingCommitment: newRemC,
            newEarnedCommitment: newEarnC,
            transferProof: proof.proof,
            encryptedSecrets: envelope,
          }),
          {
            onSuccess: () => {
              setPayload(stream.id, next);
              persistLocal(stream.id, next);
              setStatus(`Dripped ${usd(delta)} — hidden on-chain ✓`);
              refetch();
            },
            onError: (e) => setStatus(e.message),
          }
        );
      } catch (e) {
        setStatus(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [addr, client, originalPackageId, packageId, execute, setPayload, persistLocal, refetch]
  );

  /** Freelancer cashes out their hidden earned balance. */
  const onClaim = useCallback(
    async (stream: PrivateStreamOnChain, payload: PrivateStreamPayload) => {
      if (!addr) return;
      const earned = BigInt(payload.earnedBase);
      if (earned <= 0n) {
        setStatus("Nothing to claim yet — wait for a drip.");
        return;
      }
      setBusy(stream.id);
      try {
        setStatus("Proving the claim…");
        const unwrap = await proveUnwrap(earned, BigInt(payload.rEarned));
        const resetR = randomBlinding();
        const resetC = await commit(0n, resetR);

        const next: PrivateStreamPayload = {
          ...payload,
          earnedBase: "0",
          rEarned: resetR.toString(),
        };
        const envelope = await encryptSecrets({
          suiClient: client,
          sealNamespace: originalPackageId,
          sender: stream.sender,
          freelancer: stream.freelancer,
          payload: next,
        });

        setStatus("Submitting claim…");
        await execute(
          buildClaimV2({
            packageId,
            coinType: stream.coinType,
            streamId: stream.id,
            amount: earned,
            unwrapProof: unwrap.proof,
            resetCommitment: resetC,
            recipient: addr,
            encryptedSecrets: envelope,
          }),
          {
            onSuccess: () => {
              setPayload(stream.id, next);
              persistLocal(stream.id, next);
              setStatus(`Claimed ${usd(earned)} to your wallet ✓`);
              refetch();
            },
            onError: (e) => setStatus(e.message),
          }
        );
      } catch (e) {
        setStatus(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [addr, client, originalPackageId, packageId, execute, setPayload, persistLocal, refetch]
  );

  const onRaise = useCallback(
    (stream: PrivateStreamOnChain) => {
      setBusy(stream.id);
      setStatus("Raising milestone for review…");
      execute(
        buildConfRaiseCompletion({
          packageId,
          coinType: stream.coinType,
          streamId: stream.id,
        }),
        {
          onSuccess: () => {
            setStatus("Milestone raised — awaiting client approval.");
            refetch();
          },
          onError: (e) => setStatus(e.message),
          onSettled: () => setBusy(null),
        }
      );
    },
    [execute, packageId, refetch]
  );

  const onApprove = useCallback(
    (stream: PrivateStreamOnChain) => {
      const capId = caps.get(stream.id);
      if (!capId) {
        setStatus("StreamCap not found in this wallet.");
        return;
      }
      setBusy(stream.id);
      setStatus("Approving milestone…");
      execute(
        buildConfApproveMilestone({
          packageId,
          coinType: stream.coinType,
          streamId: stream.id,
          capId,
        }),
        {
          onSuccess: () => {
            setStatus("Milestone approved — dripping resumed.");
            refetch();
          },
          onError: (e) => setStatus(e.message),
          onSettled: () => setBusy(null),
        }
      );
    },
    [caps, execute, packageId, refetch]
  );

  const onDispute = useCallback(
    (stream: PrivateStreamOnChain) => {
      setBusy(stream.id);
      execute(
        buildConfDispute({
          packageId,
          coinType: stream.coinType,
          streamId: stream.id,
        }),
        {
          onSuccess: () => {
            setStatus("Stream paused pending arbitration.");
            refetch();
          },
          onError: (e) => setStatus(e.message),
          onSettled: () => setBusy(null),
        }
      );
    },
    [execute, packageId, refetch]
  );

  if (!addr) return null;
  if (isLoading) return null;
  if (!streams || streams.length === 0) return null;

  return (
    <Card title="Private streams 🔒" padded={false}>
      <p className="px-5 pt-4 text-[11px] text-[#2b2a5e]/55">
        Amounts hidden on-chain — values below are decrypted locally
        {role === "freelancer" ? " via Seal" : ""} and never leave this device.
      </p>
      <div className="flex flex-col">
        {streams.map((s) => {
          const payload = unlocked.get(s.id);
          const working = busy === s.id || isPending;
          const stateLabel = STATE_LABELS[s.state] ?? "locked";
          return (
            <div
              key={s.id}
              className="grid grid-cols-1 gap-4 border-t border-[#2b2a5e]/10 p-5 md:grid-cols-[1fr_auto] md:items-center"
            >
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={scan(s.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[13px] text-[#5b54e6] underline"
                  >
                    {short(s.id)}
                  </a>
                  <StateBadge state={stateLabel} />
                  <span className="text-[11px] text-[#2b2a5e]/50">
                    milestone {Math.min(s.currentMilestone + 1, s.nMilestones)}/
                    {s.nMilestones}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-[#2b2a5e]/40">
                    amounts hidden
                  </span>
                </div>
                <div className="flex flex-wrap gap-5 text-[12px] text-[#2b2a5e]/70">
                  <span>
                    reserve <strong className="tabular">{usd(s.reserve)}</strong>
                  </span>
                  {payload ? (
                    <>
                      <span>
                        remaining{" "}
                        <strong className="tabular">
                          {usd(BigInt(payload.remainingBase))}
                        </strong>
                      </span>
                      <span>
                        earned{" "}
                        <strong className="tabular">
                          {usd(BigInt(payload.earnedBase))}
                        </strong>
                      </span>
                    </>
                  ) : (
                    <span className="text-[#2b2a5e]/45">
                      remaining / earned encrypted
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {!payload && (
                  <button
                    onClick={() => unlock(s)}
                    disabled={working}
                    className="bg-[#2b2a5e] px-4 py-2 text-[11px] uppercase tracking-[0.1em] text-white hover:opacity-90 disabled:opacity-40"
                  >
                    {working ? "…" : "decrypt 🔓"}
                  </button>
                )}
                {payload && s.state === 2 && (
                  <button
                    onClick={() => onDrip(s, payload)}
                    disabled={working}
                    className="border border-[#5b54e6] px-4 py-2 text-[11px] uppercase tracking-[0.1em] text-[#5b54e6] hover:bg-[#5b54e6]/[0.06] disabled:opacity-40"
                  >
                    drip hidden
                  </button>
                )}
                {role === "freelancer" && s.state === 2 && (
                  <button
                    onClick={() => onRaise(s)}
                    disabled={working}
                    className="border border-[#2b2a5e]/30 px-4 py-2 text-[11px] uppercase tracking-[0.1em] text-[#2b2a5e]/80 hover:border-[#5b54e6] disabled:opacity-40"
                  >
                    raise milestone
                  </button>
                )}
                {role === "freelancer" && payload && (
                  <button
                    onClick={() => onClaim(s, payload)}
                    disabled={working || BigInt(payload.earnedBase) <= 0n}
                    className="bg-[#1d9e75] px-4 py-2 text-[11px] uppercase tracking-[0.1em] text-white hover:opacity-90 disabled:opacity-40"
                  >
                    claim {usd(BigInt(payload.earnedBase))}
                  </button>
                )}
                {role === "sender" && s.state === 1 && (
                  <button
                    onClick={() => onApprove(s)}
                    disabled={working}
                    className="bg-[#1d9e75] px-4 py-2 text-[11px] uppercase tracking-[0.1em] text-white hover:opacity-90 disabled:opacity-40"
                  >
                    {working ? "…" : "approve"}
                  </button>
                )}
                {(s.state === 1 || s.state === 2) && (
                  <button
                    onClick={() => onDispute(s)}
                    disabled={working}
                    className="border border-[#c0533a] px-4 py-2 text-[11px] uppercase tracking-[0.1em] text-[#c0533a] hover:bg-[#c0533a]/[0.06] disabled:opacity-40"
                  >
                    dispute
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {status && (
        <p className="break-words border-t border-[#2b2a5e]/10 px-5 py-3 text-[11px] text-[#2b2a5e]/70">
          {status}
        </p>
      )}
    </Card>
  );
}
