import type { SuiClient } from "@mysten/sui/client";

import {
  formatHandle,
  formatSuins,
  isHexAddress,
  normalizeHandle,
  suinsBrand,
  suinsDomain,
  USERNAME_RE,
} from "./handle";

export type ResolvedRecipient = {
  address: string;
  displayName: string;
  /** Bare username when resolved via StreamLine / SuiNS; null for raw hex. */
  handle: string | null;
};

/**
 * Resolve a user-typed recipient to a Sui address.
 *
 * Accepts hex addresses, StreamLine handles (`alice`, `alice@streamline`,
 * `alice.streamline.sui`), and any other `.sui` name.
 */
export async function resolveRecipient(
  client: SuiClient,
  input: string
): Promise<ResolvedRecipient | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (isHexAddress(trimmed)) {
    return {
      address: trimmed.toLowerCase(),
      displayName: trimmed,
      handle: null,
    };
  }

  for (const name of candidateSuinsNames(trimmed)) {
    try {
      const address = await client.resolveNameServiceAddress({ name });
      if (address) {
        const handle = name.endsWith(`.${suinsDomain()}`)
          ? name.slice(0, -(`.${suinsDomain()}`.length))
          : null;
        return {
          address,
          displayName: handle ? formatHandle(handle) : name,
          handle,
        };
      }
    } catch {
      // Name missing or RPC hiccup — try next candidate.
    }
  }
  return null;
}

/**
 * Reverse-lookup: StreamLine `@brand` subname for an address, else any
 * SuiNS name (for display labels), else null.
 */
export async function reverseResolveHandle(
  client: SuiClient,
  address: string
): Promise<string | null> {
  if (!isHexAddress(address)) return null;
  try {
    const page = await client.resolveNameServiceNames({ address });
    const names = page.data ?? [];
    if (names.length === 0) return null;

    const domain = suinsDomain();
    const branded = names.find((n) => n.endsWith(`.${domain}`));
    if (branded) {
      const bare = branded.slice(0, -(`.${domain}`.length));
      return formatHandle(bare);
    }
    // Non-StreamLine SuiNS — useful for address chips, ignored by onboarding.
    return names[0] ?? null;
  } catch {
    return null;
  }
}

/** True if `${handle}.${domain}` is already minted on-chain. */
export async function isHandleTakenOnChain(
  client: SuiClient,
  handle: string
): Promise<boolean> {
  const name = formatSuins(handle);
  try {
    const address = await client.resolveNameServiceAddress({ name });
    return !!address;
  } catch {
    return false;
  }
}

/**
 * Ordered SuiNS lookup candidates for a typed input.
 * StreamLine subnames are preferred before root `.sui` names.
 */
export function candidateSuinsNames(raw: string): string[] {
  let s = raw.trim().toLowerCase();
  if (!s) return [];
  if (s.startsWith("@")) s = s.slice(1);

  const brand = suinsBrand();
  const domain = suinsDomain();

  if (s.endsWith(`@${domain}`)) {
    const bare = s.slice(0, -(`@${domain}`.length));
    return USERNAME_RE.test(bare) ? [formatSuins(bare)] : [];
  }
  if (s.endsWith(`@${brand}`)) {
    const bare = s.slice(0, -(`@${brand}`.length));
    return USERNAME_RE.test(bare) ? [formatSuins(bare)] : [];
  }
  if (s.endsWith(`.${domain}`)) {
    return [s];
  }
  if (s.endsWith(".sui")) {
    return [s];
  }

  // Bare label — try our domain first, then root SuiNS.
  const parsed = normalizeHandle(s);
  if (parsed.ok) {
    return [formatSuins(parsed.handle), `${parsed.handle}.sui`];
  }
  // Allow bare labels that fail reserved checks for *resolution* (someone
  // else may hold them), but still require charset.
  if (/^[a-z0-9](?:[a-z0-9-]{0,18}[a-z0-9])?$/.test(s) && s.length >= 1) {
    return [`${s}.${domain}`, `${s}.sui`];
  }
  return [];
}
