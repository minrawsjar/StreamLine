import { NextResponse } from "next/server";

import { allowedMoveCallTargets } from "@/lib/enoki-targets";
import type { NetworkName } from "@/lib/constants";

/**
 * Enoki sponsorship proxy. Holds the **secret** Enoki key server-side and calls
 * the Enoki REST API directly (no SDK import — keeps us off the Enoki↔Sui-v2
 * dependency that forced the zkLogin no-op). The browser never sees the key.
 *
 *   GET  /api/sponsor          → { enabled }   (is a sponsor key configured?)
 *   POST /api/sponsor          → { bytes, digest }   (sponsor a tx kind)
 *   POST /api/sponsor/execute  → { digest }          (submit the signed tx)
 */

const ENOKI_API = "https://api.enoki.mystenlabs.com/v1";

function apiKey() {
  return process.env.ENOKI_PRIVATE_API_KEY?.trim() || "";
}

export async function GET() {
  return NextResponse.json({ enabled: !!apiKey() });
}

type SponsorBody = {
  network?: NetworkName;
  sender?: string;
  /** base64 transaction *kind* bytes (built with onlyTransactionKind: true). */
  transactionKindBytes?: string;
};

export async function POST(req: Request) {
  const key = apiKey();
  if (!key) {
    return NextResponse.json({ error: "sponsorship_disabled" }, { status: 501 });
  }

  let body: SponsorBody;
  try {
    body = (await req.json()) as SponsorBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { network, sender, transactionKindBytes } = body;
  if (!network || !sender || !transactionKindBytes) {
    return NextResponse.json(
      { error: "missing_fields", required: ["network", "sender", "transactionKindBytes"] },
      { status: 400 }
    );
  }

  const res = await fetch(`${ENOKI_API}/transaction-blocks/sponsor`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      network,
      sender,
      transactionBlockKindBytes: transactionKindBytes,
      // Defence in depth: only sponsor this sender's StreamLine calls.
      allowedAddresses: [sender],
      allowedMoveCallTargets: allowedMoveCallTargets(network),
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { error: "enoki_sponsor_failed", detail: json },
      { status: res.status }
    );
  }

  // Enoki wraps payloads in { data: { bytes, digest } }.
  return NextResponse.json(json.data ?? json);
}
