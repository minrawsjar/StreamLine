"use client";

import { useCallback, useEffect, useState } from "react";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { Transaction, coinWithBalance } from "@mysten/sui/transactions";

import { useNetworkVariable } from "@/lib/networks";
import { useGaslessExecute } from "@/lib/use-gasless";
import {
  commit,
  randomBlinding,
  proveWrap,
  proveDrip,
  proveUnwrap,
} from "@/lib/confidential";

const USDC = 1_000_000n; // 6 decimals
const DISPUTE_WINDOW_MS = 48 * 60 * 60 * 1000;
const CLOCK = "0x6";

/** Per-stream secrets — only the parties know these; the chain sees commitments.
 * Persisted in localStorage so the same wallet can drip/claim later. Real
 * client↔freelancer key-sharing would use Seal; this is the self-test path. */
type Secret = {
  streamId: string;
  coinType: string;
  totalBase: string;
  milestones: number;
  freelancer: string;
  remainingBase: string;
  rRemaining: string;
  earnedBase: string;
  rEarned: string;
  createdAt: number;
};

const keyFor = (a: string) => `streamline:conf:${a}`;
const usd = (base: bigint) => `$${(Number(base) / 1e6).toFixed(2)}`;

function loadSecrets(addr: string): Secret[] {
  try {
    return JSON.parse(localStorage.getItem(keyFor(addr)) ?? "[]");
  } catch {
    return [];
  }
}

function vec(tx: Transaction, bytes: Uint8Array) {
  return tx.pure.vector("u8", Array.from(bytes));
}

const scan = (digest: string) =>
  `https://suiscan.xyz/testnet/tx/${digest}`;

export function ConfidentialStreams() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const packageId = useNetworkVariable("packageId");
  const usdcType = useNetworkVariable("usdcType");
  const { execute, isPending } = useGaslessExecute();

  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [total, setTotal] = useState(500);
  const [milestones, setMilestones] = useState(4);
  const [status, setStatus] = useState<string | null>(null);
  const [lastDigest, setLastDigest] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const addr = account?.address;

  useEffect(() => {
    if (addr) setSecrets(loadSecrets(addr));
  }, [addr]);

  const persist = useCallback(
    (next: Secret[]) => {
      if (!addr) return;
      localStorage.setItem(keyFor(addr), JSON.stringify(next));
      setSecrets(next);
    },
    [addr]
  );

  const busy = working || isPending;

  // --- Create a confidential stream ---
  const onCreate = useCallback(async () => {
    if (!addr) return;
    setWorking(true);
    setStatus("Generating commitments + proof in your browser…");
    setLastDigest(null);
    try {
      const totalBase = BigInt(Math.round(total * 1e6));
      const rRemaining = randomBlinding();
      const rEarned = randomBlinding();
      const remainingC = await commit(totalBase, rRemaining);
      const earnedC = await commit(0n, rEarned);
      const wrap = await proveWrap(totalBase, rRemaining);

      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::stream::create_confidential_stream`,
        typeArguments: [usdcType],
        arguments: [
          coinWithBalance({ type: usdcType, balance: totalBase }),
          tx.pure.address(addr), // freelancer = self (so you can drip + claim)
          tx.pure.u64(milestones),
          vec(tx, remainingC),
          vec(tx, wrap.proof),
          vec(tx, earnedC),
          tx.pure.u64(DISPUTE_WINDOW_MS),
        ],
      });

      setStatus("Submitting to testnet…");
      await execute(tx, {
        onSuccess: async ({ digest }) => {
          setLastDigest(digest);
          setStatus("Confirming + reading stream id…");
          const streamId = await findCreatedStream(client, digest);
          if (streamId) {
            persist([
              {
                streamId,
                coinType: usdcType,
                totalBase: totalBase.toString(),
                milestones,
                freelancer: addr,
                remainingBase: totalBase.toString(),
                rRemaining: rRemaining.toString(),
                earnedBase: "0",
                rEarned: rEarned.toString(),
                createdAt: Date.now(),
              },
              ...loadSecrets(addr),
            ]);
          }
          setStatus(`Confidential stream created — amount hidden on chain ✓`);
        },
        onError: (e) => setStatus(e.message),
      });
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setWorking(false);
    }
  }, [addr, total, milestones, packageId, usdcType, execute, client, persist]);

  // --- Drip a hidden amount (remaining → earned) ---
  const onDrip = useCallback(
    async (s: Secret) => {
      if (!addr) return;
      setWorking(true);
      setStatus("Proving the confidential drip…");
      setLastDigest(null);
      try {
        const remaining = BigInt(s.remainingBase);
        const earned = BigInt(s.earnedBase);
        let delta = BigInt(s.totalBase) / BigInt(s.milestones);
        if (delta > remaining) delta = remaining;
        if (delta <= 0n) {
          setStatus("Nothing left to drip.");
          return;
        }
        const rRemNew = randomBlinding();
        const rEarnNew = randomBlinding();
        const newRemaining = remaining - delta;
        const newEarned = earned + delta;
        const newRemC = await commit(newRemaining, rRemNew);
        const newEarnC = await commit(newEarned, rEarnNew);
        const proof = await proveDrip({
          senderOld: remaining,
          rSenderOld: BigInt(s.rRemaining),
          rSenderNew: rRemNew,
          recipientOld: earned,
          rRecipientOld: BigInt(s.rEarned),
          rRecipientNew: rEarnNew,
          delta,
        });

        const tx = new Transaction();
        tx.moveCall({
          target: `${packageId}::stream::confidential_drip`,
          typeArguments: [s.coinType],
          arguments: [
            tx.object(s.streamId),
            vec(tx, newRemC),
            vec(tx, newEarnC),
            vec(tx, proof.proof),
            tx.object(CLOCK),
          ],
        });

        setStatus("Submitting drip…");
        await execute(tx, {
          onSuccess: ({ digest }) => {
            setLastDigest(digest);
            persist(
              loadSecrets(addr).map((x) =>
                x.streamId === s.streamId
                  ? {
                      ...x,
                      remainingBase: newRemaining.toString(),
                      rRemaining: rRemNew.toString(),
                      earnedBase: newEarned.toString(),
                      rEarned: rEarnNew.toString(),
                    }
                  : x
              )
            );
            setStatus(`Dripped ${usd(delta)} — hidden on chain ✓`);
          },
          onError: (e) => setStatus(e.message),
        });
      } catch (e) {
        setStatus(e instanceof Error ? e.message : String(e));
      } finally {
        setWorking(false);
      }
    },
    [addr, packageId, execute, persist]
  );

  // --- Claim earned (reveals only the withdrawn amount) ---
  const onClaim = useCallback(
    async (s: Secret) => {
      if (!addr) return;
      const earned = BigInt(s.earnedBase);
      if (earned <= 0n) {
        setStatus("Nothing to claim yet — drip first.");
        return;
      }
      setWorking(true);
      setStatus("Proving the claim…");
      setLastDigest(null);
      try {
        const unwrap = await proveUnwrap(earned, BigInt(s.rEarned));
        const resetR = randomBlinding();
        const resetC = await commit(0n, resetR);

        const tx = new Transaction();
        const coin = tx.moveCall({
          target: `${packageId}::stream::claim`,
          typeArguments: [s.coinType],
          arguments: [
            tx.object(s.streamId),
            tx.pure.u64(earned),
            vec(tx, unwrap.proof),
            vec(tx, resetC),
          ],
        });
        tx.transferObjects([coin], tx.pure.address(addr));

        setStatus("Submitting claim…");
        await execute(tx, {
          onSuccess: ({ digest }) => {
            setLastDigest(digest);
            persist(
              loadSecrets(addr).map((x) =>
                x.streamId === s.streamId
                  ? { ...x, earnedBase: "0", rEarned: resetR.toString() }
                  : x
              )
            );
            setStatus(`Claimed ${usd(earned)} to your wallet ✓`);
          },
          onError: (e) => setStatus(e.message),
        });
      } catch (e) {
        setStatus(e instanceof Error ? e.message : String(e));
      } finally {
        setWorking(false);
      }
    },
    [addr, packageId, execute, persist]
  );

  if (!addr) {
    return (
      <div className="border border-dashed border-[#2b2a5e]/25 px-8 py-16 text-center text-[13px] text-[#2b2a5e]/60">
        Connect a wallet to create confidential streams.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="mb-2 text-sm font-medium tracking-wider text-[#f08030]">
          Confidential streaming · live on testnet
        </p>
        <h2 className="text-[clamp(24px,4vw,36px)] font-semibold leading-tight">
          Stream with hidden amounts
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#555]">
          The amount is committed (Poseidon) and every step is proven (Groth16) in
          your browser, then verified on-chain by{" "}
          <code className="rounded bg-[#f1f4f5] px-1">sui::groth16</code>. On chain
          an observer sees only commitments — never the numbers. Needs test USDC
          (use the faucet) and a little testnet SUI for gas.
        </p>
      </div>

      {/* Create */}
      <div className="rounded border border-[#2b2a5e]/15 bg-white p-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm">
            <span className="mb-1 block text-[#555]">Total (USDC)</span>
            <input
              type="number"
              min={1}
              value={total}
              onChange={(e) => setTotal(Number(e.target.value))}
              className="w-32 rounded border border-black/15 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-[#555]">Milestones</span>
            <input
              type="number"
              min={1}
              max={8}
              value={milestones}
              onChange={(e) => setMilestones(Number(e.target.value))}
              className="w-24 rounded border border-black/15 px-3 py-2"
            />
          </label>
          <button
            onClick={onCreate}
            disabled={busy}
            className="sl-btn sl-btn-primary disabled:opacity-50"
          >
            {busy ? "Working…" : "Create confidential stream"}
          </button>
        </div>
      </div>

      {status && (
        <p className="text-sm text-[#2b2a5e]">
          {status}
          {lastDigest && (
            <>
              {" · "}
              <a
                href={scan(lastDigest)}
                target="_blank"
                rel="noreferrer"
                className="text-[#5b54e6] underline"
              >
                view tx ↗
              </a>
            </>
          )}
        </p>
      )}

      {/* Streams */}
      <div className="flex flex-col gap-3">
        {secrets.length === 0 ? (
          <p className="text-sm text-[#999]">
            No confidential streams yet — create one above.
          </p>
        ) : (
          secrets.map((s) => {
            const remaining = BigInt(s.remainingBase);
            const earned = BigInt(s.earnedBase);
            return (
              <div
                key={s.streamId}
                className="rounded border border-[#2b2a5e]/15 bg-white p-5"
              >
                <div className="flex items-center justify-between">
                  <a
                    href={`https://suiscan.xyz/testnet/object/${s.streamId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[12px] text-[#5b54e6] underline"
                  >
                    {s.streamId.slice(0, 10)}…{s.streamId.slice(-6)}
                  </a>
                  <span className="text-[10px] uppercase tracking-wider text-[#999]">
                    hidden on chain
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Field label="Total (secret)" value={usd(BigInt(s.totalBase))} />
                  <Field label="Remaining (secret)" value={usd(remaining)} />
                  <Field label="Earned (secret)" value={usd(earned)} />
                  <Field label="On chain" value="commitments only" mono />
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => onDrip(s)}
                    disabled={busy || remaining <= 0n}
                    className="sl-btn sl-btn-outline disabled:opacity-40"
                  >
                    Drip hidden {usd(BigInt(s.totalBase) / BigInt(s.milestones))}
                  </button>
                  <button
                    onClick={() => onClaim(s)}
                    disabled={busy || earned <= 0n}
                    className="sl-btn sl-btn-primary disabled:opacity-40"
                  >
                    Claim {usd(earned)}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-[#999]">{label}</p>
      <p className={`mt-0.5 text-sm font-bold text-[#111] ${mono ? "font-mono text-[11px]" : ""}`}>
        {value}
      </p>
    </div>
  );
}

async function findCreatedStream(
  client: ReturnType<typeof useSuiClient>,
  digest: string
): Promise<string | null> {
  try {
    await client.waitForTransaction({ digest });
    const tb = await client.getTransactionBlock({
      digest,
      options: { showObjectChanges: true },
    });
    const created = tb.objectChanges?.find(
      (c) =>
        c.type === "created" &&
        "objectType" in c &&
        typeof c.objectType === "string" &&
        c.objectType.includes("::stream::ConfidentialStream")
    );
    return created && "objectId" in created ? created.objectId : null;
  } catch {
    return null;
  }
}
