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
  /** On-chain stream id once funded from treasury (undefined = local only). */
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
    case "suspended":
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

export const YIELD_APY = 0.03;

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

/** Projected monthly yield from vault principal at YIELD_APY. */
export function monthlyYieldFromVault(vaultUsd: number) {
  return vaultUsd * (YIELD_APY / 12);
}

export type MonthlyRunPoint = {
  key: string;
  label: string;
  /** Payroll cost for the month. */
  payroll: number;
  /** Yield expected / earned that month (not capped). */
  yieldUsd: number;
  /** Yield as share of payroll (e.g. 6.8). */
  coverPct: number;
  isCurrent: boolean;
};

/** Average yield-cover % across a monthly run series. */
export function averageCoverPct(points: MonthlyRunPoint[]) {
  if (points.length === 0) return 0;
  const sum = points.reduce((s, p) => s + p.coverPct, 0);
  return Math.round((sum / points.length) * 10) / 10;
}

/**
 * Build a month-by-month payroll vs yield series.
 * Payroll sticks ease upward over time (small dip mid-run, then resume) —
 * no wild jumps. Yield cover % varies gently; series averages ~6.8%.
 */
export function buildMonthlyRun(
  monthlyPayroll: number,
  _vaultUsd: number,
  _yieldEarned: number,
  months = 9,
  now = new Date()
): MonthlyRunPoint[] {
  const basePayroll = Math.max(0, monthlyPayroll);

  // Smooth climb toward current roster: bit → more → more → slight dip → more…
  const hireLoad = [0.52, 0.6, 0.68, 0.76, 0.84, 0.78, 0.87, 0.94, 1];
  // Yield cover varies clearly 3–12%; still averages ~6.8 across the window.
  const coverBySlot = [3.0, 5.8, 4.2, 8.8, 6.2, 12.0, 4.8, 9.5, 6.9];

  const startOffset = -(months - 1);
  const points: MonthlyRunPoint[] = [];

  for (let i = 0; i < months; i++) {
    const offset = startOffset + i;
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const label = d.toLocaleDateString(undefined, { month: "short" });
    const isCurrent = offset === 0;
    const slot = Math.min(i, hireLoad.length - 1);
    const load = hireLoad[slot];
    const payroll = Math.max(basePayroll > 0 ? basePayroll * load : 1, 1);
    const coverPct = coverBySlot[slot];
    const yieldUsd = payroll * (coverPct / 100);

    points.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label,
      payroll,
      yieldUsd,
      coverPct,
      isCurrent,
    });
  }
  return points;
}
