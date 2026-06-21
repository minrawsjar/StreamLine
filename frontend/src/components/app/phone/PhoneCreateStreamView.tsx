"use client";

import { useEffect, useState } from "react";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";

import { useNetworkVariable } from "@/lib/networks";
import { useGaslessExecute } from "@/lib/use-gasless";
import { queueStreamLabel, rememberStreamLabel } from "@/lib/stream-labels";
import {
  durationToMs,
  formatUsd,
  toBaseUnits,
  type DurationUnit,
} from "@/lib/stream-math";
import {
  buildCreateStreamV2,
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
import {
  PhoneDurationField,
  PhoneField,
  PhoneToggleRow,
  phoneInputClass,
} from "./PhoneFormParts";
import { PhoneContactPicker } from "./PhoneContactPicker";
import { btnPrimary, btnSecondary, PhoneFlowShell } from "./PhoneFlowShell";

type PhoneCreateStreamViewProps = {
  onClose: () => void;
};

type SplitRow = { label: string; pct: number; yield: boolean };
type CreateStep = 1 | 2 | 3 | 4;

const DEFAULT_SPLITS: SplitRow[] = [
  { label: "Spending wallet", pct: 70, yield: false },
  { label: "Scallop (yield)", pct: 30, yield: true },
];

const STEP_TITLES: Record<CreateStep, string> = {
  1: "Recipient",
  2: "Stream details",
  3: "Stream settings",
  4: "Payout setup",
};

const ADDRESS_RE = /^0x[0-9a-fA-F]{64}$/;

export function PhoneCreateStreamView({ onClose }: PhoneCreateStreamViewProps) {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const packageId = useNetworkVariable("packageId");
  const usdcType = useNetworkVariable("usdcType");
  const originalPackageId = useNetworkVariable("originalPackageId");
  const { execute, isPending } = useGaslessExecute();

  const [step, setStep] = useState<CreateStep>(1);
  const [freelancer, setFreelancer] = useState("");
  const [streamName, setStreamName] = useState("");
  const [amount, setAmount] = useState("800");
  const [durationValue, setDurationValue] = useState("14");
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("days");
  const [isPrivate, setIsPrivate] = useState(false);
  const [useMilestones, setUseMilestones] = useState(false);
  const [useSplitConfig, setUseSplitConfig] = useState(false);
  const [milestones, setMilestones] = useState<string[]>([
    "request start",
    "Milestone 2",
    "Milestone 3",
  ]);
  const [splits, setSplits] = useState<SplitRow[]>(DEFAULT_SPLITS);
  const [stepError, setStepError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [proving, setProving] = useState(false);
  const [created, setCreated] = useState(false);

  const deployed = packageId && packageId !== "0x0";
  const busy = isPending || proving;
  const effectiveMilestones = useMilestones
    ? ["request start", ...milestones.slice(1)]
    : ["request start"];
  const splitSum = splits.reduce((s, r) => s + (Number(r.pct) || 0), 0);
  const activeSplits = useSplitConfig && !isPrivate ? splits : DEFAULT_SPLITS;

  useEffect(() => {
    setStep(1);
    setCreated(false);
    setStepError(null);
    setStatus(null);
  }, []);

  const updateSplit = (i: number, patch: Partial<SplitRow>) =>
    setSplits((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const validateStep = (current: CreateStep): string | null => {
    if (current === 1) {
      if (!ADDRESS_RE.test(freelancer.trim())) {
        return "Pick a contact or enter a full Sui address (0x + 64 hex).";
      }
      if (freelancer.trim() === account?.address) {
        return "Recipient must be different from your wallet.";
      }
    }
    if (current === 2) {
      if (!(Number(amount) > 0)) return "Enter a valid amount.";
      if (!isPrivate && !(Number(durationValue) > 0)) {
        return "Enter a valid duration.";
      }
    }
    if (current === 4 && useSplitConfig && !isPrivate && splitSum !== 100) {
      return `Splits must total 100% (currently ${splitSum}%).`;
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    if (step < 4) setStep((s) => (s + 1) as CreateStep);
  };

  const goBack = () => {
    setStepError(null);
    if (step > 1) setStep((s) => (s - 1) as CreateStep);
  };

  const onCreatePrivate = async () => {
    if (!account) return;
    const recipient = freelancer.trim();
    setProving(true);
    try {
      setStatus("Generating commitments + proof in your browser…");
      const totalBase = toBaseUnits(Number(amount));
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
          milestones: effectiveMilestones.length,
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
        nMilestones: effectiveMilestones.length,
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
            rememberStreamLabel(streamId, streamName);
            addSecret(account.address, {
              streamId,
              coinType: usdcType,
              totalBase: totalBase.toString(),
              milestones: effectiveMilestones.length,
              freelancer: recipient,
              remainingBase: totalBase.toString(),
              rRemaining: rRemaining.toString(),
              earnedBase: "0",
              rEarned: rEarned.toString(),
              createdAt: Date.now(),
            });
          }
          setCreated(true);
          setStatus(`Private stream created — locked ${formatUsd(Number(amount))}.`);
        },
        onError: (e) => setStatus(e.message),
      });
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setProving(false);
    }
  };

  const onCreate = () => {
    const err = validateStep(4);
    if (err) {
      setStepError(err);
      return;
    }
    if (!account) return;
    if (!deployed) {
      setStatus("Move package not deployed on this network yet.");
      return;
    }
    if (isPrivate) {
      void onCreatePrivate();
      return;
    }

    const totalBase = toBaseUnits(Number(amount));
    const yieldBps = Math.round(
      activeSplits
        .filter((s) => s.yield)
        .reduce((a, s) => a + (Number(s.pct) || 0), 0) * 100
    );
    const tx = buildCreateStreamV2({
      packageId,
      usdcType,
      sender: account.address,
      freelancer: freelancer.trim(),
      milestoneNames: effectiveMilestones,
      milestoneAmountsBase: splitMilestoneAmounts(totalBase, effectiveMilestones.length),
      totalBase,
      durationMs: durationToMs(Number(durationValue), durationUnit),
      yieldBps,
    });
    setStatus("Awaiting wallet signature…");
    execute(tx, {
      onSuccess: (r) => {
        queueStreamLabel(streamName, freelancer.trim(), Number(totalBase));
        setCreated(true);
        setStatus(`Stream created — locked ${formatUsd(Number(amount))}. Digest ${r.digest.slice(0, 10)}…`);
      },
      onError: (e) => setStatus(e.message),
    });
  };

  const onDone = () => {
    setCreated(false);
    onClose();
  };

  if (created) {
    return (
      <PhoneFlowShell
        step={4}
        totalSteps={4}
        title="Stream created"
        footer={
          <button type="button" onClick={onDone} className={btnPrimary}>
            Done
          </button>
        }
      >
        <p className="text-center text-[12px] leading-snug text-[#666]">
          {status ?? "Your stream is locked on-chain. Approve request start when the recipient submits it."}
        </p>
      </PhoneFlowShell>
    );
  }

  return (
    <PhoneFlowShell
      step={step}
      totalSteps={4}
      title={STEP_TITLES[step]}
      footer={
        <>
          {step < 4 ? (
            <button type="button" onClick={goNext} className={btnPrimary}>
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={onCreate}
              disabled={!account || !deployed || busy}
              className={btnPrimary}
            >
              {busy ? "Creating…" : "Create stream"}
            </button>
          )}
          {step > 1 ? (
            <button type="button" onClick={goBack} className={btnSecondary}>
              Back
            </button>
          ) : (
            <button type="button" onClick={onClose} className={btnSecondary}>
              Cancel
            </button>
          )}
        </>
      }
    >
      {step === 1 && (
        <>
          <PhoneField label="Recipient address">
            <input
              value={freelancer}
              onChange={(e) => setFreelancer(e.target.value)}
              placeholder="0x…"
              className={`${phoneInputClass} font-mono text-[11px]`}
            />
          </PhoneField>
          <PhoneContactPicker
            selected={freelancer}
            onSelect={(address) => {
              setFreelancer(address);
              setStepError(null);
            }}
          />
        </>
      )}

      {step === 2 && (
        <>
          <PhoneField label="Stream name">
            <input
              value={streamName}
              onChange={(e) => setStreamName(e.target.value)}
              placeholder="Design sprint"
              className={phoneInputClass}
            />
          </PhoneField>

          <PhoneField label="Amount (USDC)">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={phoneInputClass}
            />
          </PhoneField>

          {!isPrivate && (
            <PhoneDurationField
              value={durationValue}
              unit={durationUnit}
              onValueChange={setDurationValue}
              onUnitChange={setDurationUnit}
            />
          )}
        </>
      )}

      {step === 3 && (
        <>
          <PhoneToggleRow
            title="Private stream"
            subtitle="Hide amounts on-chain"
            checked={isPrivate}
            onChange={(v) => {
              setIsPrivate(v);
              if (v) setUseSplitConfig(false);
            }}
          />

          <PhoneToggleRow
            title="Use milestones"
            subtitle="Define payment stages"
            checked={useMilestones}
            onChange={setUseMilestones}
          >
            <div className="flex flex-col gap-2">
              {milestones.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111] text-[10px] font-semibold text-white">
                    {i + 1}
                  </span>
                  {i === 0 ? (
                    <span className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-[12px] text-[#444] backdrop-blur-sm">
                      request start
                    </span>
                  ) : (
                    <input
                      value={m}
                      onChange={(e) =>
                        setMilestones((prev) =>
                          prev.map((item, idx) => (idx === i ? e.target.value : item))
                        )
                      }
                      className="w-full rounded-xl border border-black/15 bg-white/80 px-3 py-2 text-[12px] outline-none backdrop-blur-sm focus:border-[#5b54e6]"
                    />
                  )}
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setMilestones((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="px-2 text-[#c0533a]"
                      aria-label="Remove milestone"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setMilestones((prev) => [...prev, `Milestone ${prev.length + 1}`])
                }
                className="self-start rounded-lg border border-black/15 bg-white/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#444] backdrop-blur-sm"
              >
                + add milestone
              </button>
            </div>
          </PhoneToggleRow>
        </>
      )}

      {step === 4 && (
        <>
          <PhoneToggleRow
            title="Split each drip"
            subtitle={
              isPrivate
                ? "Not available for private streams"
                : splitSum === 100
                  ? "Route each drip to one or more destinations"
                  : `Must total 100% (currently ${splitSum}%)`
            }
            checked={useSplitConfig}
            disabled={isPrivate}
            onChange={setUseSplitConfig}
          >
            <div className="flex flex-col gap-2">
              {splits.map((row, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    value={row.label}
                    onChange={(e) => updateSplit(i, { label: e.target.value })}
                    placeholder="Wallet"
                    className="min-w-0 flex-1 rounded-xl border border-black/15 bg-white/80 px-3 py-2 text-[12px] outline-none backdrop-blur-sm focus:border-[#5b54e6]"
                  />
                  <div className="flex shrink-0 items-center gap-0.5">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={row.pct === 0 ? "" : row.pct}
                      placeholder="0"
                      onChange={(e) =>
                        updateSplit(i, {
                          pct: e.target.value === "" ? 0 : Number(e.target.value),
                        })
                      }
                      className="w-9 rounded-lg border border-black/15 bg-white/80 px-1 py-1.5 text-center text-[10px] tabular outline-none backdrop-blur-sm focus:border-[#5b54e6] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="text-[9px] text-[#888]">%</span>
                  </div>
                  <label
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-black/10 bg-white/60 px-1.5 py-1 text-[9px] text-[#555] backdrop-blur-sm"
                    title="Route this portion to a yield vault instead of your wallet"
                  >
                    <input
                      type="checkbox"
                      checked={row.yield}
                      onChange={(e) => updateSplit(i, { yield: e.target.checked })}
                    />
                    Yield
                  </label>
                  <button
                    type="button"
                    onClick={() => setSplits((s) => s.filter((_, j) => j !== i))}
                    className="shrink-0 px-1 text-[#c0533a]"
                    aria-label="Remove split"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setSplits((s) => [...s, { label: "Destination", pct: 0, yield: false }])
                }
                className="self-start rounded-lg border border-black/15 bg-white/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#444] backdrop-blur-sm"
              >
                + add destination
              </button>
            </div>
          </PhoneToggleRow>

          {!deployed && (
            <p className="text-center text-[11px] text-[#888]">
              Move package not set for this network.
            </p>
          )}
          {status && !created && (
            <p className="text-center text-[11px] leading-snug text-[#666]">{status}</p>
          )}
        </>
      )}

      {stepError && <p className="text-center text-[11px] text-[#c0533a]">{stepError}</p>}
    </PhoneFlowShell>
  );
}
