"use client";

/**
 * zkLogin via Enoki is temporarily disabled.
 *
 * The frontend is pinned to the stable Sui v1 + dApp Kit 0.16 stack (reliable
 * Slush signing). Enoki 1.x requires Sui v2; Enoki 0.13 pulls a *different*
 * @mysten/sui build, which would put two SDK copies in the tree. Rather than
 * risk that, we no-op here and re-enable Enoki once the wallet ecosystem
 * settles on a single SDK version. Extension-wallet signing is unaffected.
 */
export function RegisterEnokiWallets() {
  return null;
}
