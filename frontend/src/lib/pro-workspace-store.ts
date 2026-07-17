import {
  EMPTY_ALLOCATION,
  monthlyToPerSec,
  newId,
  type LegacyProStreamGroup,
  type ProActivity,
  type ProFundingPool,
  type ProStreamGroup,
  type ProWorker,
  type ProWorkspace,
} from "@/components/app/pro/types";

const KEY_PREFIX = "sl-pro-workspace";
const LEGACY_KEY_PREFIX = "sl-pro-groups";

function storageKey(address: string) {
  return `${KEY_PREFIX}:${address.toLowerCase()}`;
}

function legacyKey(address: string) {
  return `${LEGACY_KEY_PREFIX}:${address.toLowerCase()}`;
}

export function emptyWorkspace(orgName = "My organization"): ProWorkspace {
  return {
    version: 2,
    orgName,
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
    updatedAt: Date.now(),
  };
}

/** Sample payroll so empty wallets see a living console. */
export function seedWorkspace(): ProWorkspace {
  const eng = newId("grp");
  const design = newId("grp");
  const now = Date.now();
  const groups: ProStreamGroup[] = [
    {
      id: eng,
      name: "Engineering",
      description: "Core product & infra",
      createdAt: now - 86400000 * 12,
    },
    {
      id: design,
      name: "Design",
      description: "Brand & product design",
      createdAt: now - 86400000 * 10,
    },
  ];

  const workers: ProWorker[] = [
    {
      id: newId("w"),
      alias: "Alex Rivera",
      walletAddress: "0xalex000000000000000000000000000000000001",
      groupId: eng,
      monthlyUsd: 8500,
      cadence: "MONTHLY",
      budget: 25500,
      streamedUsd: 2100,
      status: "dripping",
      startedAt: now - 86400000 * 8,
    },
    {
      id: newId("w"),
      alias: "Sam Okonkwo",
      walletAddress: "0xsam0000000000000000000000000000000000002",
      groupId: eng,
      monthlyUsd: 7200,
      cadence: "MONTHLY",
      budget: 21600,
      streamedUsd: 1600,
      status: "dripping",
      startedAt: now - 86400000 * 8,
    },
    {
      id: newId("w"),
      alias: "Morgan Lee",
      walletAddress: "0xmorgan0000000000000000000000000000000003",
      groupId: design,
      monthlyUsd: 6800,
      cadence: "MONTHLY",
      budget: 20400,
      streamedUsd: 900,
      status: "paused",
      startedAt: now - 86400000 * 6,
      pausedAt: now - 86400000 * 1,
      totalPausedMs: 0,
    },
    {
      id: newId("w"),
      alias: "Jordan Ng",
      walletAddress: "0xjordan0000000000000000000000000000000004",
      groupId: design,
      monthlyUsd: 4500,
      cadence: "HOURLY",
      budget: 0,
      streamedUsd: 0,
      status: "pending",
    },
  ];

  const monthly = 8500 + 7200 + 6800;
  const funded = 90000;
  const invested = 42000;
  const idle = funded - invested - 4600;
  const pool: ProFundingPool = {
    token: "USDC",
    funded,
    streamed: 4600,
    allocation: {
      idle: Math.max(0, idle),
      yield_vault: invested,
      reserve: 8000,
    },
    coverageWeeks: 2,
  };

  const activity: ProActivity[] = [
    {
      id: newId("act"),
      kind: "funded",
      label: "Funded payroll pool",
      amount: 90000,
      at: now - 86400000 * 8,
      digest: "0xseedfund01",
    },
    {
      id: newId("act"),
      kind: "invested",
      label: "Moved idle capital into yield vault",
      amount: 42000,
      at: now - 86400000 * 7,
      digest: "0xseedinvest01",
    },
    {
      id: newId("act"),
      kind: "paused",
      label: "Paused Morgan Lee",
      at: now - 86400000 * 1,
    },
    {
      id: newId("act"),
      kind: "claimed",
      label: "Alex Rivera claimed earnings",
      amount: 1200,
      at: now - 3600000 * 14,
      digest: "0xseedclaim01",
    },
  ];

  return {
    version: 2,
    orgName: "Streamline Labs",
    groups,
    workers,
    pool,
    activity,
    yieldEarned: 186.42,
    updatedAt: now,
  };
}

function migrateLegacy(groups: LegacyProStreamGroup[]): ProWorkspace {
  const ws = emptyWorkspace();
  const now = Date.now();
  ws.groups = groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    createdAt: g.createdAt,
  }));
  ws.workers = groups.flatMap((g) =>
    g.substreams.map((s) => {
      const monthly = s.dripPerSec * 30 * 24 * 3600;
      return {
        id: s.id,
        alias: s.name,
        walletAddress: `0xpending_${s.id.slice(0, 8)}`,
        groupId: g.id,
        monthlyUsd: Math.round(monthly),
        cadence: "MONTHLY" as const,
        budget: s.budget,
        streamedUsd: Math.max(0, s.budget - s.budget * 0.7),
        status: s.status,
        startedAt: s.status === "pending" ? undefined : now - 86400000 * 3,
      };
    })
  );
  const funded = ws.workers.reduce((sum, w) => sum + w.budget, 0);
  ws.pool.funded = funded;
  ws.pool.allocation.idle = funded;
  ws.orgName = "My organization";
  ws.activity = [
    {
      id: newId("act"),
      kind: "funded",
      label: "Imported prior payroll demo",
      amount: funded,
      at: now,
    },
  ];
  return ws;
}

export function loadProWorkspace(address: string): ProWorkspace {
  if (typeof window === "undefined" || !address) return emptyWorkspace();
  try {
    const raw = localStorage.getItem(storageKey(address));
    if (raw) {
      const parsed = JSON.parse(raw) as ProWorkspace;
      if (parsed?.version === 2) return parsed;
    }
    const legacyRaw = localStorage.getItem(legacyKey(address));
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as LegacyProStreamGroup[];
      if (Array.isArray(legacy) && legacy.length > 0) {
        const migrated = migrateLegacy(legacy);
        saveProWorkspace(address, migrated);
        return migrated;
      }
    }
  } catch {
    /* fall through */
  }
  // Real orgs start empty; the roster fills from on-chain streams. The demo
  // fixtures load only via an explicit "Load demo" (resetDemo).
  return emptyWorkspace();
}

export function saveProWorkspace(address: string, workspace: ProWorkspace) {
  if (typeof window === "undefined" || !address) return;
  const next = { ...workspace, updatedAt: Date.now(), version: 2 as const };
  localStorage.setItem(storageKey(address), JSON.stringify(next));
}

export function pushActivity(
  workspace: ProWorkspace,
  entry: Omit<ProActivity, "id" | "at"> & { at?: number }
): ProWorkspace {
  const activity: ProActivity = {
    id: newId("act"),
    at: entry.at ?? Date.now(),
    kind: entry.kind,
    label: entry.label,
    amount: entry.amount,
    digest: entry.digest ?? `0xstub${Math.random().toString(16).slice(2, 10)}`,
  };
  return {
    ...workspace,
    activity: [activity, ...workspace.activity].slice(0, 40),
  };
}

export function dripPerSecFor(worker: ProWorker) {
  return monthlyToPerSec(worker.monthlyUsd);
}
