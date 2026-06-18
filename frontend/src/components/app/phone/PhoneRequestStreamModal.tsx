"use client";

import { useEffect, useMemo, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { QRCodeSVG } from "qrcode.react";

import { copyToClipboard } from "@/lib/format";
import type { DurationUnit } from "@/lib/stream-math";
import { MIN_DRIP_USDC } from "@/lib/stream-math";
import {
  PhoneDurationField,
  PhoneField,
  PhoneToggleRow,
  phoneInputClass,
  phonePctInputClass,
} from "./PhoneFormParts";
import { BorrowFlow, YieldSplitFlow } from "../FinanceFlowViz";
import { RequestPreviewCard } from "./RequestPreviewCard";
import type { StreamRequestParams } from "@/lib/request-link";

type PhoneRequestStreamModalProps = {
  open: boolean;
  onClose: () => void;
};

type SplitRow = { label: string; pct: number; yield: boolean };
type RequestStep = 1 | 2 | 3;

const DEFAULT_SPLITS: SplitRow[] = [
  { label: "Spending wallet", pct: 70, yield: false },
  { label: "Scallop (yield)", pct: 30, yield: true },
];

const STEP_COPY: Record<RequestStep, { title: string; subtitle: string }> = {
  1: {
    title: "Request a stream",
    subtitle: "Name your stream and set the engagement terms.",
  },
  2: {
    title: "Stream settings",
    subtitle: "Choose privacy and milestone options.",
  },
  3: {
    title: "Payout setup",
    subtitle: "Configure splits and add a note.",
  },
};

export function PhoneRequestStreamModal({
  open,
  onClose,
}: PhoneRequestStreamModalProps) {
  const account = useCurrentAccount();
  const [step, setStep] = useState<RequestStep>(1);
  const [streamName, setStreamName] = useState("");
  const [amount, setAmount] = useState("800");
  const [durationValue, setDurationValue] = useState("14");
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("days");
  const [isPrivate, setIsPrivate] = useState(false);
  const [useMilestones, setUseMilestones] = useState(false);
  const [useSplitConfig, setUseSplitConfig] = useState(false);
  const [splits, setSplits] = useState<SplitRow[]>(DEFAULT_SPLITS);
  const [milestones, setMilestones] = useState<string[]>([
    "Wireframes",
    "Mockups",
    "Revisions",
    "Final",
  ]);
  const [note, setNote] = useState("");
  const [created, setCreated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const recipient = account?.address ?? "";

  useEffect(() => {
    if (open) {
      setStep(1);
      setCreated(false);
      setStepError(null);
    }
  }, [open]);

  const shareLink = useMemo(() => {
    if (!recipient) return "";
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://streamline.app";
    const params = new URLSearchParams({
      recipient,
      amount: amount || "0",
      duration_value: durationValue || "0",
      duration_unit: durationUnit,
      milestones: useMilestones && milestones.length > 0 ? milestones.join("|") : "0",
    });
    if (streamName.trim()) params.set("stream_name", streamName.trim());
    params.set("private", isPrivate ? "1" : "0");
    params.set("milestones_count", useMilestones ? String(milestones.length) : "0");
    if (useMilestones && milestones.length > 0) {
      params.set("milestones", milestones.join("|"));
    }
    if (note.trim()) params.set("note", note.trim());
    const splitsOn = useSplitConfig && !isPrivate;
    params.set("use_splits", splitsOn ? "1" : "0");
    if (splitsOn) {
      params.set(
        "splits",
        splits
          .map((s) => `${encodeURIComponent(s.label)}:${s.pct}:${s.yield ? 1 : 0}`)
          .join("|")
      );
    }
    return `${origin}/app?${params.toString()}`;
  }, [recipient, streamName, amount, durationValue, durationUnit, milestones, note, isPrivate, useMilestones, useSplitConfig, splits]);

  const splitSum = splits.reduce((s, r) => s + (Number(r.pct) || 0), 0);
  const dripUsd = MIN_DRIP_USDC;

  const updateSplit = (i: number, patch: Partial<SplitRow>) =>
    setSplits((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const validateStep = (current: RequestStep): string | null => {
    if (current === 1) {
      if (!(Number(amount) > 0)) return "Enter a valid amount.";
      if (!(Number(durationValue) > 0)) return "Enter a valid duration.";
    }
    if (current === 3 && useSplitConfig && !isPrivate && splitSum !== 100) {
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
    if (step < 3) setStep((s) => (s + 1) as RequestStep);
  };

  const goBack = () => {
    setStepError(null);
    if (step > 1) setStep((s) => (s - 1) as RequestStep);
  };

  const onCreateRequest = () => {
    const err = validateStep(3);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    setCreated(true);
  };

  const onCopy = async () => {
    if (!shareLink) return;
    const ok = await copyToClipboard(shareLink);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const onDone = () => {
    setCreated(false);
    setStep(1);
    onClose();
  };

  const previewRequest: StreamRequestParams = {
    streamName,
    recipient,
    amount,
    durationValue,
    durationUnit,
    isPrivate,
    useMilestones,
    milestones,
    useSplitConfig,
    splits,
    note: note.trim() || undefined,
  };

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-white">
      {!created ? (
        <div className="sl-scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <div className="flex flex-col gap-4">
            <div>
              <StepIndicator step={step} />
              <h2 className="mt-3 text-[15px] font-semibold tracking-tight text-[#111]">
                {STEP_COPY[step].title}
              </h2>
              <p className="mt-1 text-[12px] leading-snug text-[#666]">
                {STEP_COPY[step].subtitle}
              </p>
            </div>

            {step === 1 && (
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

                <PhoneDurationField
                  value={durationValue}
                  unit={durationUnit}
                  onValueChange={setDurationValue}
                  onUnitChange={setDurationUnit}
                />
              </>
            )}

            {step === 2 && (
              <>
                <PhoneToggleRow
                  title="Private request"
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
                      <div key={i} className="flex gap-2">
                        <span className="flex w-7 items-center justify-center rounded-lg bg-[#2b2a5e] text-[10px] text-white">
                          {i + 1}
                        </span>
                        <input
                          value={m}
                          onChange={(e) =>
                            setMilestones((prev) =>
                              prev.map((item, idx) => (idx === i ? e.target.value : item))
                            )
                          }
                          className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-[12px] outline-none focus:border-[#5b54e6]"
                        />
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
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setMilestones((prev) => [...prev, `Milestone ${prev.length + 1}`])
                      }
                      className="self-start rounded-lg border border-black/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#444]"
                    >
                      + add milestone
                    </button>
                  </div>
                </PhoneToggleRow>
              </>
            )}

            {step === 3 && (
              <>
                <PhoneToggleRow
                  title="Split config"
                  subtitle={
                    isPrivate ? "Not available for private" : `Route each drip (${splitSum}%)`
                  }
                  checked={useSplitConfig}
                  disabled={isPrivate}
                  onChange={setUseSplitConfig}
                >
                  <div className="flex flex-col gap-2">
                    {splits.map((row, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2">
                        <input
                          value={row.label}
                          onChange={(e) => updateSplit(i, { label: e.target.value })}
                          className="min-w-0 flex-1 rounded-xl border border-black/15 bg-white px-3 py-2 text-[11px] outline-none focus:border-[#5b54e6]"
                        />
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
                          className={phonePctInputClass}
                        />
                        <span className="text-[10px] text-[#777]">%</span>
                        <label className="flex items-center gap-1 text-[10px] text-[#666]">
                          <input
                            type="checkbox"
                            checked={row.yield}
                            onChange={(e) => updateSplit(i, { yield: e.target.checked })}
                          />
                          yield
                        </label>
                        <button
                          type="button"
                          onClick={() => setSplits((s) => s.filter((_, j) => j !== i))}
                          className="px-1 text-[#c0533a]"
                          aria-label="Remove split"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setSplits((s) => [
                          ...s,
                          { label: "Destination", pct: 0, yield: false },
                        ])
                      }
                      className="self-start rounded-lg border border-black/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#444]"
                    >
                      + add split
                    </button>
                  </div>
                </PhoneToggleRow>

                {useSplitConfig && !isPrivate && (
                  <YieldSplitFlow
                    compact
                    legs={splits.map((s) => ({
                      label: s.label,
                      pct: s.pct,
                      yield: s.yield,
                    }))}
                    dripUsd={dripUsd}
                  />
                )}

                <BorrowFlow compact />

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

            {stepError && <p className="text-[11px] text-[#c0533a]">{stepError}</p>}

            <div className="mt-6 flex flex-col gap-2">
              {step < 3 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="w-full rounded-2xl bg-[#111] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onCreateRequest}
                  disabled={!recipient}
                  className="w-full rounded-2xl bg-[#111] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white disabled:opacity-40"
                >
                  Create request link
                </button>
              )}
              {step > 1 ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="w-full rounded-2xl border border-black/12 bg-white px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#111]"
                >
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-2xl border border-black/12 bg-white px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#111]"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="sl-scrollbar-hidden flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-[#111]">
              Share your request
            </h2>
            <p className="mt-1 text-[12px] leading-snug text-[#666]">
              Send the QR or link — they open it to fund your stream.
            </p>
          </div>

          <div className="flex flex-1 flex-col items-center gap-4 py-4">
            <div className="rounded-2xl border border-black/10 bg-white p-3 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
              <QRCodeSVG value={shareLink || "https://streamline.app/app"} size={132} />
            </div>

            <RequestPreviewCard request={previewRequest} />
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={onCopy}
              className="w-full rounded-2xl bg-[#111] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white"
            >
              {copied ? "Copied ✓" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={onDone}
              className="w-full rounded-2xl border border-black/12 bg-white px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#111]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepIndicator({ step }: { step: RequestStep }) {
  return (
    <div className="flex items-center gap-2">
      {([1, 2, 3] as const).map((n) => (
        <div key={n} className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${
              n === step
                ? "bg-[#111] text-white"
                : n < step
                  ? "bg-[#111]/15 text-[#111]"
                  : "bg-black/6 text-[#999]"
            }`}
          >
            {n}
          </span>
          {n < 3 && (
            <span
              className={`h-px w-6 ${n < step ? "bg-[#111]/30" : "bg-black/10"}`}
              aria-hidden
            />
          )}
        </div>
      ))}
    </div>
  );
}
