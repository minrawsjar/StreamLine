/**
 * Pure network constants — deliberately free of any `@mysten/dapp-kit` import so
 * this module is safe to load in server route handlers (the Enoki sponsorship
 * proxy) as well as client components. `networks.ts` builds the dApp Kit network
 * config on top of these.
 *
 * Package / USDC / fullnode IDs are shared with `@streamline/sdk`.
 */

export {
  PACKAGE_IDS,
  TEST_USDC,
  USDC_TYPE,
  FULLNODE_URLS,
  type NetworkName,
} from "@streamline/sdk";

import type { NetworkName } from "@streamline/sdk";

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
 * Scallop-shaped yield vault for the streamed coin (testnet stand-in for
 * Scallop's lending pool). 8% APR, seeded with a mock-USDC interest buffer.
 */
export const YIELD_VAULT = {
  testnet:
    "0x8ae9d8805682aabbd00ff0582d93b88f2f86482bcabed194a88a6ded99a88406",
  mainnet: process.env.NEXT_PUBLIC_YIELD_VAULT_MAINNET ?? "0x0",
  devnet: "0x0",
} as const;

/** Shielded pool (Phase 2) — one shared pool per network for the demo. */
export const SHIELDED_POOL = {
  testnet:
    "0x03048230a55bb4f49cecc36735e55559c94c1d27dcf5e49d2bd28b84ebc7e7d4",
  mainnet: "0x0",
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
 * Shared GiftCardVault for USDC — aggregate reserve for ZK gift cards.
 * Publish once after upgrading the package with `giftcard::create_vault`.
 */
export const GIFT_CARD_VAULT = {
  testnet: process.env.NEXT_PUBLIC_GIFT_CARD_VAULT_TESTNET ?? "0x0",
  mainnet: process.env.NEXT_PUBLIC_GIFT_CARD_VAULT_MAINNET ?? "0x0",
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

export const DEFAULT_NETWORK: NetworkName =
  (process.env.NEXT_PUBLIC_DEFAULT_NETWORK as NetworkName) ?? "testnet";
