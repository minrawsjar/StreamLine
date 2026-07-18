"use client";

import { Transaction, coinWithBalance } from "@mysten/sui/transactions";
import type { SuiClient } from "@mysten/sui/client";

import { poseidon, prove, feToLeBytes, type ProofBytes } from "@/lib/confidential";
import { deriveEnc, decryptNote } from "@/lib/shielded-address";

export const SHIELDED_DEPTH = 20;
const CLOCK_ID = "0x6";

// === Note crypto ===

/** Owner public key from a spending key: pk = Poseidon(sk, 0). */
export function pk(sk: bigint): Promise<bigint> {
  return poseidon([sk, 0n]);
}
/** Note commitment cm = Poseidon(value, pk, rho). */
export function noteCommit(value: bigint, pkv: bigint, rho: bigint): Promise<bigint> {
  return poseidon([value, pkv, rho]);
}
/** Nullifier nf = Poseidon(sk, rho). */
export function nullifier(sk: bigint, rho: bigint): Promise<bigint> {
  return poseidon([sk, rho]);
}

// === Merkle tree (matches merkle_tree.move: ZERO_LEAF=0, zeros[i]=H(z,z)) ===

let zerosCache: bigint[] | null = null;
async function zeros(): Promise<bigint[]> {
  if (zerosCache) return zerosCache;
  const z: bigint[] = [0n];
  for (let i = 1; i <= SHIELDED_DEPTH; i++) z[i] = await poseidon([z[i - 1], z[i - 1]]);
  zerosCache = z;
  return z;
}

/** Merkle path + root for `leafIndex` in a tree built from `commitments`
 * (empty slots = zero-subtrees), identical to the on-chain incremental tree. */
export async function merklePath(
  commitments: bigint[],
  leafIndex: number
): Promise<{ pathElements: string[]; pathIndices: string[]; root: string }> {
  const z = await zeros();
  const pathElements: string[] = [];
  const pathIndices: string[] = [];
  let cur = commitments.slice();
  let idx = leafIndex;
  for (let d = 0; d < SHIELDED_DEPTH; d++) {
    const isRight = idx % 2 === 1;
    const sibIdx = isRight ? idx - 1 : idx + 1;
    const sibling = sibIdx < cur.length ? cur[sibIdx] : z[d];
    pathElements.push(sibling.toString());
    pathIndices.push((idx % 2).toString());
    const next: bigint[] = [];
    for (let i = 0; i < cur.length; i += 2) {
      const left = cur[i];
      const right = i + 1 < cur.length ? cur[i + 1] : z[d];
      next.push(await poseidon([left, right]));
    }
    cur = next;
    idx = Math.floor(idx / 2);
  }
  const root = cur.length ? cur[0] : z[SHIELDED_DEPTH];
  return { pathElements, pathIndices, root: root.toString() };
}

// === Discovery: rebuild the commitment list (leaf order) from pool events ===

/** All note commitments in insertion order (== leaf index), replayed from
 * Deposited/Spent/Withdrawn events. One pool per module for the demo. */
export async function fetchCommitments(
  client: SuiClient,
  packageId: string
): Promise<bigint[]> {
  const out: bigint[] = [];
  let cursor: Awaited<ReturnType<SuiClient["queryEvents"]>>["nextCursor"] = null;
  for (let page = 0; page < 20; page++) {
    const res = await client.queryEvents({
      query: { MoveModule: { package: packageId, module: "shielded_pool" } },
      order: "ascending",
      cursor,
      limit: 200,
    });
    for (const e of res.data) {
      const pj = e.parsedJson as Record<string, string>;
      if (e.type.endsWith("::Deposited")) out.push(BigInt(pj.commitment));
      else if (e.type.endsWith("::Spent")) {
        out.push(BigInt(pj.cm1));
        out.push(BigInt(pj.cm2));
      } else if (e.type.endsWith("::Withdrawn")) out.push(BigInt(pj.cm_change));
    }
    if (!res.hasNextPage) break;
    cursor = res.nextCursor;
  }
  return out;
}

/** Scan EncryptedNote events for notes addressed to me (cross-party receive).
 * Returns openings whose recomputed commitment matches the on-chain event. */
export async function scanIncoming(
  client: SuiClient,
  packageId: string,
  sk: bigint,
  myPk: bigint
): Promise<{ commitment: string; value: string; rho: string }[]> {
  const { secret, pub } = deriveEnc(sk);
  const out: { commitment: string; value: string; rho: string }[] = [];
  let cursor: Awaited<ReturnType<SuiClient["queryEvents"]>>["nextCursor"] = null;
  for (let page = 0; page < 20; page++) {
    const res = await client.queryEvents({
      query: { MoveModule: { package: packageId, module: "shielded_pool" } },
      order: "ascending",
      cursor,
      limit: 200,
    });
    for (const e of res.data) {
      if (!e.type.endsWith("::EncryptedNote")) continue;
      const pj = e.parsedJson as { commitment: string; ciphertext: number[] | string };
      const bytes =
        typeof pj.ciphertext === "string"
          ? Uint8Array.from(atob(pj.ciphertext), (c) => c.charCodeAt(0))
          : Uint8Array.from(pj.ciphertext);
      const opening = await decryptNote(secret, pub, bytes);
      if (!opening) continue;
      const cm = await noteCommit(opening.value, myPk, opening.rho);
      if (cm === BigInt(pj.commitment)) {
        out.push({
          commitment: pj.commitment,
          value: opening.value.toString(),
          rho: opening.rho.toString(),
        });
      }
    }
    if (!res.hasNextPage) break;
    cursor = res.nextCursor;
  }
  return out;
}

// === Provers ===

const s = (x: bigint) => x.toString();

export function proveDeposit(value: bigint, pkv: bigint, rho: bigint) {
  return prove("deposit", { value: s(value), pk: s(pkv), rho: s(rho) });
}

export function proveShielded(p: {
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
}) {
  return prove("shielded", {
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
  } as unknown as Record<string, string>);
}

export function proveWithdraw(p: {
  valueIn: bigint;
  sk: bigint;
  rhoIn: bigint;
  pathElements: string[];
  pathIndices: string[];
  changeValue: bigint;
  pkChange: bigint;
  rhoChange: bigint;
}) {
  return prove("withdraw", {
    value_in: s(p.valueIn),
    sk: s(p.sk),
    rho_in: s(p.rhoIn),
    pathElements: p.pathElements,
    pathIndices: p.pathIndices,
    change_value: s(p.changeValue),
    pk_change: s(p.pkChange),
    rho_change: s(p.rhoChange),
  } as unknown as Record<string, string>);
}

/** Signals: shielded=[root,nf,cm1,cm2]; withdraw=[root,nf,amount,cm_change]. */
export function signalsBig(pf: ProofBytes): bigint[] {
  return pf.publicSignals.map((x) => BigInt(x));
}

// === PTB builders (streamline::shielded_pool) ===

const u8 = (tx: Transaction, b: Uint8Array) => tx.pure.vector("u8", Array.from(b));

export function buildDeposit(a: {
  packageId: string;
  coinType: string;
  poolId: string;
  sender: string;
  capBase: bigint;
  cm: bigint;
  proof: Uint8Array;
  ciphertext?: Uint8Array;
}): Transaction {
  const tx = new Transaction();
  tx.setSenderIfNotSet(a.sender);
  tx.moveCall({
    target: `${a.packageId}::shielded_pool::deposit`,
    typeArguments: [a.coinType],
    arguments: [
      tx.object(a.poolId),
      coinWithBalance({ type: a.coinType, balance: a.capBase }),
      tx.pure.u256(a.cm),
      u8(tx, a.proof),
    ],
  });
  if (a.ciphertext) {
    tx.moveCall({
      target: `${a.packageId}::shielded_pool::publish_note`,
      typeArguments: [a.coinType],
      arguments: [tx.object(a.poolId), tx.pure.u256(a.cm), u8(tx, a.ciphertext)],
    });
  }
  return tx;
}

export function buildSpend(a: {
  packageId: string;
  coinType: string;
  poolId: string;
  root: bigint;
  nf: bigint;
  cm1: bigint;
  cm2: bigint;
  proof: Uint8Array;
  /** Encrypted opening of cm1 for a cross-party recipient (published on-chain). */
  cipher1?: Uint8Array;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${a.packageId}::shielded_pool::spend`,
    typeArguments: [a.coinType],
    arguments: [
      tx.object(a.poolId),
      tx.pure.u256(a.root),
      tx.pure.u256(a.nf),
      tx.pure.u256(a.cm1),
      tx.pure.u256(a.cm2),
      u8(tx, a.proof),
    ],
  });
  if (a.cipher1) {
    tx.moveCall({
      target: `${a.packageId}::shielded_pool::publish_note`,
      typeArguments: [a.coinType],
      arguments: [tx.object(a.poolId), tx.pure.u256(a.cm1), u8(tx, a.cipher1)],
    });
  }
  return tx;
}

export function buildWithdraw(a: {
  packageId: string;
  coinType: string;
  poolId: string;
  root: bigint;
  nf: bigint;
  amount: bigint;
  cmChange: bigint;
  proof: Uint8Array;
  recipient: string;
}): Transaction {
  const tx = new Transaction();
  const coin = tx.moveCall({
    target: `${a.packageId}::shielded_pool::withdraw`,
    typeArguments: [a.coinType],
    arguments: [
      tx.object(a.poolId),
      tx.pure.u256(a.root),
      tx.pure.u256(a.nf),
      tx.pure.u64(a.amount),
      tx.pure.u256(a.cmChange),
      u8(tx, a.proof),
    ],
  });
  tx.transferObjects([coin], tx.pure.address(a.recipient));
  return tx;
}

export { feToLeBytes };
