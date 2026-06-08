import { createNetworkConfig } from "@mysten/dapp-kit";

/**
 * StreamLine targets Sui mainnet (gasless stablecoin transfers via Address
 * Balances launched on mainnet in May 2026). Testnet stays wired for dev.
 */
// Deployed StreamLine package on testnet (see contracts/deployment.testnet.json).
const TESTNET_PACKAGE =
  "0x9d6e7815d5e11424a68f827e26499078fead7648328f44fdbdeff6d34ed0b3a8";

export const PACKAGE_IDS = {
  mainnet: process.env.NEXT_PUBLIC_PACKAGE_ID_MAINNET ?? "0x0",
  testnet: process.env.NEXT_PUBLIC_PACKAGE_ID_TESTNET ?? TESTNET_PACKAGE,
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

/** Standard Sui fullnode endpoints (getFullnodeUrl was removed in Sui SDK v2). */
export const FULLNODE_URLS = {
  mainnet: "https://fullnode.mainnet.sui.io:443",
  testnet: "https://fullnode.testnet.sui.io:443",
  devnet: "https://fullnode.devnet.sui.io:443",
} as const;

export type NetworkName = keyof typeof PACKAGE_IDS;

export const DEFAULT_NETWORK: NetworkName =
  (process.env.NEXT_PUBLIC_DEFAULT_NETWORK as NetworkName) ?? "testnet";

export const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    mainnet: {
      network: "mainnet",
      url: FULLNODE_URLS.mainnet,
      variables: { packageId: PACKAGE_IDS.mainnet, usdcType: USDC_TYPE.mainnet },
    },
    testnet: {
      network: "testnet",
      url: FULLNODE_URLS.testnet,
      variables: { packageId: PACKAGE_IDS.testnet, usdcType: USDC_TYPE.testnet },
    },
    devnet: {
      network: "devnet",
      url: FULLNODE_URLS.devnet,
      variables: { packageId: PACKAGE_IDS.devnet, usdcType: USDC_TYPE.devnet },
    },
  });
