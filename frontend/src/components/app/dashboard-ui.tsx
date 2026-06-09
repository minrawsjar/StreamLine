"use client";

import type { ReactNode } from "react";

/**
 * Shared dashboard primitives for the StreamLine client + freelancer consoles.
 * Donezo-style layout (stat cards, analytics bars, progress ring) recolored to
 * the StreamLine bayer-dither palette: indigo ink on warm paper, sharp corners,
 * mono type, and hatched "dither" fills for ghosted / inactive elements.
 */

export const DITHER_HATCH =
  "repeating-linear-gradient(45deg, rgba(43,42,94,0.16) 0, rgba(43,42,94,0.16) 1px, transparent 1px, transparent 4px)";

const DOT_FIELD =
  "radial-gradient(rgba(255,255,255,0.22) 1px, transparent 1px)";

/* ── Header ───────────────────────────────────────────────────────────── */

export function DashboardHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#5b54e6]">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 text-[clamp(28px,4vw,40px)] font-black leading-[0.95] tracking-[-0.03em]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-[13px] text-[#2b2a5e]/60">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

/* ── Stat card ────────────────────────────────────────────────────────── */

export function StatCard({
  label,
  value,
  sub,
  tone = "plain",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "plain" | "flow" | "brand";
}) {
  if (tone === "plain") {
    return (
      <div className="border border-[#2b2a5e]/15 bg-white p-5">
        <div className="flex items-start justify-between">
          <p className="text-[12px] uppercase tracking-[0.12em] text-[#2b2a5e]/55">
            {label}
          </p>
          <Arrow className="text-[#2b2a5e]/40" />
        </div>
        <p className="mt-4 text-[40px] font-black leading-none tabular tracking-[-0.02em]">
          {value}
        </p>
        {sub && <p className="mt-3 text-[11px] text-[#2b2a5e]/45">{sub}</p>}
      </div>
    );
  }

  const bg = tone === "flow" ? "#1d9e75" : "#5b54e6";
  return (
    <div className="relative overflow-hidden p-5 text-white" style={{ background: bg }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: DOT_FIELD, backgroundSize: "7px 7px" }}
      />
      <div className="relative">
        <div className="flex items-start justify-between">
          <p className="text-[12px] uppercase tracking-[0.12em] text-white/80">
            {label}
          </p>
          <Arrow className="text-white/80" />
        </div>
        <p className="mt-4 text-[40px] font-black leading-none tabular tracking-[-0.02em]">
          {value}
        </p>
        {sub && <p className="mt-3 text-[11px] text-white/75">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Generic panel ────────────────────────────────────────────────────── */

export function Card({
  title,
  action,
  children,
  className = "",
  padded = true,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`border border-[#2b2a5e]/15 bg-white ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-[15px] font-bold tracking-[-0.01em]">{title}</h2>
          {action}
        </div>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

/* ── Analytics bar chart ──────────────────────────────────────────────── */

export type BarDatum = { label: string; value: number; active?: boolean };

export function BarChart({
  data,
  height = 180,
}: {
  data: BarDatum[];
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => {
        const h = Math.max(6, (d.value / max) * (height - 28));
        const peak = d.value === max && d.value > 0;
        return (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-2">
            {peak && (
              <span className="bg-[#2b2a5e] px-1.5 py-0.5 text-[9px] font-bold text-white">
                {Math.round((d.value / max) * 100)}%
              </span>
            )}
            <div
              className="w-full"
              style={
                d.active
                  ? { height: h, background: d.value === max ? "#1d9e75" : "#7f77dd" }
                  : { height: h, backgroundImage: DITHER_HATCH }
              }
            />
            <span className="text-[10px] uppercase tracking-[0.08em] text-[#2b2a5e]/45">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Donut / progress ring ────────────────────────────────────────────── */

export function DonutProgress({
  percent,
  caption,
  size = 200,
}: {
  percent: number;
  caption?: string;
  size?: number;
}) {
  const p = Math.max(0, Math.min(100, percent));
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (p / 100) * c * 0.75; // 3/4 arc gauge
  const track = c * 0.75;
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.78} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(135 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#2b2a5e"
            strokeOpacity={0.1}
            strokeWidth={stroke}
            strokeDasharray={`${track} ${c}`}
            strokeLinecap="butt"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#1d9e75"
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${c}`}
            strokeLinecap="butt"
          />
        </g>
        <text
          x="50%"
          y="48%"
          textAnchor="middle"
          className="tabular"
          fontSize={size * 0.18}
          fontWeight={900}
          fill="#2b2a5e"
        >
          {Math.round(p)}%
        </text>
        {caption && (
          <text
            x="50%"
            y="62%"
            textAnchor="middle"
            fontSize={size * 0.055}
            fill="#2b2a5e"
            opacity={0.5}
          >
            {caption}
          </text>
        )}
      </svg>
    </div>
  );
}

/* ── State badge ──────────────────────────────────────────────────────── */

export function StateBadge({ state }: { state: string }) {
  const tone =
    state === "dripping"
      ? "bg-[#1d9e75] text-white"
      : state === "pending_review"
        ? "bg-[#d98a2b] text-white"
        : state === "paused"
          ? "bg-[#c0533a] text-white"
          : state === "done"
            ? "bg-[#7f77dd] text-white"
            : "bg-[#2b2a5e] text-white";
  return (
    <span className={`px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${tone}`}>
      {state.replace("_", " ")}
    </span>
  );
}

/* ── Misc ─────────────────────────────────────────────────────────────── */

export function EmptyPanel({ children }: { children: ReactNode }) {
  return (
    <div className="border border-dashed border-[#2b2a5e]/25 px-8 py-16 text-center text-[13px] text-[#2b2a5e]/60">
      {children}
    </div>
  );
}

function Arrow({ className = "" }: { className?: string }) {
  return (
    <span
      className={`flex h-6 w-6 items-center justify-center border border-current text-[11px] ${className}`}
    >
      ↗
    </span>
  );
}

export function short(a?: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}
