"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import type { Transaction } from "@mysten/sui/transactions";

import {
  loadProWorkspace,
  pushActivity,
  saveProWorkspace,
  emptyWorkspace,
} from "@/lib/pro-workspace-store";
import { useStreams, type StreamRecord } from "@/lib/indexer";
import { useGaslessExecute } from "@/lib/use-gasless";
import { useNetworkVariable } from "@/lib/networks";
import {
  buildCreateStreamFromTreasuryV2,
  buildOpenTreasury,
  buildTreasuryDeposit,
  buildTreasuryWithdraw,
  buildTreasuryDivestWithdraw,
  buildTreasuryDivest,
  buildTreasuryToReserve,
  buildTreasuryFromReserve,
  buildReserveToYield,
  buildYieldToReserve,
  buildTreasuryInvest,
  buildSuspendPayroll,
  buildResumePayroll,
  buildStopPayroll,
  buildApproveMilestone,
  buildCancelToTreasury,
  DEFAULT_STREAM_YIELD_BPS,
} from "@/lib/streamline-tx";
import { findCreatedTreasury, useTreasuryState } from "@/lib/treasury";
import { USDC_BASE, toBaseUnits } from "@/lib/stream-math";
import { onProAction } from "./pro-actions";
import {
  EMPTY_ALLOCATION,
  YIELD_APY,
  coverageFloor,
  investableIdle,
  newId,
  poolTotal,
  streamStateToWorkerStatus,
  type ProCadence,
  type ProPoolBucket,
  type ProStreamGroup,
  type ProWorker,
  type ProWorkerStatus,
  type ProWorkspace,
  workerClaimable,
  workspaceMonthlyCommitted,
} from "./types";

/** Runway a worker's locked stream should cover, by pay cadence. */
// ponytail: fixed runway per cadence; make per-worker configurable if needed.
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const CADENCE_DURATION_MS: Record<ProCadence, number> = {
  MONTHLY: MONTH_MS,
  HOURLY: 7 * 24 * 60 * 60 * 1000,
};

type ModalKind =
  | null
  | "fund"
  | "withdraw"
  | "invest"
  | "worker"
  | "group"
  | { kind: "worker-edit"; workerId: string }
  | { kind: "group-edit"; groupId: string };

type ProWorkspaceContextValue = {
  address: string;
  /** True when browsing seeded sample payroll without a wallet. */
  isDemo: boolean;
  workspace: ProWorkspace;
  hydrated: boolean;
  tick: number;
  nowMs: number;
  modal: ModalKind;
  setModal: (m: ModalKind) => void;
  setOrgName: (name: string) => void;
  upsertGroup: (input: {
    id?: string;
    name: string;
    description?: string;
  }) => void;
  deleteGroup: (groupId: string) => void;
  upsertWorker: (input: {
    id?: string;
    alias: string;
    walletAddress: string;
    groupId: string | null;
    monthlyUsd: number;
    cadence: ProCadence;
    budget?: number;
    status?: ProWorkerStatus;
  }) => void;
  deleteWorker: (workerId: string) => void;
  setWorkerStatus: (workerId: string, status: ProWorkerStatus) => Promise<boolean>;
  /** Lock the worker's budget from the treasury pool and record the stream id. */
  createWorkerStream: (workerId: string) => Promise<boolean>;
  /** Approve a review-ready stream on-chain so it starts dripping (Start). */
  approveStream: (streamId: string) => Promise<boolean>;
  /** Cancel a treasury stream on-chain, refunding the remainder to the pool (Delete). */
  cancelStream: (streamId: string) => Promise<boolean>;
  /** Deposit USDC into the on-chain treasury (opens one on first use). */
  fundTreasury: (amount: number) => Promise<boolean>;
  /** Withdraw idle float from the on-chain treasury. */
  withdrawTreasury: (amount: number) => Promise<boolean>;
  /** Move idle float into the yield vault on-chain. */
  investTreasury: (amount: number) => Promise<boolean>;
  /** Redeem the whole yield-vault position back to liquid on-chain. */
  divestTreasury: () => Promise<boolean>;
  /** Real on-chain reserve legs of Rebalance (any leg touching `reserve`). */
  rebalanceReserve: (
    from: ProPoolBucket,
    to: ProPoolBucket,
    amount: number
  ) => Promise<boolean>;
  /** True while a treasury/stream tx is in flight. */
  creating: boolean;
  withdrawExcess: (amount: number) => void;
  rebalance: (from: ProPoolBucket, to: ProPoolBucket, amount: number) => void;
  resetDemo: () => void;
  totals: {
    poolBalance: number;
    monthly: number;
    active: number;
    claimable: number;
    yieldEarned: number;
    displayTotal: number;
    investable: number;
    withdrawable: number;
    floor: number;
  };
};

const ProWorkspaceContext = createContext<ProWorkspaceContextValue | null>(null);

/** Find the StreamCap the caller owns for a given stream — needed to approve
 *  or cancel it on-chain. StreamCap type is pinned to the original package. */
async function findStreamCap(
  client: ReturnType<typeof useSuiClient>,
  owner: string,
  originalPackageId: string,
  streamId: string
): Promise<string | null> {
  if (!owner || !originalPackageId || originalPackageId === "0x0") return null;
  let cursor: string | null | undefined = undefined;
  for (let page = 0; page < 5; page++) {
    const res = await client.getOwnedObjects({
      owner,
      filter: { StructType: `${originalPackageId}::stream::StreamCap` },
      options: { showContent: true },
      cursor,
    });
    for (const o of res.data) {
      const c = o.data?.content;
      if (c?.dataType !== "moveObject") continue;
      if ((c.fields as Record<string, unknown>).stream_id === streamId) {
        return o.data?.objectId ?? null;
      }
    }
    if (!res.hasNextPage) break;
    cursor = res.nextCursor;
  }
  return null;
}

export function ProWorkspaceProvider({
  children,
  demo = false,
}: {
  children: ReactNode;
  /** Explore-demo mode: seeded sample payroll, no wallet required. */
  demo?: boolean;
}) {
  const account = useCurrentAccount();
  const address = account?.address ?? "";
  const isDemo = demo && !address;
  const [workspace, setWorkspace] = useState<ProWorkspace>(() =>
    isDemo
      ? emptyWorkspace()
      : {
          version: 3,
          orgName: "",
          groups: [],
          workers: [],
          pool: {
            token: "USDC",
            funded: 0,
            streamed: 0,
            allocation: { ...EMPTY_ALLOCATION },
            coverageWeeks: 2,
          },
          activity: [],
          yieldEarned: 0,
          updatedAt: 0,
        }
  );
  const [hydrated, setHydrated] = useState(false);
  const [tick, setTick] = useState(0);
  const [modal, setModal] = useState<ModalKind>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Real on-chain streams this org created, from the indexer. Poll keeps the
  // reconciled view (streamed/status/pool) fresh as the keeper drips.
  const { data: chainStreams } = useStreams({ sender: address });
  const packageId = useNetworkVariable("packageId");
  const usdcType = useNetworkVariable("usdcType");
  const yieldVaultId = useNetworkVariable("yieldVaultId");
  const originalPackageId = useNetworkVariable("originalPackageId");
  const suiClient = useSuiClient();
  const { execute, isPending: creating } = useGaslessExecute();

  // Live treasury (Pro pool) state — real idle + invested USDC on-chain.
  const { data: treasury, dataUpdatedAt: treasuryUpdatedAt } = useTreasuryState(suiClient, {
    packageId,
    usdcType,
    treasuryId: isDemo ? undefined : workspace.treasuryId,
    vaultId: yieldVaultId,
    sender: address,
  });

  useEffect(() => {
    if (isDemo) {
      setWorkspace(emptyWorkspace());
      setHydrated(true);
      return;
    }
    if (!address) {
      setHydrated(true);
      return;
    }
    // Real login: persisted workspace or empty — never auto-seed mock payroll.
    setWorkspace(loadProWorkspace(address));
    setHydrated(true);
  }, [address, isDemo]);

  useEffect(() => {
    if (!hydrated || !address || isDemo) return;
    saveProWorkspace(address, workspace);
  }, [workspace, address, hydrated, isDemo]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    return onProAction((action) => {
      if (action === "fund") setModal("fund");
      else if (action === "withdraw") setModal("withdraw");
      else if (action === "invest" || action === "analytics") setModal("invest");
    });
  }, []);

  // Accrue simulated yield on vault allocation each second — demo / pre-treasury only.
  useEffect(() => {
    if (!hydrated || workspace.treasuryId) return;
    if (!isDemo && !address) return;
    const vault = workspace.pool.allocation.yield_vault;
    if (vault <= 0) return;
    const perSec = vault * (YIELD_APY / 365 / 24 / 3600);
    setWorkspace((prev) => ({
      ...prev,
      yieldEarned: prev.yieldEarned + perSec,
    }));
    // Only tick-driven; intentionally omit workspace from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, hydrated, address, isDemo]);

  const mutate = useCallback((fn: (prev: ProWorkspace) => ProWorkspace) => {
    setWorkspace((prev) => fn(prev));
  }, []);

  const setOrgName = useCallback(
    (name: string) => mutate((prev) => ({ ...prev, orgName: name })),
    [mutate]
  );

  const upsertGroup = useCallback(
    (input: { id?: string; name: string; description?: string }) => {
      mutate((prev) => {
        if (input.id) {
          return {
            ...prev,
            groups: prev.groups.map((g) =>
              g.id === input.id
                ? { ...g, name: input.name, description: input.description }
                : g
            ),
          };
        }
        const group: ProStreamGroup = {
          id: newId("grp"),
          name: input.name,
          description: input.description,
          createdAt: Date.now(),
        };
        return { ...prev, groups: [...prev.groups, group] };
      });
    },
    [mutate]
  );

  const deleteGroup = useCallback(
    (groupId: string) => {
      mutate((prev) => ({
        ...prev,
        groups: prev.groups.filter((g) => g.id !== groupId),
        workers: prev.workers.map((w) =>
          w.groupId === groupId ? { ...w, groupId: null } : w
        ),
      }));
    },
    [mutate]
  );

  const upsertWorker = useCallback(
    (input: {
      id?: string;
      alias: string;
      walletAddress: string;
      groupId: string | null;
      monthlyUsd: number;
      cadence: ProCadence;
      budget?: number;
      status?: ProWorkerStatus;
    }) => {
      mutate((prev) => {
        if (input.id) {
          return {
            ...prev,
            workers: prev.workers.map((w) =>
              w.id === input.id
                ? {
                    ...w,
                    alias: input.alias,
                    walletAddress: input.walletAddress,
                    groupId: input.groupId,
                    monthlyUsd: input.monthlyUsd,
                    cadence: input.cadence,
                    budget: input.budget ?? w.budget,
                    status: input.status ?? w.status,
                  }
                : w
            ),
          };
        }
        const worker: ProWorker = {
          id: newId("w"),
          alias: input.alias,
          walletAddress: input.walletAddress,
          groupId: input.groupId,
          monthlyUsd: input.monthlyUsd,
          cadence: input.cadence,
          budget: input.budget ?? 0,
          streamedUsd: 0,
          status: input.status ?? "pending",
        };
        return pushActivity(
          { ...prev, workers: [...prev.workers, worker] },
          { kind: "worker_added", label: `Added ${input.alias} to roster` }
        );
      });
    },
    [mutate]
  );

  const deleteWorker = useCallback(
    (workerId: string) => {
      mutate((prev) => ({
        ...prev,
        workers: prev.workers.filter((w) => w.id !== workerId),
      }));
    },
    [mutate]
  );

  const setWorkerStatus = useCallback(
    async (workerId: string, status: ProWorkerStatus): Promise<boolean> => {
      const worker = workspace.workers.find((w) => w.id === workerId);
      if (!worker) return false;

      // Demo / local-only workers: UI state only.
      if (isDemo || !worker.streamId || !packageId || packageId === "0x0") {
        mutate((prev) => {
          const now = Date.now();
          const nextWorkers = prev.workers.map((w) => {
            if (w.id !== workerId) return w;
            if (status === "paused" || status === "stopped") {
              return { ...w, status, pausedAt: now };
            }
            if (status === "dripping") {
              const pauseSpan =
                w.pausedAt && (w.status === "paused" || w.status === "stopped")
                  ? now - w.pausedAt
                  : 0;
              return {
                ...w,
                status: "dripping" as const,
                pausedAt: undefined,
                startedAt: w.startedAt ?? now,
                totalPausedMs: (w.totalPausedMs ?? 0) + pauseSpan,
              };
            }
            return { ...w, status };
          });
          return pushActivity(
            { ...prev, workers: nextWorkers },
            {
              kind:
                status === "paused"
                  ? "paused"
                  : status === "dripping"
                    ? "resumed"
                    : "stopped",
              label: `${status === "dripping" ? "Resumed" : status === "paused" ? "Paused" : "Stopped"} ${worker.alias}`,
            }
          );
        });
        return true;
      }

      const ref = {
        packageId,
        usdcType,
        streamId: worker.streamId,
      };
      let tx;
      if (status === "paused") {
        tx = buildSuspendPayroll(ref);
      } else if (status === "dripping") {
        tx = buildResumePayroll(ref);
      } else if (status === "stopped") {
        const tid = workspace.treasuryId;
        if (!tid) return false;
        tx = buildStopPayroll({ ...ref, treasuryId: tid });
      } else {
        return false;
      }

      let ok = false;
      await execute(tx, {
        onSuccess: () => {
          ok = true;
          const now = Date.now();
          mutate((prev) => {
            const nextWorkers = prev.workers.map((w) => {
              if (w.id !== workerId) return w;
              if (status === "paused" || status === "stopped") {
                return { ...w, status, pausedAt: now };
              }
              if (status === "dripping") {
                const pauseSpan =
                  w.pausedAt && (w.status === "paused" || w.status === "stopped")
                    ? now - w.pausedAt
                    : 0;
                return {
                  ...w,
                  status: "dripping" as const,
                  pausedAt: undefined,
                  startedAt: w.startedAt ?? now,
                  totalPausedMs: (w.totalPausedMs ?? 0) + pauseSpan,
                };
              }
              return { ...w, status };
            });
            return pushActivity(
              { ...prev, workers: nextWorkers },
              {
                kind:
                  status === "paused"
                    ? "paused"
                    : status === "dripping"
                      ? "resumed"
                      : "stopped",
                label: `${status === "dripping" ? "Resumed" : status === "paused" ? "Paused" : "Stopped"} ${worker.alias}`,
              }
            );
          });
        },
        onError: () => {
          ok = false;
        },
      });
      return ok;
    },
    [
      workspace.workers,
      workspace.treasuryId,
      isDemo,
      packageId,
      usdcType,
      execute,
      mutate,
    ]
  );

  // Ensure the org has an on-chain treasury, opening one on first use.
  const ensureTreasury = useCallback(async (): Promise<string | null> => {
    if (!address) throw new Error("No wallet connected");
    if (!packageId || packageId === "0x0") throw new Error("Package not deployed");
    if (workspace.treasuryId) return workspace.treasuryId;
    const tx = buildOpenTreasury({ packageId, usdcType, sender: address });
    // execute() calls onSuccess synchronously before it resolves, so capture the
    // digest here and resolve the object id AFTER the await — doing it inside the
    // (un-awaited) callback races the return.
    let digest: string | null = null;
    let err: Error | null = null;
    await execute(tx, {
      onSuccess: ({ digest: d }) => {
        digest = d;
      },
      onError: (e) => {
        err = e;
      },
    });
    if (err) throw err;
    if (!digest) throw new Error("Treasury open returned no digest");
    const id = await findCreatedTreasury(suiClient, digest);
    if (!id) throw new Error("Opened treasury but could not read its id");
    mutate((prev) => ({ ...prev, treasuryId: id }));
    return id;
  }, [address, packageId, usdcType, workspace.treasuryId, execute, suiClient, mutate]);

  const createWorkerStream = useCallback(
    async (workerId: string): Promise<boolean> => {
      if (!address) return false;
      const worker = workspace.workers.find((w) => w.id === workerId);
      if (!worker) return false;
      if (worker.streamId) return true;
      if (!packageId || packageId === "0x0") return false;
      const budget = worker.budget > 0 ? worker.budget : worker.monthlyUsd;
      if (budget <= 0) return false;

      let tid: string | null = null;
      try {
        tid = await ensureTreasury();
      } catch {
        return false;
      }
      if (!tid) return false;

      const totalBase = toBaseUnits(budget);
      const vaultId =
        yieldVaultId && yieldVaultId !== "0x0" ? yieldVaultId : undefined;
      const tx = buildCreateStreamFromTreasuryV2({
        packageId,
        usdcType,
        sender: address,
        freelancer: worker.walletAddress,
        treasuryId: tid,
        vaultId,
        milestoneNames: [`${worker.alias} payroll`],
        milestoneAmountsBase: [totalBase],
        totalBase,
        durationMs: CADENCE_DURATION_MS[worker.cadence],
        yieldBps: DEFAULT_STREAM_YIELD_BPS,
      });

      let ok = false;
      await execute(tx, {
        onSuccess: () => {
          ok = true;
          mutate((prev) =>
            pushActivity(
              {
                ...prev,
                workers: prev.workers.map((w) =>
                  w.id === workerId
                    ? {
                        ...w,
                        status: "dripping" as const,
                        startedAt: Date.now(),
                        budget,
                      }
                    : w
                ),
              },
              {
                kind: "resumed",
                label: `Hired ${worker.alias} from treasury`,
                amount: budget,
              }
            )
          );
        },
        onError: () => {
          ok = false;
        },
      });
      return ok;
    },
    [
      address,
      workspace.workers,
      packageId,
      usdcType,
      yieldVaultId,
      execute,
      mutate,
      ensureTreasury,
    ]
  );

  // Run a treasury tx, mutating on success and throwing the real error on
  // failure (so the modal can show it instead of silently no-op'ing).
  const runTreasuryTx = useCallback(
    async (tx: Transaction, activity: Parameters<typeof pushActivity>[1]) => {
      let err: Error | null = null;
      await execute(tx, {
        onSuccess: () => mutate((prev) => pushActivity(prev, activity)),
        onError: (e) => {
          err = e;
        },
      });
      if (err) throw err;
      return true;
    },
    [execute, mutate]
  );

  const fundTreasury = useCallback(
    async (amount: number): Promise<boolean> => {
      if (amount <= 0) return false;
      const tid = await ensureTreasury();
      return runTreasuryTx(
        buildTreasuryDeposit({
          packageId,
          usdcType,
          sender: address,
          treasuryId: tid!,
          amountBase: toBaseUnits(amount),
        }),
        { kind: "funded", label: "Funded treasury on-chain", amount }
      );
    },
    [ensureTreasury, runTreasuryTx, packageId, usdcType, address]
  );

  const withdrawTreasury = useCallback(
    async (amount: number): Promise<boolean> => {
      if (amount <= 0) return false;
      if (!workspace.treasuryId) throw new Error("No treasury to withdraw from");
      const amountBase = toBaseUnits(amount);
      // treasury::withdraw only spends idle. If the request exceeds liquid but the
      // rest is in the yield vault, redeem the vault back to idle first (same PTB).
      const needsDivest =
        amountBase > toBaseUnits(treasury?.idle ?? 0) && (treasury?.invested ?? 0) > 0;
      const tx = needsDivest
        ? buildTreasuryDivestWithdraw({
            packageId,
            usdcType,
            sender: address,
            treasuryId: workspace.treasuryId,
            vaultId: yieldVaultId,
            amountBase,
          })
        : buildTreasuryWithdraw({
            packageId,
            usdcType,
            sender: address,
            treasuryId: workspace.treasuryId,
            amountBase,
          });
      return runTreasuryTx(tx, {
        kind: "withdrawn",
        label: "Withdrew from treasury",
        amount,
      });
    },
    [workspace.treasuryId, treasury, yieldVaultId, runTreasuryTx, packageId, usdcType, address]
  );

  const investTreasury = useCallback(
    async (amount: number): Promise<boolean> => {
      if (amount <= 0) return false;
      if (!workspace.treasuryId) throw new Error("Fund the pool first");
      await runTreasuryTx(
        buildTreasuryInvest({
          packageId,
          usdcType,
          sender: address,
          treasuryId: workspace.treasuryId,
          vaultId: yieldVaultId,
          amountBase: toBaseUnits(amount),
        }),
        { kind: "invested", label: "Moved idle into yield vault", amount }
      );
      mutate((prev) => ({
        ...prev,
        investedPrincipal: (prev.investedPrincipal ?? 0) + amount,
      }));
      return true;
    },
    [workspace.treasuryId, runTreasuryTx, packageId, usdcType, address, yieldVaultId, mutate]
  );

  // Redeem the entire yield-vault position back to liquid (the Yield → Liquid
  // leg of Rebalance). treasury::divest is all-or-nothing on-chain.
  const divestTreasury = useCallback(async (): Promise<boolean> => {
    if (!workspace.treasuryId) throw new Error("Nothing invested to divest");
    await runTreasuryTx(
      buildTreasuryDivest({
        packageId,
        usdcType,
        sender: address,
        treasuryId: workspace.treasuryId,
        vaultId: yieldVaultId,
      }),
      { kind: "rebalanced", label: "Redeemed yield vault into liquid", amount: 0 }
    );
    mutate((prev) => ({
      ...prev,
      investedPrincipal: 0,
      pool: {
        ...prev.pool,
        allocation: {
          ...prev.pool.allocation,
          idle: prev.pool.allocation.idle + prev.pool.allocation.yield_vault,
          yield_vault: 0,
        },
      },
    }));
    return true;
  }, [workspace.treasuryId, runTreasuryTx, packageId, usdcType, address, yieldVaultId, mutate]);

  // Reserve legs of Rebalance — all real on-chain now (treasury::to_reserve /
  // from_reserve, plus PTB combos for the yield legs). Liquid↔Reserve are exact
  // amount; a Yield leg rides on divest (all-or-nothing) so it folds the whole
  // vault position back to idle first.
  const rebalanceReserve = useCallback(
    async (
      from: ProPoolBucket,
      to: ProPoolBucket,
      amount: number
    ): Promise<boolean> => {
      if (amount <= 0) return false;
      if (!workspace.treasuryId) throw new Error("Fund the pool first");
      const ref = {
        packageId,
        usdcType,
        sender: address,
        treasuryId: workspace.treasuryId,
      };
      const base = toBaseUnits(amount);
      const vref = { ...ref, vaultId: yieldVaultId };
      const tx =
        from === "idle" && to === "reserve"
          ? buildTreasuryToReserve({ ...ref, amountBase: base })
          : from === "reserve" && to === "idle"
            ? buildTreasuryFromReserve({ ...ref, amountBase: base })
            : from === "reserve" && to === "yield_vault"
              ? buildReserveToYield({ ...vref, amountBase: base })
              : from === "yield_vault" && to === "reserve"
                ? buildYieldToReserve({ ...vref, amountBase: base })
                : null;
      if (!tx) throw new Error("Unsupported reserve leg");
      await runTreasuryTx(tx, {
        kind: "rebalanced",
        label: `Rebalanced ${from} → ${to}`,
        amount,
      });
      mutate((prev) => {
        const alloc = { ...prev.pool.allocation };
        let src = from;
        if (from === "yield_vault") {
          alloc.idle += alloc.yield_vault;
          alloc.yield_vault = 0;
          src = "idle";
        }
        const take = Math.min(amount, alloc[src]);
        alloc[src] -= take;
        alloc[to] += take;
        return { ...prev, pool: { ...prev.pool, allocation: alloc } };
      });
      return true;
    },
    [workspace.treasuryId, packageId, usdcType, address, yieldVaultId, runTreasuryTx, mutate]
  );

  const withdrawExcess = useCallback(
    (amount: number) => {
      mutate((prev) => {
        const floor = coverageFloor(prev);
        const max = Math.max(0, prev.pool.allocation.idle - floor);
        const take = Math.min(amount, max);
        if (take <= 0) return prev;
        const next: ProWorkspace = {
          ...prev,
          pool: {
            ...prev.pool,
            funded: Math.max(0, prev.pool.funded - take),
            allocation: {
              ...prev.pool.allocation,
              idle: prev.pool.allocation.idle - take,
            },
          },
        };
        return pushActivity(next, {
          kind: "withdrawn",
          label: "Withdrew excess above coverage floor",
          amount: take,
        });
      });
    },
    [mutate]
  );

  const rebalance = useCallback(
    (from: ProPoolBucket, to: ProPoolBucket, amount: number) => {
      mutate((prev) => {
        if (from === to) return prev;
        const take = Math.min(amount, prev.pool.allocation[from]);
        if (take <= 0) return prev;
        const next: ProWorkspace = {
          ...prev,
          pool: {
            ...prev.pool,
            allocation: {
              ...prev.pool.allocation,
              [from]: prev.pool.allocation[from] - take,
              [to]: prev.pool.allocation[to] + take,
            },
          },
        };
        return pushActivity(next, {
          kind: "rebalanced",
          label: `Rebalanced ${from} → ${to}`,
          amount: take,
        });
      });
    },
    [mutate]
  );

  // Approve a review-ready (PENDING_REVIEW) stream so it starts dripping —
  // the payer's real on-chain "Start". Resolves the StreamCap the payer holds.
  const approveStream = useCallback(
    async (streamId: string): Promise<boolean> => {
      if (!address || !packageId || packageId === "0x0") return false;
      const capId = await findStreamCap(suiClient, address, originalPackageId, streamId);
      if (!capId) return false;
      const tx = buildApproveMilestone({ packageId, usdcType, streamId, capId });
      let ok = false;
      await execute(tx, {
        onSuccess: () => {
          ok = true;
          mutate((prev) =>
            pushActivity(prev, { kind: "resumed", label: "Approved & started stream" })
          );
        },
      });
      return ok;
    },
    [address, packageId, usdcType, originalPackageId, suiClient, execute, mutate]
  );

  // Cancel a treasury-funded stream on-chain: refund the remainder to the pool,
  // close it, consume the cap. The payer's real on-chain "Delete".
  const cancelStream = useCallback(
    async (streamId: string): Promise<boolean> => {
      if (!address || !packageId || packageId === "0x0") return false;
      const tid = workspace.treasuryId;
      if (!tid) return false;
      const capId = await findStreamCap(suiClient, address, originalPackageId, streamId);
      if (!capId) return false;
      const tx = buildCancelToTreasury({
        packageId,
        usdcType,
        streamId,
        capId,
        treasuryId: tid,
      });
      let ok = false;
      await execute(tx, {
        onSuccess: () => {
          ok = true;
          mutate((prev) =>
            pushActivity(prev, { kind: "stopped", label: "Canceled stream — refunded to pool" })
          );
        },
      });
      return ok;
    },
    [address, packageId, usdcType, originalPackageId, suiClient, execute, mutate, workspace.treasuryId]
  );

  const resetDemo = useCallback(() => {
    setWorkspace(emptyWorkspace());
  }, []);

  // Read overlay: fold real on-chain stream state onto the local workspace.
  // Workers bind to their stream by explicit streamId, else by freelancer
  // address. Only real-backed fields (streamed, status, budget, pool.streamed)
  // are overridden — local org metadata (aliases, groups, allocation) is kept.
  // ponytail: matches newest stream per freelancer; parse tx effects for exact
  // streamId if a worker ever needs multiple concurrent streams.
  const workspaceView = useMemo(() => {
    const streams = chainStreams ?? [];
    // Real pool float from the on-chain treasury (idle + invested in the vault).
    const poolOverride = treasury
      ? {
          funded: treasury.idle + treasury.invested + treasury.reserve,
          allocation: {
            ...workspace.pool.allocation,
            idle: treasury.idle,
            yield_vault: treasury.invested,
            reserve: treasury.reserve,
          },
        }
      : null;
    // Real accrued yield = vault position value − principal we put in. The chain
    // is only read every 15s and 3% APR moves sub-cent per second, so interpolate
    // forward from the last read (re-anchors on each refetch) to visibly tick.
    const yieldOverride = treasury
      ? {
          yieldEarned: (() => {
            const onChain = Math.max(
              0,
              treasury.invested - (workspace.investedPrincipal ?? 0)
            );
            const perSec = treasury.invested * (YIELD_APY / 365 / 24 / 3600);
            const dt = Math.max(0, (nowMs - treasuryUpdatedAt) / 1000);
            return onChain + perSec * dt;
          })(),
        }
      : null;
    if (streams.length === 0) {
      if (!poolOverride) return workspace;
      return {
        ...workspace,
        pool: { ...workspace.pool, ...poolOverride },
        ...yieldOverride,
      };
    }
    const byFreelancer = new Map<string, StreamRecord>();
    for (const s of streams) {
      const key = s.freelancer.toLowerCase();
      const cur = byFreelancer.get(key);
      if (!cur || s.created_at_ms > cur.created_at_ms) byFreelancer.set(key, s);
    }

    // 1) Fold real state onto existing local workers.
    const claimed = new Set<string>();
    const workers = workspace.workers.map((w) => {
      const s = w.streamId
        ? streams.find((x) => x.id === w.streamId)
        : byFreelancer.get(w.walletAddress.toLowerCase());
      if (!s) return w;
      claimed.add(s.id);
      return {
        ...w,
        streamId: s.id,
        budget: s.total / USDC_BASE,
        streamedUsd: (s.total - s.remaining) / USDC_BASE,
        status: streamStateToWorkerStatus(s.state),
      };
    });

    // 2) Build roster rows from any remaining on-chain streams (real data,
    // no local worker yet). Alias/group can be edited and will persist locally.
    // Skip completed streams (state `done` → "stopped") — a finished payroll
    // isn't an active roster member, and old test streams shouldn't pile up here.
    for (const s of streams) {
      if (claimed.has(s.id)) continue;
      if (streamStateToWorkerStatus(s.state) === "stopped") continue;
      claimed.add(s.id);
      const total = s.total / USDC_BASE;
      workers.push({
        id: `chain:${s.id}`,
        alias: `${s.freelancer.slice(0, 6)}…${s.freelancer.slice(-4)}`,
        walletAddress: s.freelancer,
        groupId: null,
        monthlyUsd: total / Math.max(s.duration_ms / MONTH_MS, 1 / 30),
        cadence: "MONTHLY",
        budget: total,
        streamedUsd: (s.total - s.remaining) / USDC_BASE,
        status: streamStateToWorkerStatus(s.state),
        streamId: s.id,
        startedAt: s.created_at_ms,
      });
    }

    const streamed = workers.reduce(
      (sum, w) => sum + (w.streamId ? w.streamedUsd : 0),
      0
    );
    return {
      ...workspace,
      workers,
      pool: { ...workspace.pool, streamed, ...(poolOverride ?? {}) },
      ...yieldOverride,
    };
  }, [workspace, chainStreams, treasury, nowMs, treasuryUpdatedAt]);

  const totals = useMemo(() => {
    const poolBalance = poolTotal(workspaceView.pool) + workspaceView.yieldEarned;
    const monthly = workspaceMonthlyCommitted(workspaceView);
    const active = workspaceView.workers.filter((w) => w.status === "dripping").length;
    const claimable = workspaceView.workers.reduce(
      (sum, w) => sum + workerClaimable(w, nowMs),
      0
    );
    return {
      poolBalance,
      monthly,
      active,
      claimable,
      yieldEarned: workspaceView.yieldEarned,
      displayTotal: poolBalance,
      investable: investableIdle(workspaceView),
      // Everything above the coverage floor is withdrawable — idle now, vault funds
      // after an automatic divest.
      withdrawable: Math.max(
        0,
        poolTotal(workspaceView.pool) - coverageFloor(workspaceView)
      ),
      floor: coverageFloor(workspaceView),
    };
  }, [workspaceView, nowMs]);

  const value: ProWorkspaceContextValue = {
    address,
    isDemo,
    workspace: workspaceView,
    hydrated,
    tick,
    nowMs,
    modal,
    setModal,
    setOrgName,
    upsertGroup,
    deleteGroup,
    upsertWorker,
    deleteWorker,
    setWorkerStatus,
    createWorkerStream,
    approveStream,
    cancelStream,
    fundTreasury,
    withdrawTreasury,
    investTreasury,
    divestTreasury,
    rebalanceReserve,
    creating,
    withdrawExcess,
    rebalance,
    resetDemo,
    totals,
  };

  return (
    <ProWorkspaceContext.Provider value={value}>
      {children}
    </ProWorkspaceContext.Provider>
  );
}

export function useProWorkspace() {
  const ctx = useContext(ProWorkspaceContext);
  if (!ctx) {
    throw new Error("useProWorkspace must be used within ProWorkspaceProvider");
  }
  return ctx;
}
