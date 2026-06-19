import type { ProStreamGroup } from "@/components/app/pro/types";

const KEY_PREFIX = "sl-pro-groups";

function storageKey(address: string) {
  return `${KEY_PREFIX}:${address.toLowerCase()}`;
}

export function loadProGroups(address: string): ProStreamGroup[] {
  if (typeof window === "undefined" || !address) return [];
  try {
    const raw = localStorage.getItem(storageKey(address));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProStreamGroup[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveProGroups(address: string, groups: ProStreamGroup[]) {
  if (typeof window === "undefined" || !address) return;
  localStorage.setItem(storageKey(address), JSON.stringify(groups));
}
