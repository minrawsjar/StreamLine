"use client";

import { useCallback, useEffect, useState } from "react";
import { useCurrentAccount, useSuiClient, useSuiClientContext } from "@mysten/dapp-kit";

import { useNetworkVariable } from "@/lib/networks";
import { useGaslessExecute } from "@/lib/use-gasless";
import { toBaseUnits, USDC_BASE } from "@/lib/stream-math";
import { randomBlinding } from "@/lib/confidential";
import { SHIELDED_POOL, type NetworkName } from "@/lib/constants";
import {
  pk,
  noteCommit,
  merklePath,
  fetchCommitments,
  proveDeposit,
  proveShielded,
  proveWithdraw,
  signalsBig,
  buildDeposit,
  buildSpend,
  buildWithdraw,
  scanIncoming,
} from "@/lib/shielded";
import {
  myShieldedAddress,
  parseShieldedAddress,
  encryptNote,
} from "@/lib/shielded-address";
import {
  getSpendKey,
  loadNotes,
  addNote,
  markSpent,
  type ShieldedNote,
} from "@/lib/shielded-store";

const s = (x: bigint) => x.toString();
const usd = (base: bigint | string) => `$${(Number(base) / USDC_BASE).toFixed(2)}`;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** First unspent note holding at least `need` base units. */
function pickNote(notes: ShieldedNote[], need: bigint): ShieldedNote | null {
  return notes.find((n) => !n.spent && BigInt(n.value) >= need) ?? null;
}

export function ShieldedPanel() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { network } = useSuiClientContext();
  const packageId = useNetworkVariable("packageId");
  const usdcType = useNetworkVariable("usdcType");
  const { execute, isPending } = useGaslessExecute();
  const address = account?.address ?? "";
  const poolId = SHIELDED_POOL[(network as NetworkName) ?? "testnet"];

  const [depositAmt, setDepositAmt] = useState("100");
  const [transferAmt, setTransferAmt] = useState("25");
  const [recipientAddr, setRecipientAddr] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("50");
  const [payTo, setPayTo] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [myAddr, setMyAddr] = useState("");
  const [tick, setTick] = useState(0);

  const notes = address ? loadNotes(address) : [];
  const balance = notes.reduce((a, n) => a + (n.spent ? 0n : BigInt(n.value)), 0n);
  const bump = () => setTick((t) => t + 1);

  // My shareable receive address (pk ‖ x25519 enc pubkey), derived from sk.
  useEffect(() => {
    if (!address) return;
    const sk = getSpendKey(address);
    pk(sk).then((pkv) => setMyAddr(myShieldedAddress(sk, pkv)));
  }, [address]);

  // Common prep: my spending key, its pk, and the current on-chain leaf list.
  const prep = useCallback(async () => {
    const sk = getSpendKey(address);
    const pkv = await pk(sk);
    const commitments = await fetchCommitments(client, packageId);
    return { sk, pkv, commitments };
  }, [address, client, packageId]);

  const onDeposit = useCallback(async () => {
    if (!address) return;
    setStatus(null);
    try {
      const value = toBaseUnits(Number(depositAmt));
      if (value <= 0n) return;
      const sk = getSpendKey(address);
      const pkv = await pk(sk);
      const rho = randomBlinding();
      setStatus("Proving the deposit note…");
      const proofBytes = await proveDeposit(value, pkv, rho);
      const cm = BigInt(proofBytes.publicSignals[0]);
      setStatus("Awaiting signature…");
      const tx = buildDeposit({
        packageId,
        coinType: usdcType,
        poolId,
        sender: address,
        capBase: value,
        cm,
        proof: proofBytes.proof,
      });
      await execute(tx, {
        onSuccess: () => {
          addNote(address, {
            commitment: s(cm),
            value: s(value),
            rho: s(rho),
            spent: false,
            createdAt: Date.now(),
          });
          bump();
          setStatus(`Deposited ${usd(value)} into the shield — now a private note.`);
        },
        onError: (e) => setStatus(e.message),
      });
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }, [address, depositAmt, packageId, usdcType, poolId, execute]);

  const onTransfer = useCallback(async () => {
    if (!address) return;
    setStatus(null);
    try {
      const v1 = toBaseUnits(Number(transferAmt));
      const note = pickNote(notes, v1);
      if (!note) {
        setStatus("No single unspent note large enough — deposit more first.");
        return;
      }
      const valueIn = BigInt(note.value);
      const v2 = valueIn - v1; // change back to me
      const { sk, pkv, commitments } = await prep();
      const leafIndex = commitments.indexOf(BigInt(note.commitment));
      if (leafIndex < 0) {
        setStatus("Note not found on-chain yet — wait for indexing.");
        return;
      }
      const { pathElements, pathIndices } = await merklePath(commitments, leafIndex);
      // Output 1 → recipient (their address, or me if blank); output 2 → my change.
      const toSelf = !recipientAddr.trim();
      const recip = toSelf ? null : parseShieldedAddress(recipientAddr);
      const pk1 = recip ? recip.pk : pkv;
      const rho1 = randomBlinding();
      const rho2 = randomBlinding();
      setStatus("Proving the private spend…");
      const pf = await proveShielded({
        valueIn,
        sk,
        rhoIn: BigInt(note.rho),
        pathElements,
        pathIndices,
        v1,
        pk1,
        rho1,
        v2,
        pk2: pkv,
        rho2,
      });
      const [root, nf, cm1, cm2] = signalsBig(pf);
      // For a real recipient, hand them the opening on-chain, encrypted to them.
      const cipher1 = recip ? await encryptNote(recip.encPub, v1, rho1) : undefined;
      setStatus("Awaiting signature…");
      const tx = buildSpend({
        packageId,
        coinType: usdcType,
        poolId,
        root,
        nf,
        cm1,
        cm2,
        proof: pf.proof,
        cipher1,
      });
      await execute(tx, {
        onSuccess: () => {
          markSpent(address, note.commitment);
          if (toSelf) {
            addNote(address, {
              commitment: s(cm1),
              value: s(v1),
              rho: s(rho1),
              spent: false,
              createdAt: Date.now(),
            });
          }
          if (v2 > 0n) {
            addNote(address, {
              commitment: s(cm2),
              value: s(v2),
              rho: s(rho2),
              spent: false,
              createdAt: Date.now(),
            });
          }
          bump();
          setStatus(
            toSelf
              ? `Split note privately — link to the original is broken on-chain.`
              : `Sent ${usd(v1)} to a hidden recipient; ${usd(v2)} change kept. They can now "Scan for incoming".`
          );
        },
        onError: (e) => setStatus(e.message),
      });
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }, [address, transferAmt, recipientAddr, notes, prep, packageId, usdcType, poolId, execute]);

  const onScan = useCallback(async () => {
    if (!address) return;
    setStatus("Scanning for notes sent to you…");
    try {
      const sk = getSpendKey(address);
      const myPk = await pk(sk);
      const found = await scanIncoming(client, packageId, sk, myPk);
      const known = new Set(loadNotes(address).map((n) => n.commitment));
      let added = 0;
      for (const f of found) {
        if (known.has(f.commitment)) continue;
        addNote(address, { ...f, spent: false, createdAt: Date.now() });
        added++;
      }
      bump();
      setStatus(
        added > 0
          ? `Received ${added} note(s) — now in your shielded balance.`
          : "No new incoming notes."
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }, [address, client, packageId]);

  const onWithdraw = useCallback(async () => {
    if (!address) return;
    setStatus(null);
    try {
      const amount = toBaseUnits(Number(withdrawAmt));
      const note = pickNote(notes, amount);
      if (!note) {
        setStatus("No single unspent note large enough — deposit more first.");
        return;
      }
      const valueIn = BigInt(note.value);
      const changeValue = valueIn - amount;
      const { sk, pkv, commitments } = await prep();
      const leafIndex = commitments.indexOf(BigInt(note.commitment));
      if (leafIndex < 0) {
        setStatus("Note not found on-chain yet — wait for indexing.");
        return;
      }
      const { pathElements, pathIndices } = await merklePath(commitments, leafIndex);
      const rhoChange = randomBlinding();
      const recipient = (payTo.trim() || address).toLowerCase();
      setStatus("Proving the withdrawal…");
      const pf = await proveWithdraw({
        valueIn,
        sk,
        rhoIn: BigInt(note.rho),
        pathElements,
        pathIndices,
        changeValue,
        pkChange: pkv,
        rhoChange,
      });
      const [root, nf, amt, cmChange] = signalsBig(pf);
      setStatus("Awaiting signature…");
      const tx = buildWithdraw({
        packageId,
        coinType: usdcType,
        poolId,
        root,
        nf,
        amount: amt,
        cmChange,
        proof: pf.proof,
        recipient,
      });
      await execute(tx, {
        onSuccess: () => {
          markSpent(address, note.commitment);
          if (changeValue > 0n) {
            addNote(address, {
              commitment: s(cmChange),
              value: s(changeValue),
              rho: s(rhoChange),
              spent: false,
              createdAt: Date.now(),
            });
          }
          bump();
          setStatus(`Withdrew ${usd(amount)} to ${short(recipient)} — source note hidden.`);
        },
        onError: (e) => setStatus(e.message),
      });
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }, [address, withdrawAmt, payTo, notes, prep, packageId, usdcType, poolId, execute]);

  if (!address) return null;
  const field =
    "mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5 text-[12px]";
  const btn =
    "mt-3 rounded-full bg-[#6c5ce7] px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-50";

  return (
    <div className="space-y-4" data-tick={tick}>
      <div className="rounded-2xl border border-[#6c5ce7]/25 bg-[#6c5ce7]/[0.04] p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] text-[#666]">Your shielded balance</p>
            <p className="text-[22px] font-bold text-[#111]">{usd(balance)}</p>
            <p className="mt-0.5 text-[10px] text-[#aaa]">
              {notes.filter((n) => !n.spent).length} private note(s) · openings stored
              locally in this browser
            </p>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={onScan}
            className="rounded-full border border-[#6c5ce7]/40 px-3 py-1.5 text-[10px] font-semibold text-[#6c5ce7] disabled:opacity-50"
          >
            Scan for incoming
          </button>
        </div>
        {myAddr && (
          <div className="mt-3 border-t border-[#6c5ce7]/15 pt-2.5">
            <p className="text-[10px] text-[#888]">
              Your receive address — share it to get paid privately
            </p>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-white px-2 py-1 font-mono text-[10px] text-[#333]">
                {myAddr}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(myAddr)}
                className="rounded-lg border border-black/10 px-2 py-1 text-[10px] font-semibold text-[#333]"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Deposit */}
      <div className="rounded-2xl border border-black/10 bg-white p-4">
        <p className="text-[13px] font-semibold text-[#111]">Shield funds (deposit)</p>
        <p className="mt-1 text-[11px] text-[#666]">
          Public USDC → a private note. The amount is visible entering the pool; after
          that your balance and transfers are hidden.
        </p>
        <label className="mt-3 block text-[10px] text-[#888]">
          Amount (USDC)
          <input
            className={field}
            inputMode="decimal"
            value={depositAmt}
            onChange={(e) => setDepositAmt(e.target.value)}
          />
        </label>
        <button type="button" disabled={isPending} onClick={onDeposit} className={btn}>
          {isPending ? "Working…" : "Shield"}
        </button>
      </div>

      {/* Private transfer */}
      <div className="rounded-2xl border border-black/10 bg-white p-4">
        <p className="text-[13px] font-semibold text-[#111]">Private transfer</p>
        <p className="mt-1 text-[11px] text-[#666]">
          Spend a note into two — breaks the on-chain link. Leave recipient blank to
          re-randomize to yourself, or paste a recipient&apos;s <em>receive address</em>{" "}
          to pay them (they get the opening encrypted on-chain — no side channel).
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <label className="text-[10px] text-[#888]">
            Amount (USDC)
            <input
              className={field}
              inputMode="decimal"
              value={transferAmt}
              onChange={(e) => setTransferAmt(e.target.value)}
            />
          </label>
          <label className="col-span-2 text-[10px] text-[#888]">
            Recipient address (blank = self)
            <input
              className={`${field} font-mono text-[11px]`}
              placeholder="sl1…"
              value={recipientAddr}
              onChange={(e) => setRecipientAddr(e.target.value)}
            />
          </label>
        </div>
        <button type="button" disabled={isPending} onClick={onTransfer} className={btn}>
          {isPending ? "Working…" : "Send privately"}
        </button>
      </div>

      {/* Withdraw */}
      <div className="rounded-2xl border border-black/10 bg-white p-4">
        <p className="text-[13px] font-semibold text-[#111]">Unshield (withdraw)</p>
        <p className="mt-1 text-[11px] text-[#666]">
          Private note → public USDC at any address. The pay-out amount is revealed;
          which deposit funded it stays hidden.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-[10px] text-[#888]">
            Amount (USDC)
            <input
              className={field}
              inputMode="decimal"
              value={withdrawAmt}
              onChange={(e) => setWithdrawAmt(e.target.value)}
            />
          </label>
          <label className="text-[10px] text-[#888]">
            Pay to (blank = you)
            <input
              className={`${field} font-mono text-[11px]`}
              placeholder="0x…"
              value={payTo}
              onChange={(e) => setPayTo(e.target.value)}
            />
          </label>
        </div>
        <button type="button" disabled={isPending} onClick={onWithdraw} className={btn}>
          {isPending ? "Working…" : "Unshield"}
        </button>
      </div>

      {status && <p className="text-[11px] leading-snug text-[#6c5ce7]">{status}</p>}

      {notes.filter((n) => !n.spent).length > 0 && (
        <div className="rounded-2xl border border-black/10 bg-white p-3.5">
          <p className="text-[11px] font-semibold text-[#111]">Your notes</p>
          <div className="mt-2 space-y-1.5">
            {notes
              .filter((n) => !n.spent)
              .map((n) => (
                <div
                  key={n.commitment}
                  className="flex items-center justify-between text-[10px]"
                >
                  <span className="font-mono text-[#888]">{short(n.commitment)}</span>
                  <span className="font-semibold text-[#111]">{usd(n.value)}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
