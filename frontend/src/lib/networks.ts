import { getFullnodeUrl } from "@mysten/sui/client";
import { createNetworkConfig } from "@mysten/dapp-kit";

/**
 * StreamLine targets Sui mainnet (gasless stablecoin transfers via Address
 * Balances launched on mainnet in May 2026). Testnet stays wired for dev.
 */
export const PACKAGE_IDS = {
  mainnet: process.env.NEXT_PUBLIC_PACKAGE_ID_MAINNET ?? "0x0",
  testnet: process.env.NEXT_PUBLIC_PACKAGE_ID_TESTNET ?? "0x0",
  devnet: "0x0",
} as const;

/** USDC is the primary streamed asset. */
export const USDC_TYPE = {
  mainnet:
    process.env.NEXT_PUBLIC_USDC_TYPE_MAINNET ??
    "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
  testnet:
    process.env.NEXT_PUBLIC_USDC_TYPE_TESTNET ??
    "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC",
  devnet: "0x2::sui::SUI",
} as const;

export type NetworkName = keyof typeof PACKAGE_IDS;

export const DEFAULT_NETWORK: NetworkName =
  (process.env.NEXT_PUBLIC_DEFAULT_NETWORK as NetworkName) ?? "testnet";

export const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    mainnet: {
      url: getFullnodeUrl("mainnet"),
      variables: { packageId: PACKAGE_IDS.mainnet, usdcType: USDC_TYPE.mainnet },
    },
    testnet: {
      url: getFullnodeUrl("testnet"),
      variables: { packageId: PACKAGE_IDS.testnet, usdcType: USDC_TYPE.testnet },
    },
    devnet: {
      url: getFullnodeUrl("devnet"),
      variables: { packageId: PACKAGE_IDS.devnet, usdcType: USDC_TYPE.devnet },
    },
  });
