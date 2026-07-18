import { NextResponse } from "next/server";
import { SuiClient } from "@mysten/sui/client";
import { verifyPersonalMessageSignature } from "@mysten/sui/verify";

import { FULLNODE_URLS, type NetworkName } from "@/lib/constants";
import { mintLeafSubname, suinsMintConfigured } from "@/lib/suins-mint";
import {
  formatHandle,
  normalizeHandle,
  normalizeReasonMessage,
  suinsDomain,
} from "@/lib/handle";
import { isHandleTakenOnChain } from "@/lib/suins";

export const runtime = "nodejs";

const CLAIM_PREFIX = "streamline-claim-handle:";

function networkFrom(raw: unknown): NetworkName {
  if (raw === "mainnet" || raw === "testnet" || raw === "devnet") return raw;
  return "testnet";
}

/**
 * POST /api/handle/claim
 *
 * Server fallback for extension wallets (no zkLogin JWT). Client must sign:
 *   `streamline-claim-handle:<handle>:<address>:<network>`
 * Body: { handle, address, network, signature }
 *
 * Uses ENOKI_PRIVATE_API_KEY + targetAddress. Prefer the browser JWT path
 * when the user is on an Enoki zkLogin wallet.
 */
export async function POST(req: Request) {
  let body: {
    handle?: string;
    address?: string;
    network?: string;
    signature?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = normalizeHandle(body.handle);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "invalid_handle", message: normalizeReasonMessage(parsed.reason) },
      { status: 400 }
    );
  }

  const address = body.address?.trim().toLowerCase() ?? "";
  if (!/^0x[a-f0-9]{64}$/.test(address)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }

  const network = networkFrom(body.network);
  if (!suinsMintConfigured(network)) {
    return NextResponse.json({ error: "claim_key_unset" }, { status: 503 });
  }
  const signature = body.signature?.trim() ?? "";
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const message = new TextEncoder().encode(
    `${CLAIM_PREFIX}${parsed.handle}:${address}:${network}`
  );

  try {
    const pub = await verifyPersonalMessageSignature(message, signature);
    const signer = pub.toSuiAddress().toLowerCase();
    if (signer !== address) {
      return NextResponse.json({ error: "signature_mismatch" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const client = new SuiClient({ url: FULLNODE_URLS[network] });
  if (await isHandleTakenOnChain(client, parsed.handle)) {
    return NextResponse.json({ error: "taken" }, { status: 409 });
  }

  try {
    const { name } = await mintLeafSubname({
      client,
      network,
      subname: parsed.handle,
      targetAddress: address,
      domain: suinsDomain(),
    });

    return NextResponse.json({
      handle: parsed.handle,
      displayName: formatHandle(parsed.handle),
      status: "ACTIVE",
      name,
      domain: suinsDomain(),
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "claim_failed",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 502 }
    );
  }
}
