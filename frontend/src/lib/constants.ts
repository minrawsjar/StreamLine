/**
 * Pure network constants — deliberately free of any `@mysten/dapp-kit` import so
 * this module is safe to load in server route handlers (the Enoki sponsorship
 * proxy) as well as client components. `networks.ts` builds the dApp Kit network
 * config on top of these.
 */

// Deployed StreamLine package on testnet (see contracts/Published.toml).
// v8 (2026-06-13) adds auto-yield (create_stream_v2 + drip_with_yield).
// v7 added the lending pool (borrow against a stream).
// v6 added the Scallop-shaped yield_vault.
// v5 added mutual dispute resolution (propose/accept resolution).
// v3 added Seal secrets + confidential milestone review.
// v2 added confidential_balance + ConfidentialStream.
const TESTNET_PACKAGE =
  "0x28506598eccbbde36bbfef6401936c1d907c21a7e8db77c56390b6b291fad0a2";

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

/**
 * Scallop-shaped yield vault for the streamed coin (testnet stand-in for
 * Scallop's lending pool). 8% APR, seeded with a mock-USDC interest buffer.
 */
export const YIELD_VAULT = {
  testnet:
    "0x8ae9d8805682aabbd00ff0582d93b88f2f86482bcabed194a88a6ded99a88406",
  mainnet: process.env.NEXT_PUBLIC_YIELD_VAULT_MAINNET ?? "0x0",
  devnet: "0x0",
} as const;

/**
 * Lending pool for borrowing against a live stream (12% borrow APR, seeded with
 * mock-USDC liquidity). Testnet stand-in for Scallop/NAVI lending.
 */
export const LENDING_POOL = {
  testnet:
    "0x0518d5d77a3069ebab9df5b46e60fed4589c16dc6e48cd694a02c9350f312ea2",
  mainnet: process.env.NEXT_PUBLIC_LENDING_POOL_MAINNET ?? "0x0",
  devnet: "0x0",
} as const;

/**
 * Packages that *introduced* the DeFi receipt structs. A struct's type address
 * is pinned to the version that defined it (not the latest), so owned-object
 * filters for receipts must use these, not the current package id.
 *   VaultReceipt → v6 (yield_vault added); LoanReceipt → v7 (lending added).
 */
export const YIELD_DEFINING_PACKAGE = {
  testnet:
    "0xa7f9660959260133040f4e5aaea56fdd61ab37a58515a007e4f3ae852d906217",
  mainnet: "0x0",
  devnet: "0x0",
} as const;
export const LENDING_DEFINING_PACKAGE = {
  testnet:
    "0x39280c40c6ce4b7fb9ac5f836709edd44e8c9d96b8ea1a6a74ef5d52eccb528c",
  mainnet: "0x0",
  devnet: "0x0",
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
