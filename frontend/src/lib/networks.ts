import { createNetworkConfig } from "@mysten/dapp-kit";

import {
  DEFAULT_NETWORK,
  FULLNODE_URLS,
  PACKAGE_IDS,
  TEST_USDC,
  USDC_TYPE,
  type NetworkName,
} from "./constants";

/**
 * StreamLine targets Sui mainnet (gasless stablecoin transfers via Address
 * Balances launched on mainnet in May 2026). Testnet stays wired for dev.
 *
 * Pure constants live in `constants.ts` so server route handlers can reuse them
 * without pulling in dApp Kit.
 */
export {
  DEFAULT_NETWORK,
  FULLNODE_URLS,
  PACKAGE_IDS,
  TEST_USDC,
  USDC_TYPE,
};
export type { NetworkName };

export const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    mainnet: {
      url: FULLNODE_URLS.mainnet,
      variables: { packageId: PACKAGE_IDS.mainnet, usdcType: USDC_TYPE.mainnet },
    },
    testnet: {
      url: FULLNODE_URLS.testnet,
      variables: { packageId: PACKAGE_IDS.testnet, usdcType: USDC_TYPE.testnet },
    },
    devnet: {
      url: FULLNODE_URLS.devnet,
      variables: { packageId: PACKAGE_IDS.devnet, usdcType: USDC_TYPE.devnet },
    },
  });
