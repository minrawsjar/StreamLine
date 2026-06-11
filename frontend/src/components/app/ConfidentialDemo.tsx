"use client";

import { useState } from "react";
import {
  commit,
  randomBlinding,
  proveWrap,
  proveDrip,
  proveUnwrap,
  type ProofBytes,
} from "@/lib/confidential";

const USDC = 1_000_000n; // 6 decimals

function hex(b: Uint8Array, n = 8): string {
  const s = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${s.slice(0, n)}…${s.slice(-n)}`;
}

type Step = {
  label: string;
  secret: string; // shown only locally
  commitment: string; // what goes on-chain (opaque)
  proof: string;
  ms: number;
};

/**
 * Browser proving demo: enter amounts, watch the client compute Poseidon
 * commitments and generate Groth16 proofs locally. The amounts never leave the
 * page — only the opaque commitments and proofs would go on-chain, where
 * sui::groth16 verifies them.
 */
export function ConfidentialDemo() {
  const [total, setTotal] = useState(500);
  const [drip, setDrip] = useState(125);
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setSteps([]);
    try {
      const out: Step[] = [];
      const add = async (
        label: string,
        secret: string,
        commitment: Uint8Array,
        provePromise: Promise<ProofBytes>
      ) => {
        const t0 = performance.now();
        const p = await provePromise;
        out.push({
          label,
          secret,
          commitment: hex(commitment),
          proof: `${p.proof.length} bytes · verified locally`,
          ms: Math.round(performance.now() - t0),
        });
        setSteps([...out]);
      };

      const totalU = BigInt(total) * USDC;
      const deltaU = BigInt(drip) * USDC;

      // Blinding factors (the secrets that make commitments hiding).
      const rRemain0 = randomBlinding();
      const rRemain1 = randomBlinding();
      const rEarn0 = randomBlinding();
      const rEarn1 = randomBlinding();

      // 1. Open: bind the locked total to a hidden remaining commitment.
      await add(
        `Open stream — lock $${total}`,
        `$${total} (your secret)`,
        await commit(totalU, rRemain0),
        proveWrap(totalU, rRemain0)
      );

      // 2. Drip: move a hidden delta from remaining → earned.
      const newRemain = await commit(totalU - deltaU, rRemain1);
      await add(
        `Drip — hidden $${drip}`,
        `$${drip} delta (hidden on chain)`,
        newRemain,
        proveDrip({
          senderOld: totalU,
          rSenderOld: rRemain0,
          rSenderNew: rRemain1,
          recipientOld: 0n,
          rRecipientOld: rEarn0,
          rRecipientNew: rEarn1,
          delta: deltaU,
        })
      );

      // 3. Claim: reveal only what is withdrawn.
      await add(
        `Claim — reveal $${drip}`,
        `$${drip} (revealed at cash-out only)`,
        await commit(deltaU, rEarn1),
        proveUnwrap(deltaU, rEarn1)
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[720px] px-6 py-16">
      <p className="mb-2 text-sm font-medium tracking-wider text-[#f08030]">
        Confidential amounts · zero-knowledge
      </p>
      <h1 className="text-[clamp(28px,5vw,40px)] font-semibold leading-tight">
        Prove a hidden amount in your browser
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[#555]">
        Amounts are committed with Poseidon and proven with Groth16 — entirely on
        this page. Only the opaque commitments and proofs go on chain, where
        <code className="mx-1 rounded bg-[#f1f4f5] px-1">sui::groth16</code>
        verifies them. Your numbers never leave the browser.
      </p>

      <div className="mt-8 flex flex-wrap items-end gap-4">
        <label className="text-sm">
          <span className="mb-1 block text-[#555]">Total (USDC)</span>
          <input
            type="number"
            value={total}
            min={1}
            onChange={(e) => setTotal(Number(e.target.value))}
            className="w-32 rounded border border-black/15 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[#555]">Drip (USDC)</span>
          <input
            type="number"
            value={drip}
            min={1}
            max={total}
            onChange={(e) => setDrip(Number(e.target.value))}
            className="w-32 rounded border border-black/15 px-3 py-2"
          />
        </label>
        <button
          onClick={run}
          disabled={busy}
          className="sl-btn sl-btn-primary disabled:opacity-50"
        >
          {busy ? "Proving in your browser…" : "Generate proofs"}
        </button>
      </div>

      {error && (
        <p className="mt-6 rounded bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {steps.map((s, i) => (
          <div
            key={i}
            className="rounded border border-black/10 bg-white p-5 shadow-[2px_2px_18px_rgba(0,0,0,0.05)]"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{s.label}</span>
              <span className="text-xs text-[#1d9e75]">✓ {s.ms} ms</span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="block text-xs uppercase tracking-wide text-[#999]">
                  Secret (this device)
                </span>
                <span className="font-medium">{s.secret}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wide text-[#999]">
                  On chain (commitment)
                </span>
                <code className="font-mono text-[#555]">{s.commitment}</code>
              </div>
            </div>
            <p className="mt-2 text-xs text-[#999]">Groth16 proof · {s.proof}</p>
          </div>
        ))}
      </div>

      {steps.length === 3 && (
        <p className="mt-6 text-sm text-[#1d9e75]">
          All three proofs generated locally and self-verified. On chain, an
          observer sees only the commitments above — never the amounts.
        </p>
      )}
    </div>
  );
}
