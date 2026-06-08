"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";

import { networkConfig, DEFAULT_NETWORK } from "@/lib/networks";

/**
 * Wraps the app in the Sui dApp Kit + React Query providers. zkLogin
 * onboarding (Google OAuth → Sui address) plugs in through the WalletProvider.
 */
export function SuiProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={DEFAULT_NETWORK}>
        <WalletProvider autoConnect>{children}</WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
