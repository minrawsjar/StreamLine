"use client";

import { useMemo, useState } from "react";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";

import { useNetworkVariable } from "@/lib/networks";
import { useGaslessExecute } from "@/lib/use-gasless";
import {
  durationToMs,
  dripIntervalMs,
  formatInterval,
  formatUsd,
  ratePerSecond,
  toBaseUnits,
  type DurationUnit,
} from "@/lib/stream-math";
import {
  buildCreateStream,
  splitMilestoneAmounts,
  DEFAULT_DISPUTE_WINDOW_MS,
} from "@/lib/streamline-tx";
import {
  buildCreateConfidentialStreamV2,
  commit,
  proveWrap,
  randomBlinding,
} from "@/lib/confidential";
import { encryptSecrets } from "@/lib/seal";
import {
  addSecret,
  findCreatedConfidentialStream,
} from "@/lib/confidential-store";

type SplitRow = { label: string; address: string; pct: number; yield: boolean };

const DEFAULT_SPLITS: SplitRow[] = [
  { label: "Spending wallet", address: "", pct: 70, yield: false },
  { label: "Scallop (yield)", address: "", pct: 30, yield: true },
];

export function StreamCreator() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const packageId = useNetworkVariable("packageId");
  const usdcType = useNetworkVariable("usdcType");
  const originalPackageId = useNetworkVariable("originalPackageId");
  const { execute, isPending } = useGaslessExecute();

  const [isPrivate, setIsPrivate] = useState(false);
  const [freelancer, setFreelancer] = useState("");
  const [amount, setAmount] = useState(800);
  const [durationValue, setDurationValue] = useState(14);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("days");
  const [milestones, setMilestones] = useState<string[]>([
    "Wireframes",
    "Mockups",
    "Revisions",
    "Final",
  ]);
  const [splits, setSplits] = useState<SplitRow[]>(DEFAULT_SPLITS);
  const [status, setStatus] = useState<string | null>(null);
  const [proving, setProving] = useState(false);

  const durationMs = durationToMs(durationValue, durationUnit);
  const rate = ratePerSecond(amount, durationMs);
  const interval = dripIntervalMs(amount, durationMs);
  const splitSum = splits.reduce((s, r) => s + (Number(r.pct) || 0), 0);

  const deployed = packageId && packageId !== "0x0";
  const errors = useMemo(() => {
    const e: string[] = [];
    if (amount <= 0) e.push("Amount must be greater than 0.");
    if (milestones.length === 0) e.push("Add at least one milestone.");
    if (amount / Math.max(milestones.length, 1) < 0.01)
      e.push("Each milestone must be ≥ 0.01 USDC.");
    if (isPrivate) {
      // Private streams encrypt the secrets to the recipient's wallet, so it
      // must be a concrete address. Duration/splits don't apply (manual drips).
      if (!/^0x[0-9a-fA-F]{1,64}$/.test(freelancer.trim()))
        e.push("Private streams need a valid recipient address (0x…).");
    } else {
      if (durationValue <= 0) e.push("Duration must be greater than 0.");
      if (splitSum !== 100)
        e.push(`Splits must total 100% (currently ${splitSum}%).`);
    }
    return e;
  }, [amount, durationValue, milestones.length, splitSum, isPrivate, freelancer]);

  const canCreate = errors.length === 0 && !!account;

  const updateMilestone = (i: number, v: string) =>
    setMilestones((m) => m.map((x, j) => (j === i ? v : x)));
  const updateSplit = (i: number, patch: Partial<SplitRow>) =>
    setSplits((s) => s.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const onCreate = () => {
    if (!canCreate) return;
    if (!deployed) {
      setStatus(
        "Move package not deployed on this network yet — PTB is previewed above."
      );
      return;
    }
    if (isPrivate) {
      void onCreatePrivate();
      return;
    }
    const totalBase = toBaseUnits(amount);
    const tx = buildCreateStream({
      packageId,
      usdcType,
      sender: account.address,
      freelancer,
      milestoneNames: milestones,
      milestoneAmountsBase: splitMilestoneAmounts(totalBase, milestones.length),
      totalBase,
      durationMs,
    });
    setStatus("Awaiting wallet signature…");
    execute(tx, {
      onSuccess: (r) =>
        setStatus(`Stream created — locked ${formatUsd(amount)}. Digest ${r.digest}`),
      onError: (e) => setStatus(e.message),
    });
  };

  /**
   * Private path: commit to the amount, prove the wrap in-browser, Seal-encrypt
   * the blindings to both wallets, and lock the funds — one signature.
   */
  const onCreatePrivate = async () => {
    if (!account) return;
    const recipient = freelancer.trim();
    setProving(true);
    try {
      setStatus("Generating commitments + proof in your browser…");
      const totalBase = toBaseUnits(amount);
      const rRemaining = randomBlinding();
      const rEarned = randomBlinding();
      const remainingC = await commit(totalBase, rRemaining);
      const earnedC = await commit(0n, rEarned);
      const wrap = await proveWrap(totalBase, rRemaining);

      setStatus("Encrypting stream secrets to both wallets (Seal)…");
      const envelope = await encryptSecrets({
        suiClient: client,
        sealNamespace: originalPackageId,
        sender: account.address,
        freelancer: recipient,
        payload: {
          v: 1,
          coinType: usdcType,
          totalBase: totalBase.toString(),
          milestones: milestones.length,
          freelancer: recipient,
          remainingBase: totalBase.toString(),
          rRemaining: rRemaining.toString(),
          earnedBase: "0",
          rEarned: rEarned.toString(),
        },
      });

      const tx = buildCreateConfidentialStreamV2({
        packageId,
        coinType: usdcType,
        sender: account.address,
        totalBase,
        freelancer: recipient,
        nMilestones: milestones.length,
        remainingCommitment: remainingC,
        wrapProof: wrap.proof,
        earnedCommitment: earnedC,
        disputeWindowMs: DEFAULT_DISPUTE_WINDOW_MS,
        encryptedSecrets: envelope,
      });

      setStatus("Awaiting wallet signature…");
      await execute(tx, {
        onSuccess: async ({ digest }) => {
          setStatus("Confirming on-chain…");
          const streamId = await findCreatedConfidentialStream(client, digest);
          if (streamId) {
            // Local cache so this wallet can act without a Seal round-trip.
            addSecret(account.address, {
              streamId,
              coinType: usdcType,
              totalBase: totalBase.toString(),
              milestones: milestones.length,
              freelancer: recipient,
              remainingBase: totalBase.toString(),
              rRemaining: rRemaining.toString(),
              earnedBase: "0",
              rEarned: rEarned.toString(),
              createdAt: Date.now(),
            });
          }
          setStatus(
            `Private stream created — amount hidden on-chain. The recipient can decrypt via Seal. Digest ${digest}`
          );
        },
        onError: (e) => setStatus(e.message),
      });
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setProving(false);
    }
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
      <div className="flex flex-col gap-8">
        {/* Privacy is a property of the stream, not a separate product. */}
        <div className="flex items-center justify-between border border-[#2b2a5e]/15 bg-white px-4 py-3">
          <div>
            <p className="text-[12px] font-semibold">
              Private amounts {isPrivate && "🔒"}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-[#2b2a5e]/60">
              {isPrivate
                ? "Amounts are hidden on-chain (commitments + ZK proofs). Secrets are Seal-encrypted to you and the recipient."
                : "Amounts visible on-chain. Toggle to hide them with ZK commitments."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isPrivate}
            onClick={() => setIsPrivate((v) => !v)}
            className={`relative h-6 w-11 shrink-0 transition-colors ${
              isPrivate ? "bg-[#5b54e6]" : "bg-[#2b2a5e]/20"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 bg-white transition-transform ${
                isPrivate ? "translate-x-[22px]" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <Field label="Recipient (freelancer address)">
          <input
            value={freelancer}
            onChange={(e) => setFreelancer(e.target.value)}
            placeholder="0x…"
            className="w-full border border-[#2b2a5e]/20 bg-white px-3 py-2.5 font-mono text-[13px] outline-none focus:border-[#5b54e6]"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Total amount (USDC)">
            <input
              type="number"
              value={amount === 0 ? "" : amount}
              min={0}
              placeholder="800"
              onChange={(e) =>
                setAmount(e.target.value === "" ? 0 : Number(e.target.value))
              }
              className="w-full border border-[#2b2a5e]/20 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#5b54e6]"
            />
          </Field>
          {!isPrivate && (
            <Field label="Duration">
              <div className="flex gap-2">
                <input
                  type="number"
                  value={durationValue === 0 ? "" : durationValue}
                  min={0}
                  placeholder="14"
                  onChange={(e) =>
                    setDurationValue(
                      e.target.value === "" ? 0 : Number(e.target.value)
                    )
                  }
                  className="w-full border border-[#2b2a5e]/20 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#5b54e6]"
                />
                <select
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value as DurationUnit)}
                  className="border border-[#2b2a5e]/20 bg-white px-2 text-[13px] outline-none focus:border-[#5b54e6]"
                >
                  <option value="hours">hours</option>
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                </select>
              </div>
            </Field>
          )}
        </div>

        <Field label={`Milestones (${milestones.length})`}>
          <div className="flex flex-col gap-2">
            {milestones.map((m, i) => (
              <div key={i} className="flex gap-2">
                <span className="flex w-8 items-center justify-center bg-[#2b2a5e] text-[12px] text-white">
                  {i + 1}
                </span>
                <input
                  value={m}
                  onChange={(e) => updateMilestone(i, e.target.value)}
                  className="w-full border border-[#2b2a5e]/20 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#5b54e6]"
                />
                <button
                  onClick={() =>
                    setMilestones((arr) => arr.filter((_, j) => j !== i))
                  }
                  className="px-3 text-[#c0533a] hover:opacity-60"
                  aria-label="Remove milestone"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={() => setMilestones((m) => [...m, `Milestone ${m.length + 1}`])}
              className="self-start border border-[#2b2a5e]/20 px-3 py-1.5 text-[12px] hover:border-[#5b54e6]"
            >
              + add milestone
            </button>
          </div>
        </Field>

        {!isPrivate && (
        <Field label={`Split config (${splitSum}%)`}>
          <div className="flex flex-col gap-2">
            {splits.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={r.label}
                  onChange={(e) => updateSplit(i, { label: e.target.value })}
                  className="w-40 border border-[#2b2a5e]/20 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#5b54e6]"
                />
                <input
                  type="number"
                  value={r.pct === 0 ? "" : r.pct}
                  placeholder="0"
                  onChange={(e) =>
                    updateSplit(i, {
                      pct: e.target.value === "" ? 0 : Number(e.target.value),
                    })
                  }
                  className="w-20 border border-[#2b2a5e]/20 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#5b54e6]"
                />
                <span className="text-[12px] text-[#2b2a5e]/50">%</span>
                <label className="flex items-center gap-1 text-[11px] text-[#2b2a5e]/60">
                  <input
                    type="checkbox"
                    checked={r.yield}
                    onChange={(e) => updateSplit(i, { yield: e.target.checked })}
                  />
                  yield
                </label>
                <button
                  onClick={() => setSplits((s) => s.filter((_, j) => j !== i))}
                  className="ml-auto px-2 text-[#c0533a] hover:opacity-60"
                  aria-label="Remove split"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                setSplits((s) => [
                  ...s,
                  { label: "Destination", address: "", pct: 0, yield: false },
                ])
              }
              className="self-start border border-[#2b2a5e]/20 px-3 py-1.5 text-[12px] hover:border-[#5b54e6]"
            >
              + add split
            </button>
          </div>
        </Field>
        )}
      </div>

      <aside className="flex flex-col gap-4 border border-[#2b2a5e]/15 bg-white p-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#2b2a5e]/50">
          PTB preview
        </p>
        <Summary
          label={isPrivate ? "Locks (hidden on-chain)" : "Locks"}
          value={formatUsd(amount)}
        />
        {!isPrivate && (
          <>
            <Summary label="Rate" value={`${formatUsd(rate)} / sec`} />
            <Summary label="Settles every" value={formatInterval(interval)} />
          </>
        )}
        <Summary label="Milestones" value={String(milestones.length)} />
        <Summary
          label="Per milestone"
          value={formatUsd(amount / Math.max(milestones.length, 1))}
        />
        {!isPrivate && (
          <div className="border-t border-[#2b2a5e]/10 pt-3 text-[12px] leading-relaxed text-[#2b2a5e]/70">
            {splits.map((s, i) => (
              <div key={i} className="flex justify-between">
                <span>
                  {s.label} {s.yield && "↗"}
                </span>
                <span className="tabular">{s.pct}%</span>
              </div>
            ))}
          </div>
        )}
        {isPrivate ? (
          <p className="text-[11px] leading-relaxed text-[#5b54e6]">
            Amounts hidden via Poseidon commitments; every transition proven
            with Groth16 in your browser. Secrets are Seal-encrypted to both
            wallets, so the recipient can drip, raise and claim on their own.
            Gas is sponsored — milestone names stay off-chain.
          </p>
        ) : (
          <p className="text-[11px] leading-relaxed text-[#1d9e75]">
            All gasless via Address Balances. {formatInterval(interval)}.
          </p>
        )}

        {errors.length > 0 && (
          <ul className="flex flex-col gap-1 text-[11px] text-[#c0533a]">
            {errors.map((e) => (
              <li key={e}>• {e}</li>
            ))}
          </ul>
        )}

        <CreateStreamButton
          isPrivate={isPrivate}
          amount={amount}
          milestones={milestones.length}
          canCreate={canCreate && !!deployed}
          busy={isPending || proving}
          onClick={onCreate}
        />
        {!deployed && (
          <p className="text-[11px] text-[#2b2a5e]/50">
            Note: Move package not set for this network — set
            NEXT_PUBLIC_PACKAGE_ID to enable on-chain creation.
          </p>
        )}
        {status && (
          <p className="break-words text-[11px] text-[#2b2a5e]/70">{status}</p>
        )}
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] uppercase tracking-[0.16em] text-[#2b2a5e]/60">
        {label}
      </span>
      {children}
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[12px] text-[#2b2a5e]/55">{label}</span>
      <span className="text-[14px] font-semibold tabular">{value}</span>
    </div>
  );
}

function CreateStreamButton({
  isPrivate,
  amount,
  milestones,
  canCreate,
  busy,
  onClick,
}: {
  isPrivate: boolean;
  amount: number;
  milestones: number;
  canCreate: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  const locked = formatUsd(amount);
  const perMilestone = formatUsd(amount / Math.max(milestones, 1));

  const title = busy
    ? isPrivate
      ? "Proving & creating…"
      : "Creating stream…"
    : isPrivate
      ? "Create private stream"
      : "Create stream";

  const subtitle = busy
    ? isPrivate
      ? "Groth16 proof + Seal encryption in your browser"
      : "Awaiting wallet signature"
    : isPrivate
      ? `Lock ${locked} hidden · ${milestones} milestones · Seal-encrypted`
      : `Lock ${locked} · gasless · ${perMilestone} per milestone`;

  const enabled = canCreate && !busy;

  return (
    <div className="mt-4 border-t border-[#2b2a5e]/10 pt-5">
      <button
        type="button"
        onClick={onClick}
        disabled={!canCreate || busy}
        className={[
          "group relative w-full overflow-hidden px-5 py-4 text-left transition-all duration-200",
          enabled
            ? isPrivate
              ? "bg-[#2b2a5e] text-white shadow-[0_8px_24px_rgba(43,42,94,0.28)] hover:-translate-y-px hover:shadow-[0_12px_32px_rgba(43,42,94,0.34)] active:translate-y-0"
              : "bg-[#2b2a5e] text-white shadow-[0_8px_24px_rgba(43,42,94,0.22)] hover:-translate-y-px hover:shadow-[0_12px_32px_rgba(43,42,94,0.3)] active:translate-y-0"
            : "cursor-not-allowed border border-[#2b2a5e]/12 bg-[#f4f3f8] text-[#2b2a5e]/45",
        ].join(" ")}
      >
        {enabled && isPrivate && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#5b54e6]/35 to-transparent"
          />
        )}
        <span className="relative flex items-center gap-3">
          <span
            className={[
              "flex h-9 w-9 shrink-0 items-center justify-center text-[15px]",
              enabled
                ? isPrivate
                  ? "bg-[#5b54e6]/25 ring-1 ring-[#5b54e6]/40"
                  : "bg-white/10 ring-1 ring-white/15"
                : "bg-[#2b2a5e]/06 text-[#2b2a5e]/30",
            ].join(" ")}
          >
            {busy ? "…" : isPrivate ? "🔒" : "→"}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              className={[
                "text-[13px] font-semibold uppercase tracking-[0.08em]",
                enabled ? "text-white" : "",
              ].join(" ")}
            >
              {title}
            </span>
            <span
              className={[
                "truncate text-[11px] leading-snug",
                enabled ? "text-white/75" : "text-[#2b2a5e]/40",
              ].join(" ")}
            >
              {subtitle}
            </span>
          </span>
          {enabled && (
            <span
              aria-hidden
              className="shrink-0 text-[18px] text-white/50 transition-transform group-hover:translate-x-0.5"
            >
              ›
            </span>
          )}
        </span>
      </button>
      {!canCreate && !busy && (
        <p className="mt-2.5 text-center text-[10px] text-[#2b2a5e]/45">
          {isPrivate
            ? "Enter a valid recipient address to continue"
            : "Fix the fields above to continue"}
        </p>
      )}
    </div>
  );
}
