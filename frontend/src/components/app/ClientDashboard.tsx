"use client";

import { useMemo, useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClientQuery,
} from "@mysten/dapp-kit";

import { useNetworkVariable } from "@/lib/networks";
import { useStreams, useLiveUpdates, type StreamRecord } from "@/lib/indexer";
import {
  buildApproveMilestone,
  buildRaiseDispute,
} from "@/lib/streamline-tx";
import { USDC_BASE } from "@/lib/stream-math";

/** Map of stream id → owned StreamCap object id, so the client can approve. */
function useStreamCaps(packageId: string) {
  const account = useCurrentAccount();
  const { data } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: account?.address ?? "",
      filter: { StructType: `${packageId}::stream::StreamCap` },
      options: { showContent: true },
    },
    { enabled: !!account && packageId !== "0x0" }
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

export function ClientDashboard() {
  const account = useCurrentAccount();
  const packageId = useNetworkVariable("packageId");
  const usdcType = useNetworkVariable("usdcType");
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { data: streams, isLoading, refetch } = useStreams({
    sender: account?.address,
  });
  const caps = useStreamCaps(packageId);
  const [busy, setBusy] = useState<string | null>(null);

  useLiveUpdates(() => refetch());

  if (isLoading) return <Panel>Loading your streams…</Panel>;
  const list = streams ?? [];
  if (list.length === 0)
    return <Panel>No streams created yet. Head to “Create stream” to lock your first.</Panel>;

  const approve = (s: StreamRecord) => {
    const capId = caps.get(s.id);
    if (!capId) {
      setBusy(`${s.id}:no-cap`);
      return;
    }
    setBusy(s.id);
    signAndExecute(
      {
        transaction: buildApproveMilestone({
          packageId,
          usdcType,
          streamId: s.id,
          capId,
        }),
      },
      { onSettled: () => setBusy(null), onSuccess: () => refetch() }
    );
  };

  const dispute = (s: StreamRecord) => {
    setBusy(s.id);
    signAndExecute(
      { transaction: buildRaiseDispute({ packageId, usdcType, streamId: s.id }) },
      { onSettled: () => setBusy(null), onSuccess: () => refetch() }
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {list.map((s) => (
        <div
          key={s.id}
          className="grid grid-cols-1 gap-4 border border-[#2b2a5e]/15 bg-white p-5 md:grid-cols-[1fr_auto] md:items-center"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[13px]">{short(s.id)}</span>
              <Badge state={s.state} />
              <span className="text-[11px] text-[#2b2a5e]/50">
                milestone {s.current_milestone + 1}/{s.n_milestones}
              </span>
            </div>
            <div className="flex gap-6 text-[12px] text-[#2b2a5e]/70">
              <span>Locked ${(s.total / USDC_BASE).toFixed(2)}</span>
              <span>Streamed ${((s.total - s.remaining) / USDC_BASE).toFixed(2)}</span>
              <span className="font-mono">→ {short(s.freelancer)}</span>
            </div>
            {busy === `${s.id}:no-cap` && (
              <span className="text-[11px] text-[#c0533a]">
                StreamCap not found in this wallet.
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {s.state === "pending_review" && (
              <button
                onClick={() => approve(s)}
                disabled={isPending}
                className="bg-[#1d9e75] px-4 py-2 text-[11px] uppercase tracking-[0.1em] text-white hover:opacity-90 disabled:opacity-40"
              >
                {busy === s.id ? "…" : "approve"}
              </button>
            )}
            {(s.state === "pending_review" || s.state === "dripping") && (
              <button
                onClick={() => dispute(s)}
                disabled={isPending}
                className="border border-[#c0533a] px-4 py-2 text-[11px] uppercase tracking-[0.1em] text-[#c0533a] hover:bg-[#c0533a]/[0.06] disabled:opacity-40"
              >
                dispute
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Badge({ state }: { state: string }) {
  const tone =
    state === "dripping"
      ? "bg-[#1d9e75] text-white"
      : state === "pending_review"
        ? "bg-[#d98a2b] text-white"
        : state === "paused"
          ? "bg-[#c0533a] text-white"
          : state === "done"
            ? "bg-[#7f77dd] text-white"
            : "bg-[#2b2a5e] text-white";
  return (
    <span className={`px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${tone}`}>
      {state.replace("_", " ")}
    </span>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-[#2b2a5e]/25 px-8 py-16 text-center text-[13px] text-[#2b2a5e]/60">
      {children}
    </div>
  );
}

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
