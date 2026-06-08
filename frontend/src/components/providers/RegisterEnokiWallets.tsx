"use client";

import { useEffect } from "react";
import { useSuiClient, useSuiClientContext } from "@mysten/dapp-kit";
import { isEnokiNetwork, registerEnokiWallets } from "@mysten/enoki";

/**
 * Registers Enoki zkLogin wallets (Google etc.) so they appear in the wallet
 * list alongside browser-extension wallets. zkLogin is StreamLine's seedless
 * onboarding path — sign in with Gmail, get a Sui address, receive streams.
 *
 * No-ops gracefully when the Enoki API key / Google client ID env vars aren't
 * set (e.g. local dev without keys), so the rest of the app still works.
 */
export function RegisterEnokiWallets() {
  const client = useSuiClient();
  const { network } = useSuiClientContext();

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_ENOKI_API_KEY;
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    // Enoki only supports mainnet/testnet, and we need both keys.
    if (!apiKey || !googleClientId || !isEnokiNetwork(network)) return;

    const { unregister } = registerEnokiWallets({
      apiKey,
      client,
      network,
      providers: {
        google: {
          clientId: googleClientId,
          redirectUrl:
            process.env.NEXT_PUBLIC_ZKLOGIN_REDIRECT_URL ??
            (typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback`
              : undefined),
        },
      },
    });

    return unregister;
  }, [client, network]);

  return null;
}
