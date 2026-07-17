import { PACKAGE_IDS, TEST_USDC, type NetworkName } from "./constants";

/**
 * The exact set of Move call targets the Enoki sponsor is willing to pay gas
 * for. Scoping sponsorship to StreamLine's own entry functions (plus the testnet
 * faucet) prevents the sponsor key from being drained on arbitrary transactions.
 */
const STREAM_FUNCTIONS = [
  "create_stream",
  "create_stream_v2",
  "drip_with_yield",
  "raise_completion",
  "approve_milestone",
  "cancel",
  "drip",
  "raise_dispute",
  "propose_resolution",
  "accept_resolution",
  "set_splits",
  // Confidential streaming (amounts hidden, Groth16-verified on-chain).
  "create_confidential_stream",
  "create_confidential_stream_v2",
  "confidential_drip",
  "confidential_drip_v2",
  "claim",
  "confidential_dispute",
  "conf_propose_resolution",
  "conf_accept_resolution",
  "conf_raise_completion",
  "conf_approve_milestone",
  "conf_auto_approve",
  "update_confidential_secrets",
] as const;

export function allowedMoveCallTargets(network: NetworkName): string[] {
  const pkg = PACKAGE_IDS[network];
  const targets: string[] = [];

  if (pkg && pkg !== "0x0") {
    for (const fn of STREAM_FUNCTIONS) targets.push(`${pkg}::stream::${fn}`);
    targets.push(`${pkg}::collateral::collateralize`);
    // Borrow against a stream (gasless borrow/repay).
    targets.push(`${pkg}::collateral::borrow`);
    targets.push(`${pkg}::collateral::repay`);
    // Scallop-shaped yield vault (gasless deposit/redeem).
    targets.push(`${pkg}::yield_vault::deposit`);
    targets.push(`${pkg}::yield_vault::redeem`);
    // Org treasury / Pro pool (gasless fund/withdraw/invest/divest).
    targets.push(`${pkg}::treasury::open`);
    targets.push(`${pkg}::treasury::deposit`);
    targets.push(`${pkg}::treasury::withdraw`);
    targets.push(`${pkg}::treasury::invest`);
    targets.push(`${pkg}::treasury::divest`);
    // Lazy confidential stream (gasless create/settle/claim).
    targets.push(`${pkg}::lazy_stream::create`);
    targets.push(`${pkg}::lazy_stream::settle`);
    targets.push(`${pkg}::lazy_stream::settle_at`);
    targets.push(`${pkg}::lazy_stream::claim`);
  }

  // Test-USDC faucet is only deployed (and only worth sponsoring) on testnet.
  if (network === "testnet") {
    targets.push(`${TEST_USDC.packageId}::mock_usdc::faucet`);
  }

  return targets;
}
