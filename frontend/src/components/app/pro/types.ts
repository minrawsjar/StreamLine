export type ProWorkerStatus = "dripping" | "paused" | "pending" | "stopped";
export type ProCadence = "MONTHLY" | "HOURLY";
export type ProPoolBucket = "idle" | "yield_vault" | "reserve";
export type ProActivityKind =
  | "funded"
  | "topup"
  | "invested"
  | "rebalanced"
  | "paused"
  | "resumed"
  | "stopped"
  | "claimed"
  | "withdrawn"
  | "worker_added";

export type ProStreamGroup = {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
};

export type ProWorker = {
  id: string;
  alias: string;
  walletAddress: string;
  groupId: string | null;
  /** Monthly USDC compensation (display + rate source). */
  monthlyUsd: number;
  cadence: ProCadence;
  /** Allocated runway capital for this substream. */
  budget: number;
  /** Accrued + claimed so far (for live math). */
  streamedUsd: number;
  status: ProWorkerStatus;
  startedAt?: number;
  pausedAt?: number;
  totalPausedMs?: number;
  /** On-chain stream id once funded via `create_stream_v2` (undefined = local only). */
  streamId?: string;
};

/** Map an indexer stream `state` onto a worker status for the reconciled view. */
export function streamStateToWorkerStatus(
  state: string
): ProWorkerStatus {
  switch (state) {
    case "dripping":
      return "dripping";
    case "paused":
      return "paused";
    case "done":
      return "stopped";
    default:
      return "pending"; // locked / pending_review
  }
}

export type ProPoolAllocation = Record<ProPoolBucket, number>;

export type ProFundingPool = {
  token: "USDC";
  funded: number;
  streamed: number;
  allocation: ProPoolAllocation;
  /** Weeks of committed payroll that must stay as liquid idle. */
  coverageWeeks: number;
};

export type ProActivity = {
  id: string;
  kind: ProActivityKind;
  label: string;
  amount?: number;
  at: number;
  digest?: string;
};

export type ProWorkspace = {
  version: 2;
  orgName: string;
  groups: ProStreamGroup[];
  workers: ProWorker[];
  pool: ProFundingPool;
  activity: ProActivity[];
  /** Simulated yield accrued on invested float. */
  yieldEarned: number;
  updatedAt: number;
  /** On-chain org treasury (Pro pool) once opened. */
  treasuryId?: string;
  /** Net USDC principal moved into the yield vault (to derive real accrued yield). */
  investedPrincipal?: number;
};

/** Legacy demo shape (v1 localStorage). */
export type LegacyProSubstream = {
  id: string;
  name: string;
  budget: number;
  dripPerSec: number;
  status: "dripping" | "paused" | "pending";
};

export type LegacyProStreamGroup = {
  id: string;
  name: string;
  description?: string;
  substreams: LegacyProSubstream[];
  createdAt: number;
};

export const EMPTY_ALLOCATION: ProPoolAllocation = {
  idle: 0,
  yield_vault: 0,
  reserve: 0,
};

export const YIELD_APY = 0.08;

export function newId(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Monthly USD → continuous drip $/sec. */
export function monthlyToPerSec(monthlyUsd: number) {
  return monthlyUsd / (30 * 24 * 3600);
}

export function groupCommitted(workspace: ProWorkspace, groupId: string) {
  return workspace.workers
    .filter((w) => w.groupId === groupId)
    .reduce((sum, w) => sum + w.monthlyUsd, 0);
}

export function workspaceMonthlyCommitted(workspace: ProWorkspace) {
  return workspace.workers
    .filter((w) => w.status === "dripping" || w.status === "paused")
    .reduce((sum, w) => sum + w.monthlyUsd, 0);
}

export function workspaceActiveCount(workspace: ProWorkspace) {
  return workspace.workers.filter((w) => w.status === "dripping").length;
}

export function poolTotal(pool: ProFundingPool) {
  return (
    pool.allocation.idle +
    pool.allocation.yield_vault +
    pool.allocation.reserve
  );
}

export function weeklyCommitted(workspace: ProWorkspace) {
  return workspaceMonthlyCommitted(workspace) / 4.345;
}

export function coverageFloor(workspace: ProWorkspace) {
  return weeklyCommitted(workspace) * workspace.pool.coverageWeeks;
}

export function investableIdle(workspace: ProWorkspace) {
  return Math.max(0, workspace.pool.allocation.idle - coverageFloor(workspace));
}

/** Accrued unpaid since start (client-side stand-in until chain). */
export function workerClaimable(worker: ProWorker, nowMs: number) {
  if (worker.status === "pending") return 0;
  const end =
    worker.status === "paused" || worker.status === "stopped"
      ? worker.pausedAt ?? nowMs
      : nowMs;
  const start = worker.startedAt ?? nowMs;
  if (end <= start) return 0;
  const paused = worker.totalPausedMs ?? 0;
  const accrued = monthlyToPerSec(worker.monthlyUsd) * ((end - start - paused) / 1000);
  return Math.max(0, accrued - worker.streamedUsd);
}

export function fmtUsd(n: number, decimals = 2) {
  const abs = Math.abs(n);
  const digits = abs >= 1000 && decimals > 0 ? Math.min(decimals, 0) : decimals;
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function statusLabel(status: ProWorkerStatus) {
  switch (status) {
    case "dripping":
      return "Streaming";
    case "paused":
      return "Paused";
    case "stopped":
      return "Stopped";
    case "pending":
      return "Pending";
  }
}

export function bucketLabel(bucket: ProPoolBucket) {
  switch (bucket) {
    case "idle":
      return "Liquid";
    case "yield_vault":
      return "Yield vault";
    case "reserve":
      return "Reserve";
  }
}
