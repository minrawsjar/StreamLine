import {
  EMPTY_ALLOCATION,
  monthlyToPerSec,
  newId,
  type ProActivity,
  type ProWorker,
  type ProWorkspace,
} from "@/components/app/pro/types";

const KEY_PREFIX = "sl-pro-workspace";

function storageKey(address: string) {
  return `${KEY_PREFIX}:${address.toLowerCase()}`;
}

export function emptyWorkspace(orgName = "My organization"): ProWorkspace {
  return {
    version: 3,
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

export function loadProWorkspace(address: string): ProWorkspace {
  if (typeof window === "undefined" || !address) return emptyWorkspace();
  try {
    const raw = localStorage.getItem(storageKey(address));
    if (raw) {
      const parsed = JSON.parse(raw) as ProWorkspace;
      if (parsed?.version === 3) return parsed;
      // Older workspace (v2/legacy migrations): drop the accumulated local
      // roster — test/mock people that were never real on-chain streams — but
      // keep the real on-chain treasury link + org name so funds aren't orphaned.
      if ((parsed?.version as number) === 2) {
        const cleaned: ProWorkspace = {
          ...emptyWorkspace(parsed.orgName),
          treasuryId: parsed.treasuryId,
        };
        saveProWorkspace(address, cleaned);
        return cleaned;
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
  const next = { ...workspace, updatedAt: Date.now(), version: 3 as const };
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
