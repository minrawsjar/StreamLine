/**
 * Pure network constants — deliberately free of any `@mysten/dapp-kit` import so
 * this module is safe to load in server route handlers (the Enoki sponsorship
 * proxy) as well as client components. `networks.ts` builds the dApp Kit network
 * config on top of these.
 */

// Deployed StreamLine package on testnet (see contracts/Published.toml).
// v5 (2026-06-12) adds mutual dispute resolution (propose/accept resolution).
// v3 added Seal secrets + confidential milestone review.
// v2 added confidential_balance + ConfidentialStream.
const TESTNET_PACKAGE =
  "0x110563fbfb080429abad15a8b402a3c980f0c80f2b66de7f3789e561f11827a9";

export const PACKAGE_IDS = {
  mainnet: process.env.NEXT_PUBLIC_PACKAGE_ID_MAINNET ?? "0x0",
  testnet: process.env.NEXT_PUBLIC_PACKAGE_ID_TESTNET ?? TESTNET_PACKAGE,
  devnet: "0x0",
} as const;

/**
 * The *original* (v1) package ids. Object types and Seal's identity namespace
 * are pinned to the first version of a package, so Seal encryption and
 * SessionKeys must use these even though move calls target the latest version.
 */
export const ORIGINAL_PACKAGE_IDS = {
  mainnet: process.env.NEXT_PUBLIC_PACKAGE_ID_MAINNET ?? "0x0",
  testnet:
    "0x9d6e7815d5e11424a68f827e26499078fead7648328f44fdbdeff6d34ed0b3a8",
  devnet: "0x0",
} as const;

/**
 * The package version that *defined* the confidential types (v2). Sui pins a
 * struct's type address to the version that introduced it, so
 * `ConfidentialStream` objects and `ConfStreamCreated` events carry this id.
 */
export const CONF_DEFINING_PACKAGE_IDS = {
  mainnet: process.env.NEXT_PUBLIC_PACKAGE_ID_MAINNET ?? "0x0",
  testnet:
    "0x25e2dac28bdda5655040ceab5876794b8bdc3687178c1309974017c16dd76fdb",
  devnet: "0x0",
} as const;

/**
 * Mintable test USDC deployed for the demo (6 decimals, symbol "USDC"). The
 * TreasuryCap is shared, so the faucet is permissionless on testnet.
 */
export const TEST_USDC = {
  packageId:
    "0xf6ce32fe48338464f3947b9d15cd4a0befa0fe9b3926fd9daf6cee3658482ed3",
  treasuryId:
    "0xa7cb971f4f93e5713c5703f63f3bc17fdf0f6bf1f9795dc010ac164827715330",
  coinType:
    "0xf6ce32fe48338464f3947b9d15cd4a0befa0fe9b3926fd9daf6cee3658482ed3::mock_usdc::MOCK_USDC",
} as const;

/** USDC is the primary streamed asset. Testnet uses our mintable test USDC. */
export const USDC_TYPE = {
  mainnet:
    process.env.NEXT_PUBLIC_USDC_TYPE_MAINNET ??
    "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
  testnet: process.env.NEXT_PUBLIC_USDC_TYPE_TESTNET ?? TEST_USDC.coinType,
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
