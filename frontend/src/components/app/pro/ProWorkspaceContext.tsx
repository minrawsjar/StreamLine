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
import { useCurrentAccount } from "@mysten/dapp-kit";

import {
  loadProWorkspace,
  pushActivity,
  saveProWorkspace,
  seedWorkspace,
} from "@/lib/pro-workspace-store";
import { onProAction } from "./pro-actions";
import {
  EMPTY_ALLOCATION,
  YIELD_APY,
  coverageFloor,
  investableIdle,
  newId,
  poolTotal,
  type ProCadence,
  type ProPoolBucket,
  type ProStreamGroup,
  type ProWorker,
  type ProWorkerStatus,
  type ProWorkspace,
  workerClaimable,
  workspaceMonthlyCommitted,
} from "./types";

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
  setWorkerStatus: (workerId: string, status: ProWorkerStatus) => void;
  fundPool: (amount: number) => void;
  withdrawExcess: (amount: number) => void;
  investIdle: (amount: number, bucket?: ProPoolBucket) => void;
  rebalance: (from: ProPoolBucket, to: ProPoolBucket, amount: number) => void;
  simulateClaim: (workerId: string) => void;
  resetDemo: () => void;
  totals: {
    poolBalance: number;
    monthly: number;
    active: number;
    claimable: number;
    yieldEarned: number;
    displayTotal: number;
    investable: number;
    floor: number;
  };
};

const ProWorkspaceContext = createContext<ProWorkspaceContextValue | null>(null);

export function ProWorkspaceProvider({ children }: { children: ReactNode }) {
  const account = useCurrentAccount();
  const address = account?.address ?? "";
  const [workspace, setWorkspace] = useState<ProWorkspace>(() => ({
    version: 2,
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
  }));
  const [hydrated, setHydrated] = useState(false);
  const [tick, setTick] = useState(0);
  const [modal, setModal] = useState<ModalKind>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!address) {
      setHydrated(true);
      return;
    }
    setWorkspace(loadProWorkspace(address));
    setHydrated(true);
  }, [address]);

  useEffect(() => {
    if (!hydrated || !address) return;
    saveProWorkspace(address, workspace);
  }, [workspace, address, hydrated]);

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

  // Accrue simulated yield on vault allocation each second.
  useEffect(() => {
    if (!hydrated || !address) return;
    const vault = workspace.pool.allocation.yield_vault;
    if (vault <= 0) return;
    const perSec = vault * (YIELD_APY / 365 / 24 / 3600);
    setWorkspace((prev) => ({
      ...prev,
      yieldEarned: prev.yieldEarned + perSec,
    }));
    // Only tick-driven; intentionally omit workspace from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, hydrated, address]);

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
    (workerId: string, status: ProWorkerStatus) => {
      mutate((prev) => {
        const worker = prev.workers.find((w) => w.id === workerId);
        if (!worker) return prev;
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
            const resumed: ProWorker = {
              ...w,
              status: "dripping",
              pausedAt: undefined,
              startedAt: w.startedAt ?? now,
              totalPausedMs: (w.totalPausedMs ?? 0) + pauseSpan,
            };
            return resumed;
          }
          return { ...w, status };
        });
        const kind =
          status === "paused"
            ? ("paused" as const)
            : status === "dripping"
              ? ("resumed" as const)
              : status === "stopped"
                ? ("stopped" as const)
                : ("paused" as const);
        return pushActivity(
          { ...prev, workers: nextWorkers },
          {
            kind,
            label: `${status === "dripping" ? "Resumed" : status === "paused" ? "Paused" : "Stopped"} ${worker.alias}`,
          }
        );
      });
    },
    [mutate]
  );

  const fundPool = useCallback(
    (amount: number) => {
      if (amount <= 0) return;
      mutate((prev) => {
        const pending = prev.workers.filter((w) => w.status === "pending");
        const now = Date.now();
        const workers = prev.workers.map((w) => {
          if (w.status !== "pending") return w;
          const share =
            pending.reduce((s, x) => s + x.monthlyUsd, 0) > 0
              ? (w.monthlyUsd /
                  pending.reduce((s, x) => s + x.monthlyUsd, 0)) *
                amount *
                0.35
              : 0;
          return {
            ...w,
            status: "dripping" as const,
            startedAt: now,
            budget: w.budget + share,
          };
        });
        const next: ProWorkspace = {
          ...prev,
          workers,
          pool: {
            ...prev.pool,
            funded: prev.pool.funded + amount,
            allocation: {
              ...prev.pool.allocation,
              idle: prev.pool.allocation.idle + amount,
            },
          },
        };
        return pushActivity(next, {
          kind: "funded",
          label: "Funded payroll pool",
          amount,
        });
      });
    },
    [mutate]
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

  const investIdle = useCallback(
    (amount: number, bucket: ProPoolBucket = "yield_vault") => {
      mutate((prev) => {
        const max = investableIdle(prev);
        const take = Math.min(amount, max);
        if (take <= 0 || bucket === "idle") return prev;
        const next: ProWorkspace = {
          ...prev,
          pool: {
            ...prev.pool,
            allocation: {
              ...prev.pool.allocation,
              idle: prev.pool.allocation.idle - take,
              [bucket]: prev.pool.allocation[bucket] + take,
            },
          },
        };
        return pushActivity(next, {
          kind: "invested",
          label:
            bucket === "yield_vault"
              ? "Routed idle capital into yield vault"
              : "Moved capital into reserve",
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

  const simulateClaim = useCallback(
    (workerId: string) => {
      mutate((prev) => {
        const worker = prev.workers.find((w) => w.id === workerId);
        if (!worker) return prev;
        const claimable = workerClaimable(worker, Date.now());
        if (claimable <= 0) return prev;
        let remaining = claimable;
        const alloc = { ...prev.pool.allocation };
        const order: ProPoolBucket[] = ["idle", "reserve", "yield_vault"];
        for (const b of order) {
          const take = Math.min(remaining, alloc[b]);
          alloc[b] -= take;
          remaining -= take;
          if (remaining <= 0) break;
        }
        if (remaining > 0) return prev;
        const workers = prev.workers.map((w) =>
          w.id === workerId
            ? { ...w, streamedUsd: w.streamedUsd + claimable }
            : w
        );
        const next: ProWorkspace = {
          ...prev,
          workers,
          pool: {
            ...prev.pool,
            streamed: prev.pool.streamed + claimable,
            allocation: alloc,
          },
        };
        return pushActivity(next, {
          kind: "claimed",
          label: `${worker.alias} claimed earnings`,
          amount: claimable,
        });
      });
    },
    [mutate]
  );

  const resetDemo = useCallback(() => {
    if (!address) return;
    setWorkspace(seedWorkspace());
  }, [address]);

  const totals = useMemo(() => {
    const poolBalance = poolTotal(workspace.pool) + workspace.yieldEarned;
    const monthly = workspaceMonthlyCommitted(workspace);
    const active = workspace.workers.filter((w) => w.status === "dripping").length;
    const claimable = workspace.workers.reduce(
      (sum, w) => sum + workerClaimable(w, nowMs),
      0
    );
    return {
      poolBalance,
      monthly,
      active,
      claimable,
      yieldEarned: workspace.yieldEarned,
      displayTotal: poolBalance,
      investable: investableIdle(workspace),
      floor: coverageFloor(workspace),
    };
  }, [workspace, nowMs]);

  const value: ProWorkspaceContextValue = {
    address,
    workspace,
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
    fundPool,
    withdrawExcess,
    investIdle,
    rebalance,
    simulateClaim,
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
