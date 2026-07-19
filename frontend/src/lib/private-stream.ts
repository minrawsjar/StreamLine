"use client";

/**
 * Private engagement client — default private stream path.
 * open = shielded deposit + schedule pin; settle = private_settle (spend + vest).
 */

import { Transaction, coinWithBalance } from "@mysten/sui/transactions";
import type { SuiClient } from "@mysten/sui/client";

import {
  poseidon,
  prove,
  randomBlinding,
  type ProofBytes,
} from "@/lib/confidential";
import {
  pk,
  noteCommit,
  merklePath,
  fetchCommitments,
  proveDeposit,
  signalsBig,
  SHIELDED_DEPTH,
} from "@/lib/shielded";
import { encryptNote, parseShieldedAddress } from "@/lib/shielded-address";
import { overfundAmount } from "@/lib/overfund-split";

const CLOCK_ID = "0x6";
const s = (x: bigint | number) => x.toString();
const u8 = (tx: Transaction, b: Uint8Array) =>
  tx.pure.vector("u8", Array.from(b));

/** Poseidon(rate, start, cap, blinding) — matches lazydrip / private_settle. */
export async function commitParamsU256(
  rate: bigint,
  start: bigint,
  cap: bigint,
  blinding: bigint
): Promise<bigint> {
  return poseidon([rate, start, cap, blinding]);
}

export function provePrivateSettle(p: {
  valueIn: bigint;
  sk: bigint;
  rhoIn: bigint;
  pathElements: string[];
  pathIndices: string[];
  v1: bigint;
  pk1: bigint;
  rho1: bigint;
  v2: bigint;
  pk2: bigint;
  rho2: bigint;
  rate: bigint;
  start: bigint;
  cap: bigint;
  rParams: bigint;
  nowSec: bigint;
}) {
  return prove("private_settle", {
    value_in: s(p.valueIn),
    sk: s(p.sk),
    rho_in: s(p.rhoIn),
    pathElements: p.pathElements,
    pathIndices: p.pathIndices,
    v1: s(p.v1),
    pk1: s(p.pk1),
    rho1: s(p.rho1),
    v2: s(p.v2),
    pk2: s(p.pk2),
    rho2: s(p.rho2),
    rate: s(p.rate),
    start: s(p.start),
    cap: s(p.cap),
    rParams: s(p.rParams),
    nowSec: s(p.nowSec),
  } as unknown as Record<string, string>);
}

export function buildOpenEngagement(a: {
  packageId: string;
  coinType: string;
  poolId: string;
  sender: string;
  /** Public coin amount locked (may be overfunded vs vesting cap). */
  depositBase: bigint;
  cm: bigint;
  depositProof: Uint8Array;
  paramsCommitment: bigint;
  ciphertext?: Uint8Array;
}): Transaction {
  const tx = new Transaction();
  tx.setSenderIfNotSet(a.sender);
  tx.moveCall({
    target: `${a.packageId}::private_stream::open_engagement`,
    typeArguments: [a.coinType],
    arguments: [
      tx.object(a.poolId),
      coinWithBalance({ type: a.coinType, balance: a.depositBase }),
      tx.pure.u256(a.cm),
      u8(tx, a.depositProof),
      tx.pure.u256(a.paramsCommitment),
      u8(tx, a.ciphertext ?? new Uint8Array()),
    ],
  });
  return tx;
}

export function buildSettleVested(a: {
  packageId: string;
  coinType: string;
  poolId: string;
  engagementId: string;
  root: bigint;
  nf: bigint;
  cm1: bigint;
  cm2: bigint;
  paramsCommitment: bigint;
  nowSec: bigint;
  proof: Uint8Array;
  workerCiphertext?: Uint8Array;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${a.packageId}::private_stream::settle_vested`,
    typeArguments: [a.coinType],
    arguments: [
      tx.object(a.poolId),
      tx.object(a.engagementId),
      tx.pure.u256(a.root),
      tx.pure.u256(a.nf),
      tx.pure.u256(a.cm1),
      tx.pure.u256(a.cm2),
      tx.pure.u256(a.paramsCommitment),
      tx.pure.u64(a.nowSec),
      u8(tx, a.proof),
      u8(tx, a.workerCiphertext ?? new Uint8Array()),
      tx.object(CLOCK_ID),
    ],
  });
  return tx;
}

/** Resolve PrivateEngagement object id from an open_engagement digest. */
export async function findCreatedEngagement(
  client: SuiClient,
  digest: string
): Promise<string | null> {
  const tx = await client.waitForTransaction({
    digest,
    options: { showEvents: true, showObjectChanges: true },
  });
  for (const e of tx.events ?? []) {
    if (e.type.endsWith("::EngagementOpened")) {
      const pj = e.parsedJson as { engagement_id?: string };
      if (pj.engagement_id) return pj.engagement_id;
    }
  }
  for (const c of tx.objectChanges ?? []) {
    if (
      c.type === "created" &&
      typeof c.objectType === "string" &&
      c.objectType.includes("::private_stream::PrivateEngagement")
    ) {
      return c.objectId;
    }
  }
  return null;
}

/**
 * Build + prove a private engagement open: fund note in the pool, pin vesting
 * params. By default deposits an overfunded round amount; caller should then
 * privately split into work(cap) + change so the public edge ≠ economic amount.
 */
export async function prepareOpenEngagement(p: {
  packageId: string;
  coinType: string;
  poolId: string;
  sender: string;
  sk: bigint;
  /** Vesting / economic cap (private after split). */
  capBase: bigint;
  durationSec: bigint;
  /** Override public deposit size; default = overfundAmount(capBase). */
  depositBase?: bigint;
  /** Skip overfund (deposit exactly capBase). */
  exactDeposit?: boolean;
  recipientShielded?: string;
}): Promise<{
  tx: Transaction;
  cm: bigint;
  rho: bigint;
  paramsCommitment: bigint;
  rate: bigint;
  start: bigint;
  rParams: bigint;
  pkv: bigint;
  depositProof: Uint8Array;
  depositBase: bigint;
  capBase: bigint;
  changeBase: bigint;
  ciphertext?: Uint8Array;
}> {
  const pkv = await pk(p.sk);
  const rho = randomBlinding();
  const rParams = randomBlinding();
  const start = BigInt(Math.floor(Date.now() / 1000));
  const rate =
    p.durationSec > 0n
      ? p.capBase / p.durationSec
      : p.capBase;
  // Ensure rate * duration covers cap (integer division floor).
  const rateAdj = rate === 0n ? 1n : rate;
  const paramsCommitment = await commitParamsU256(
    rateAdj,
    start,
    p.capBase,
    rParams
  );

  const depositBase = p.exactDeposit
    ? p.capBase
    : (p.depositBase ?? overfundAmount(p.capBase));
  if (depositBase < p.capBase) {
    throw new Error("depositBase must be ≥ vesting cap");
  }
  const changeBase = depositBase - p.capBase;

  const dep = await proveDeposit(depositBase, pkv, rho);
  const cm = BigInt(dep.publicSignals[0]);

  let ciphertext: Uint8Array | undefined;
  // Only publish opening when deposit == work note (no pending split).
  if (changeBase === 0n && p.recipientShielded?.startsWith("sl1")) {
    const recip = parseShieldedAddress(p.recipientShielded);
    ciphertext = await encryptNote(recip.encPub, p.capBase, rho);
  }

  const tx = buildOpenEngagement({
    packageId: p.packageId,
    coinType: p.coinType,
    poolId: p.poolId,
    sender: p.sender,
    depositBase,
    cm,
    depositProof: dep.proof,
    paramsCommitment,
    ciphertext,
  });

  return {
    tx,
    cm,
    rho,
    paramsCommitment,
    rate: rateAdj,
    start,
    rParams,
    pkv,
    depositProof: dep.proof,
    depositBase,
    capBase: p.capBase,
    changeBase,
    ciphertext,
  };
}

/** Settle vested amount to worker note + change; publish encrypted worker note. */
export async function prepareSettleVested(p: {
  packageId: string;
  coinType: string;
  poolId: string;
  engagementId: string;
  client: SuiClient;
  sk: bigint;
  rhoIn: bigint;
  valueIn: bigint;
  rate: bigint;
  start: bigint;
  cap: bigint;
  rParams: bigint;
  paramsCommitment: bigint;
  /** How much to pay the worker this settle (≤ vested − already paid). */
  payBase: bigint;
  workerShielded: string;
}): Promise<{
  tx: Transaction;
  cm1: bigint;
  cm2: bigint;
  rho1: bigint;
  rho2: bigint;
  nf: bigint;
  root: bigint;
  nowSec: bigint;
  proof: Uint8Array;
  workerCiphertext: Uint8Array;
  paramsCommitment: bigint;
}> {
  const commitments = await fetchCommitments(p.client, p.packageId);
  const cmIn = await noteCommit(p.valueIn, await pk(p.sk), p.rhoIn);
  const leafIndex = commitments.findIndex((c) => c === cmIn);
  if (leafIndex < 0) throw new Error("Funding note not found in pool tree");

  const { pathElements, pathIndices, root } = await merklePath(
    commitments,
    leafIndex
  );

  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const elapsed = nowSec > p.start ? nowSec - p.start : 0n;
  const vestedRaw = p.rate * elapsed;
  const vested = vestedRaw < p.cap ? vestedRaw : p.cap;
  const alreadyPaid = p.cap - p.valueIn;
  const maxPay = vested > alreadyPaid ? vested - alreadyPaid : 0n;
  const v1 = p.payBase <= maxPay ? p.payBase : maxPay;
  if (v1 <= 0n) throw new Error("Nothing vested to settle yet");
  const v2 = p.valueIn - v1;

  const recip = parseShieldedAddress(p.workerShielded);
  const rho1 = randomBlinding();
  const rho2 = randomBlinding();
  const pk2 = await pk(p.sk);

  const proof = await provePrivateSettle({
    valueIn: p.valueIn,
    sk: p.sk,
    rhoIn: p.rhoIn,
    pathElements,
    pathIndices,
    v1,
    pk1: recip.pk,
    rho1,
    v2,
    pk2,
    rho2,
    rate: p.rate,
    start: p.start,
    cap: p.cap,
    rParams: p.rParams,
    nowSec,
  });

  const sigs = signalsBig(proof);
  // [root, nf, cm1, cm2, cParams, nowSec]
  const nf = sigs[1];
  const cm1 = sigs[2];
  const cm2 = sigs[3];

  const workerCiphertext = await encryptNote(recip.encPub, v1, rho1);

  const tx = buildSettleVested({
    packageId: p.packageId,
    coinType: p.coinType,
    poolId: p.poolId,
    engagementId: p.engagementId,
    root: BigInt(root),
    nf,
    cm1,
    cm2,
    paramsCommitment: p.paramsCommitment,
    nowSec,
    proof: proof.proof,
    workerCiphertext,
  });

  return {
    tx,
    cm1,
    cm2,
    rho1,
    rho2,
    nf,
    root: BigInt(root),
    nowSec,
    proof: proof.proof,
    workerCiphertext,
    paramsCommitment: p.paramsCommitment,
  };
}

export { SHIELDED_DEPTH, proveDeposit, type ProofBytes };
