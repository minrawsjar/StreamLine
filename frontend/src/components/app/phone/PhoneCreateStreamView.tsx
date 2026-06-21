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
  DEFAULT_STREAM_YIELD_BPS,
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

type CreateStep = 1 | 2 | 3;

const STEP_TITLES: Record<CreateStep, string> = {
  1: "Recipient",
  2: "Stream details",
  3: "Stream settings",
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
  const [note, setNote] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [useMilestones, setUseMilestones] = useState(false);
  const [milestones, setMilestones] = useState<string[]>([
    "request start",
    "Milestone 2",
    "Milestone 3",
  ]);
  const [stepError, setStepError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [proving, setProving] = useState(false);
  const [created, setCreated] = useState(false);

  const deployed = packageId && packageId !== "0x0";
  const busy = isPending || proving;
  const effectiveMilestones = useMilestones
    ? ["request start", ...milestones.slice(1)]
    : ["request start"];

  useEffect(() => {
    setStep(1);
    setCreated(false);
    setStepError(null);
    setStatus(null);
  }, []);

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
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    if (step < 3) setStep((s) => (s + 1) as CreateStep);
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
    const err = validateStep(3);
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
    const tx = buildCreateStreamV2({
      packageId,
      usdcType,
      sender: account.address,
      freelancer: freelancer.trim(),
      milestoneNames: effectiveMilestones,
      milestoneAmountsBase: splitMilestoneAmounts(totalBase, effectiveMilestones.length),
      totalBase,
      durationMs: durationToMs(Number(durationValue), durationUnit),
      yieldBps: DEFAULT_STREAM_YIELD_BPS,
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
        step={3}
        totalSteps={3}
        title="Stream created"
        footer={
          <button type="button" onClick={onDone} className={btnPrimary}>
            Done
          </button>
        }
      >
        <p className="text-center text-[12px] leading-snug text-[#666]">
          {status ??
            "Funds are locked and earning yield. Approve request start when the recipient submits it."}
        </p>
      </PhoneFlowShell>
    );
  }

  return (
    <PhoneFlowShell
      step={step}
      totalSteps={3}
      title={STEP_TITLES[step]}
      footer={
        <>
          {step < 3 ? (
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

          <PhoneField label="Note (optional)">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Design + implementation"
              className={phoneInputClass}
            />
          </PhoneField>
        </>
      )}

      {step === 3 && (
        <>
          <PhoneToggleRow
            title="Private stream"
            subtitle="Hide amounts on-chain"
            checked={isPrivate}
            onChange={setIsPrivate}
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

          <p className="text-center text-[10px] leading-snug text-[#888]">
            Locked funds earn yield automatically — payments stream from the pool as
            milestones are approved.
          </p>

          {!deployed && (
            <p className="text-center text-[11px] text-[#888]">
              Move package not set for this network.
            </p>
          )}
          {status && (
            <p className="text-center text-[11px] leading-snug text-[#666]">{status}</p>
          )}
        </>
      )}

      {stepError && <p className="text-center text-[11px] text-[#c0533a]">{stepError}</p>}
    </PhoneFlowShell>
  );
}
