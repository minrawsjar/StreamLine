import { PACKAGE_IDS, TEST_USDC, type NetworkName } from "./constants";

/**
 * The exact set of Move call targets the Enoki sponsor is willing to pay gas
 * for. Scoping sponsorship to StreamLine's own entry functions (plus the testnet
 * faucet) prevents the sponsor key from being drained on arbitrary transactions.
 */
const STREAM_FUNCTIONS = [
  "create_stream",
  "raise_completion",
  "approve_milestone",
  "drip",
  "raise_dispute",
  "set_splits",
  // Confidential streaming (amounts hidden, Groth16-verified on-chain).
  "create_confidential_stream",
  "confidential_drip",
  "claim",
  "confidential_dispute",
] as const;

export function allowedMoveCallTargets(network: NetworkName): string[] {
  const pkg = PACKAGE_IDS[network];
  const targets: string[] = [];

  if (pkg && pkg !== "0x0") {
    for (const fn of STREAM_FUNCTIONS) targets.push(`${pkg}::stream::${fn}`);
    targets.push(`${pkg}::collateral::collateralize`);
  }

  // Test-USDC faucet is only deployed (and only worth sponsoring) on testnet.
  if (network === "testnet") {
    targets.push(`${TEST_USDC.packageId}::mock_usdc::faucet`);
  }

  return targets;
}
