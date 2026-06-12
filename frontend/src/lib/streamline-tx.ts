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
  /** Client address — required so `coinWithBalance` can pick the USDC coins. */
  sender: string;
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
  // coinWithBalance resolves the signer's coins at build time, so the sender
  // must be set before that happens (dApp Kit only sets it at sign time).
  tx.setSenderIfNotSet(a.sender);
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

// === Yield vault (Scallop-shaped) ===

export type VaultRef = { packageId: string; usdcType: string; vaultId: string };

/**
 * Deposit `amountBase` of USDC into the yield vault. The returned share receipt
 * is transferred back to the signer (Scallop's `mint` returns the sCoin).
 */
export function buildVaultDeposit(
  a: VaultRef & { sender: string; amountBase: bigint }
): Transaction {
  const tx = new Transaction();
  tx.setSenderIfNotSet(a.sender);
  const receipt = tx.moveCall({
    target: `${a.packageId}::yield_vault::deposit`,
    typeArguments: [a.usdcType],
    arguments: [
      tx.object(a.vaultId),
      coinWithBalance({ type: a.usdcType, balance: a.amountBase }),
      tx.object(CLOCK),
    ],
  });
  tx.transferObjects([receipt], a.sender);
  return tx;
}

/** Redeem a vault receipt for principal + accrued interest, sent to the signer. */
export function buildVaultRedeem(
  a: VaultRef & { sender: string; receiptId: string }
): Transaction {
  const tx = new Transaction();
  tx.setSenderIfNotSet(a.sender);
  const coin = tx.moveCall({
    target: `${a.packageId}::yield_vault::redeem`,
    typeArguments: [a.usdcType],
    arguments: [
      tx.object(a.vaultId),
      tx.object(a.receiptId),
      tx.object(CLOCK),
    ],
  });
  tx.transferObjects([coin], a.sender);
  return tx;
}

// === Lending pool (borrow against a stream) ===

export type PoolRef = { packageId: string; usdcType: string; poolId: string };

/**
 * Borrow `principalBase` against a dripping stream's present value. The borrowed
 * coin and the LoanReceipt both go to the signer.
 */
export function buildBorrow(
  a: PoolRef & { sender: string; streamId: string; principalBase: bigint }
): Transaction {
  const tx = new Transaction();
  tx.setSenderIfNotSet(a.sender);
  const coin = tx.moveCall({
    target: `${a.packageId}::collateral::borrow`,
    typeArguments: [a.usdcType],
    arguments: [
      tx.object(a.poolId),
      tx.object(a.streamId),
      tx.pure.u64(a.principalBase),
      tx.object(CLOCK),
    ],
  });
  tx.transferObjects([coin], a.sender);
  return tx;
}

/**
 * Repay a loan in full. `owedBase` is the client-computed amount due; we add a
 * tiny buffer so per-second interest drift can't underpay (the change comes
 * back to the signer).
 */
export function buildRepay(
  a: PoolRef & { sender: string; loanId: string; owedBase: bigint }
): Transaction {
  const tx = new Transaction();
  tx.setSenderIfNotSet(a.sender);
  const payment = coinWithBalance({
    type: a.usdcType,
    balance: a.owedBase + 10_000n, // +0.01 USDC interest-drift buffer
  });
  const change = tx.moveCall({
    target: `${a.packageId}::collateral::repay`,
    typeArguments: [a.usdcType],
    arguments: [
      tx.object(a.poolId),
      tx.object(a.loanId),
      payment,
      tx.object(CLOCK),
    ],
  });
  tx.transferObjects([change], a.sender);
  return tx;
}

/**
 * Like `buildCreateStream` but with an auto-yield split: `yieldBps` of every
 * drip is auto-deposited into the vault (via the keeper's `drip_with_yield`),
 * the rest paid as cash. Both legs go to the freelancer.
 */
export function buildCreateStreamV2(
  a: CreateStreamArgs & { yieldBps: number }
): Transaction {
  const tx = new Transaction();
  tx.setSenderIfNotSet(a.sender);
  tx.moveCall({
    target: `${a.packageId}::stream::create_stream_v2`,
    typeArguments: [a.usdcType],
    arguments: [
      coinWithBalance({ type: a.usdcType, balance: a.totalBase }),
      tx.pure.address(a.freelancer),
      tx.pure.vector("string", a.milestoneNames),
      tx.pure.vector("u64", a.milestoneAmountsBase),
      tx.pure.u64(a.durationMs),
      tx.pure.u64(a.disputeWindowMs ?? DEFAULT_DISPUTE_WINDOW_MS),
      tx.pure.bool(a.revocable ?? true),
      tx.pure.u64(BigInt(a.yieldBps)),
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

/**
 * Client cancels a revocable stream via the StreamCap: the unstreamed balance is
 * refunded to the client and the stream closes. The cap is consumed.
 */
export function buildCancel(r: StreamRef & { capId: string }): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${r.packageId}::stream::cancel`,
    typeArguments: [r.usdcType],
    arguments: [tx.object(r.capId), tx.object(r.streamId)],
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

/**
 * Propose how to end a dispute on a PAUSED stream. `resume` returns it to
 * dripping; otherwise the remaining balance splits, `freelancerBps` to the
 * freelancer and the rest back to the client. The counterparty must accept.
 */
export function buildProposeResolution(
  r: StreamRef & { resume: boolean; freelancerBps: number }
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${r.packageId}::stream::propose_resolution`,
    typeArguments: [r.usdcType],
    arguments: [
      tx.object(r.streamId),
      tx.pure.bool(r.resume),
      tx.pure.u64(BigInt(r.freelancerBps)),
    ],
  });
  return tx;
}

/** Accept the counterparty's pending resolution, executing the agreed outcome. */
export function buildAcceptResolution(r: StreamRef): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${r.packageId}::stream::accept_resolution`,
    typeArguments: [r.usdcType],
    arguments: [tx.object(r.streamId), tx.object(CLOCK)],
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

/** Mint test USDC from the shared faucet treasury to the signer. */
export function buildMintTestUsdc(a: {
  packageId: string;
  treasuryId: string;
  amountBase: bigint;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${a.packageId}::mock_usdc::faucet`,
    arguments: [tx.object(a.treasuryId), tx.pure.u64(a.amountBase)],
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
