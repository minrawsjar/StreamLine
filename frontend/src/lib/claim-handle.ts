"use client";

import type { WalletWithRequiredFeatures } from "@mysten/wallet-standard";
import type { SuiClient } from "@mysten/sui/client";

import {
  enokiNetwork,
  listSubnamesForAddress,
  publicEnokiKey,
} from "./enoki-subnames";
import {
  bareHandleFromName,
  formatHandle,
  normalizeHandle,
  normalizeReasonMessage,
  suinsDomain,
  suinsConfigured,
} from "./handle";
import { isHandleTakenOnChain } from "./suins";

/** Must match server CLAIM_PREFIX in /api/handle/claim. */
export const CLAIM_MESSAGE_PREFIX = "streamline-claim-handle:";

export function claimMessage(
  handle: string,
  address: string,
  network: string
): string {
  return `${CLAIM_MESSAGE_PREFIX}${handle}:${address.toLowerCase()}:${network}`;
}

export type ClaimHandleResult = {
  handle: string;
  displayName: string;
  status: string;
};

/**
 * Claim a StreamLine subname. The wallet signs an ownership-proof message and the
 * server mints a leaf subname under our domain with the backend admin key — one
 * path for every wallet type (zkLogin + extension).
 */
export async function claimHandle(opts: {
  handle: string;
  address: string;
  network: string;
  client: SuiClient;
  wallet: WalletWithRequiredFeatures | null;
  /** Personal-message signature for the server fallback path. */
  signPersonalMessage?: (message: Uint8Array) => Promise<{ signature: string }>;
}): Promise<ClaimHandleResult> {
  if (!suinsConfigured()) {
    throw new Error(
      "SuiNS is not configured. Set NEXT_PUBLIC_SUINS_DOMAIN after linking the domain in Enoki."
    );
  }

  const parsed = normalizeHandle(opts.handle);
  if (!parsed.ok) {
    throw new Error(normalizeReasonMessage(parsed.reason));
  }

  if (await isHandleTakenOnChain(opts.client, parsed.handle)) {
    throw new Error("That handle is already taken.");
  }

  const network = enokiNetwork(opts.network);

  if (!opts.signPersonalMessage) {
    throw new Error("Your wallet can't sign the claim message.");
  }

  const { signature } = await opts.signPersonalMessage(
    new TextEncoder().encode(
      claimMessage(parsed.handle, opts.address, network)
    )
  );

  const res = await fetch("/api/handle/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      handle: parsed.handle,
      address: opts.address,
      network,
      signature,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    handle?: string;
    displayName?: string;
    status?: string;
    error?: string;
    message?: string;
    detail?: string;
  };
  if (!res.ok) {
    throw new Error(
      json.message || json.detail || json.error || `Claim failed (${res.status})`
    );
  }
  if (json.status && json.status !== "ACTIVE") {
    throw new Error(
      "Handle is still provisioning. Wait a moment and try again."
    );
  }
  return {
    handle: json.handle ?? parsed.handle,
    displayName: json.displayName ?? formatHandle(parsed.handle),
    status: "ACTIVE",
  };
}

/** Fetch the user's StreamLine subname via Enoki list (or null). */
export async function fetchOwnedHandle(opts: {
  address: string;
  network: string;
}): Promise<string | null> {
  const apiKey = publicEnokiKey();
  if (!apiKey || !suinsConfigured()) return null;
  try {
    const list = await listSubnamesForAddress({
      apiKey,
      address: opts.address,
      network: enokiNetwork(opts.network),
      domain: suinsDomain(),
    });
    const active = list.find((s) => s.status === "ACTIVE");
    if (!active?.name) return null;
    const bare = bareHandleFromName(active.name);
    return bare ? formatHandle(bare) : null;
  } catch {
    return null;
  }
}
