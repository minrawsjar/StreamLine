"use client";

import type { ReactNode } from "react";

import { usePhoneEmbedded } from "@/components/app/phone/PhoneEmbeddedContext";
import { type ProWorkerStatus, statusLabel } from "./types";

export function ProEyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`text-[10px] font-medium uppercase tracking-[0.2em] text-white/35 ${className}`}
    >
      {children}
    </p>
  );
}

export function ProChip({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={`sl-pro-chip ${className}`}>{children}</span>;
}

export function ProCard({
  children,
  className = "",
  padding = "md",
  flush = false,
}: {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
  flush?: boolean;
}) {
  const pad =
    padding === "sm" ? "p-3.5" : padding === "lg" ? "p-6" : "p-5";
  return (
    <div
      className={`sl-pro-card ${flush ? "sl-pro-card--flush" : ""} ${pad} ${className}`}
    >
      {children}
    </div>
  );
}

export function ProStat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  const embedded = usePhoneEmbedded();
  return (
    <ProCard padding="sm">
      <ProEyebrow className={embedded ? "!tracking-[0.12em]" : ""}>
        {label}
      </ProEyebrow>
      <p
        className={`mt-2 font-semibold tabular tracking-tight ${
          embedded ? "text-[1.05rem] leading-tight" : "mt-2.5 text-[1.45rem]"
        } ${accent ? "text-[#1d9e75]" : "text-white"}`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-[11px] text-white/40">{hint}</p> : null}
    </ProCard>
  );
}

export function StatusPill({
  status,
  compact = false,
}: {
  status: ProWorkerStatus;
  compact?: boolean;
}) {
  const tones: Record<ProWorkerStatus, string> = {
    dripping: "border-[#1d9e75]/35 bg-[#1d9e75]/10 text-[#1d9e75]",
    paused: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    stopped: "border-white/15 bg-white/5 text-white/45",
    pending: "border-white/15 bg-white/5 text-white/55",
  };
  return (
    <span
      className={`inline-flex rounded-full border font-semibold uppercase tracking-wider ${tones[status]} ${
        compact
          ? "px-1.5 py-px text-[7px]"
          : "px-2 py-0.5 text-[9px]"
      }`}
    >
      {statusLabel(status)}
    </span>
  );
}

export function ProModal({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const embedded = usePhoneEmbedded();

  return (
    <div
      className={`${
        embedded ? "absolute" : "fixed"
      } inset-0 z-[80] flex items-end justify-center bg-black/70 p-2 backdrop-blur-sm ${
        embedded ? "" : "sm:items-center sm:p-4"
      }`}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        className={`relative max-h-[92%] w-full overflow-y-auto border border-white/[0.1] bg-[#121212] shadow-2xl ${
          embedded
            ? "rounded-[1.35rem] p-3.5"
            : "rounded-[1.75rem] p-5"
        } ${wide && !embedded ? "max-w-xl" : "max-w-md"}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              className={`font-semibold tracking-tight text-white ${
                embedded ? "text-[14px]" : "text-[17px]"
              }`}
            >
              {title}
            </h2>
            {subtitle && !embedded ? (
              <p className="mt-1 text-[12px] leading-relaxed text-white/45">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/50 hover:text-white"
          >
            Close
          </button>
        </div>
        <div className={embedded ? "mt-3" : "mt-5"}>{children}</div>
      </div>
    </div>
  );
}

export function ProField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/35">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export const proInputClass =
  "w-full rounded-2xl border border-white/12 bg-white/[0.04] px-3 py-2.5 text-[13px] text-white outline-none placeholder:text-white/25 focus:border-white/25";

export const proSelectClass = `${proInputClass} appearance-none`;

export function CompositionBar({
  segments,
}: {
  segments: {
    key: string;
    label: string;
    value: number;
    color: string;
    stripe?: boolean;
  }[];
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  return (
    <div>
      <div className="flex h-3.5 overflow-hidden rounded-full bg-white/[0.04] p-0.5">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className={`relative h-full overflow-hidden rounded-full first:rounded-l-full last:rounded-r-full ${seg.color}`}
            style={{ width: `${(seg.value / total) * 100}%` }}
            title={`${seg.label}: ${seg.value}`}
          >
            {seg.stripe ? (
              <span
                className="pointer-events-none absolute inset-0 sl-pro-stripe-light opacity-70"
                aria-hidden
              />
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-2 text-[11px]">
            <span
              className={`h-2 w-2 rounded-full ${seg.color} ${
                seg.stripe ? "sl-pro-stripe-light" : ""
              }`}
            />
            <span className="text-white/45">{seg.label}</span>
            <span className="tabular text-white/80">
              {((seg.value / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProIconButton({
  onClick,
  label,
  children,
  className = "",
}: {
  onClick?: () => void;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fbbf24] text-[#0a0a0a] shadow-[0_6px_18px_rgba(251,191,36,0.28)] transition-transform hover:brightness-105 active:scale-95 ${className}`}
    >
      {children}
    </button>
  );
}
