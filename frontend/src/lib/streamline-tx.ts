import { Transaction, coinWithBalance } from "@mysten/sui/transactions";

/**
 * PTB builders for the StreamLine Move package. Each returns a `Transaction`
 * ready to sign via dApp Kit's `useSignAndExecuteTransaction`. Signatures mirror
 * `streamline::stream` / `streamline::collateral`.
 */

/** The shared on-chain Clock object. */
const CLOCK = "0x6";
/** Default review window before a raised milestone auto-approves (48h). */
export const DEFAULT_DISPUTE_WINDOW_MS = 48 * 60 * 60 * 1000;

export type CreateStreamArgs = {
  packageId: string;
  usdcType: string;
  freelancer: string;
  milestoneNames: string[];
  /** Per-milestone amounts in base units; must sum to `totalBase`. */
  milestoneAmountsBase: bigint[];
  totalBase: bigint;
  durationMs: number;
  disputeWindowMs?: number;
  revocable?: boolean;
};

/** Lock USDC and create a milestone stream (client signs). */
export function buildCreateStream(a: CreateStreamArgs): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${a.packageId}::stream::create_stream`,
    typeArguments: [a.usdcType],
    arguments: [
      // Auto-selects/merges/splits the signer's USDC to the exact amount; this
      // Coin is consumed into the Stream's locked Balance.
      coinWithBalance({ type: a.usdcType, balance: a.totalBase }),
      tx.pure.address(a.freelancer),
      tx.pure.vector("string", a.milestoneNames),
      tx.pure.vector("u64", a.milestoneAmountsBase),
      tx.pure.u64(a.durationMs),
      tx.pure.u64(a.disputeWindowMs ?? DEFAULT_DISPUTE_WINDOW_MS),
      tx.pure.bool(a.revocable ?? true),
      tx.object(CLOCK),
    ],
  });
  return tx;
}

type StreamRef = { packageId: string; usdcType: string; streamId: string };

/** Freelancer signals the current milestone is complete. */
export function buildRaiseCompletion(r: StreamRef): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${r.packageId}::stream::raise_completion`,
    typeArguments: [r.usdcType],
    arguments: [tx.object(r.streamId), tx.object(CLOCK)],
  });
  return tx;
}

/** Client approves the raised milestone via the StreamCap. */
export function buildApproveMilestone(r: StreamRef & { capId: string }): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${r.packageId}::stream::approve_milestone`,
    typeArguments: [r.usdcType],
    arguments: [tx.object(r.capId), tx.object(r.streamId), tx.object(CLOCK)],
  });
  return tx;
}

/** Permissionless settlement — the keeper (or anyone) pushes a drip. */
export function buildDrip(r: StreamRef): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${r.packageId}::stream::drip`,
    typeArguments: [r.usdcType],
    arguments: [tx.object(r.streamId), tx.object(CLOCK)],
  });
  return tx;
}

/** Either party pauses a pending/dripping stream. */
export function buildRaiseDispute(r: StreamRef): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${r.packageId}::stream::raise_dispute`,
    typeArguments: [r.usdcType],
    arguments: [tx.object(r.streamId)],
  });
  return tx;
}

export type SetSplitsArgs = StreamRef & {
  destinations: string[];
  weightsBps: number[];
  yieldFlags: boolean[];
};

/** Freelancer configures where each drip is routed (weights sum to 10000). */
export function buildSetSplits(a: SetSplitsArgs): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${a.packageId}::stream::set_splits`,
    typeArguments: [a.usdcType],
    arguments: [
      tx.object(a.streamId),
      tx.pure.vector("address", a.destinations),
      tx.pure.vector("u64", a.weightsBps),
      tx.pure.vector("bool", a.yieldFlags),
    ],
  });
  return tx;
}

/** Borrow against a dripping stream — mints a CollateralReceipt. */
export function buildCollateralize(
  r: StreamRef & { lender: string; principalBase: bigint; autoRepay: boolean }
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${r.packageId}::collateral::collateralize`,
    typeArguments: [r.usdcType],
    arguments: [
      tx.object(r.streamId),
      tx.pure.address(r.lender),
      tx.pure.u64(r.principalBase),
      tx.pure.bool(r.autoRepay),
    ],
  });
  return tx;
}

/**
 * Split a total into N per-milestone base-unit amounts that sum exactly to the
 * total (the remainder lands on the last milestone).
 */
export function splitMilestoneAmounts(totalBase: bigint, n: number): bigint[] {
  if (n <= 0) return [];
  const per = totalBase / BigInt(n);
  const out = Array.from({ length: n }, () => per);
  out[n - 1] = totalBase - per * BigInt(n - 1);
  return out;
}
