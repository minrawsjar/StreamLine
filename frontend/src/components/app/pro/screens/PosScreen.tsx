"use client";

import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import { usePhoneEmbedded } from "@/components/app/phone/PhoneEmbeddedContext";
import { useProWorkspace } from "../ProWorkspaceContext";
import { fmtUsd } from "../types";
import { ProEyebrow, ProStat } from "../ui";

type PaymentQr = {
  id: string;
  label: string;
  /** Fixed USDC amount; null = open / customer chooses */
  amountUsd: number | null;
  uses: number;
  accumulatedUsd: number;
  active: boolean;
  createdAtMs: number;
};

const SEED_QRS: PaymentQr[] = [
  {
    id: "qr-counter",
    label: "Counter",
    amountUsd: null,
    uses: 48,
    accumulatedUsd: 612.4,
    active: true,
    createdAtMs: Date.now() - 12 * 24 * 60 * 60_000,
  },
  {
    id: "qr-coffee",
    label: "Coffee fixed",
    amountUsd: 4.5,
    uses: 126,
    accumulatedUsd: 567,
    active: true,
    createdAtMs: Date.now() - 40 * 24 * 60 * 60_000,
  },
  {
    id: "qr-event",
    label: "Pop-up Saturday",
    amountUsd: 12,
    uses: 9,
    accumulatedUsd: 108,
    active: false,
    createdAtMs: Date.now() - 5 * 24 * 60 * 60_000,
  },
];

function payUrl(orgSlug: string, qrId: string): string {
  // Preview URL shape — real pay route wires later
  return `https://streamline.app/pay/${orgSlug}/${qrId}`;
}

function orgSlug(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "org"
  );
}

export function PosScreen() {
  const embedded = usePhoneEmbedded();
  const { workspace } = useProWorkspace();
  const slug = orgSlug(workspace.orgName);
  const [qrs, setQrs] = useState<PaymentQr[]>(SEED_QRS);
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftAmount, setDraftAmount] = useState("");
  const [openAmount, setOpenAmount] = useState(true);

  const totals = useMemo(() => {
    const uses = qrs.reduce((a, q) => a + q.uses, 0);
    const accumulated = qrs.reduce((a, q) => a + q.accumulatedUsd, 0);
    const active = qrs.filter((q) => q.active).length;
    return { uses, accumulated, active, count: qrs.length };
  }, [qrs]);

  const selected = qrs.find((q) => q.id === selectedId) ?? null;

  const openCreate = () => {
    setDraftLabel("");
    setDraftAmount("");
    setOpenAmount(true);
    setView("create");
  };

  const createQr = () => {
    const label = draftLabel.trim() || `QR ${qrs.length + 1}`;
    let amountUsd: number | null = null;
    if (!openAmount) {
      const n = Number(draftAmount);
      if (!Number.isFinite(n) || n <= 0) return;
      amountUsd = Math.round(n * 100) / 100;
    }
    const id = `qr-${Date.now()}`;
    const next: PaymentQr = {
      id,
      label,
      amountUsd,
      uses: 0,
      accumulatedUsd: 0,
      active: true,
      createdAtMs: Date.now(),
    };
    setQrs((prev) => [next, ...prev]);
    setSelectedId(id);
    setView("detail");
  };

  const shell = embedded
    ? "flex flex-col gap-2.5 px-0.5 pb-1 pt-0.5"
    : "mx-auto max-w-lg space-y-5";

  if (view === "create") {
    return (
      <div className={shell}>
        {!embedded ? (
          <Header title="New payment QR" />
        ) : null}
        <section
          className={`sl-pro-card sl-pro-card--flush ${
            embedded ? "p-3.5" : "p-5"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[8px] font-medium uppercase tracking-[0.16em] text-white/40">
              Create QR
            </p>
            <button
              type="button"
              onClick={() => setView("list")}
              className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] text-white/45"
            >
              Back
            </button>
          </div>

          <label className="mt-4 block">
            <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-white/35">
              Label
            </span>
            <input
              type="text"
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value.slice(0, 32))}
              placeholder="Counter, Table 3, Merch…"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] text-white placeholder:text-white/25 outline-none focus:border-white/25"
            />
          </label>

          <div className="mt-3.5">
            <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-white/35">
              Amount
            </p>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setOpenAmount(true)}
                className={`rounded-xl px-3 py-2.5 text-[12px] font-semibold transition-colors ${
                  openAmount
                    ? "bg-white text-[#0a0a0a]"
                    : "border border-white/10 bg-white/[0.04] text-white/60"
                }`}
              >
                Open
              </button>
              <button
                type="button"
                onClick={() => setOpenAmount(false)}
                className={`rounded-xl px-3 py-2.5 text-[12px] font-semibold transition-colors ${
                  !openAmount
                    ? "bg-white text-[#0a0a0a]"
                    : "border border-white/10 bg-white/[0.04] text-white/60"
                }`}
              >
                Fixed USDC
              </button>
            </div>
            {!openAmount ? (
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={draftAmount}
                onChange={(e) => setDraftAmount(e.target.value)}
                placeholder="0.00"
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] tabular text-white placeholder:text-white/25 outline-none focus:border-white/25"
              />
            ) : (
              <p className="mt-2 text-[10px] leading-snug text-white/35">
                Customer enters the amount when they scan.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={createQr}
            disabled={!openAmount && !(Number(draftAmount) > 0)}
            className="mt-4 flex w-full items-center justify-center rounded-2xl bg-[#22c55e] px-4 py-3.5 text-[14px] font-semibold text-white shadow-[0_8px_24px_rgba(34,197,94,0.35)] transition-transform enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none"
          >
            Create payment QR
          </button>
        </section>
      </div>
    );
  }

  if (view === "detail" && selected) {
    const url = payUrl(slug, selected.id);
    return (
      <div className={shell}>
        {!embedded ? <Header title={selected.label} /> : null}
        <section
          className={`sl-pro-card sl-pro-card--flush ${
            embedded ? "p-3.5" : "p-5"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[8px] font-medium uppercase tracking-[0.16em] text-white/40">
              Payment QR
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedId(null);
                setView("list");
              }}
              className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] text-white/45"
            >
              Done
            </button>
          </div>

          <p className="mt-3 text-center text-[1.25rem] font-semibold tracking-tight text-white">
            {selected.label}
          </p>
          <p className="mt-1 text-center text-[11px] text-white/40">
            {selected.amountUsd != null
              ? `${fmtUsd(selected.amountUsd)} fixed · USDC`
              : "Open amount · USDC"}
            {selected.active ? "" : " · paused"}
          </p>

          <div className="mx-auto mt-4 flex items-center justify-center rounded-2xl bg-white p-3.5">
            <QRCodeSVG value={url} size={embedded ? 148 : 180} level="M" />
          </div>
          <p className="mt-2.5 break-all text-center text-[9px] leading-snug text-white/30">
            {url}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-1.5">
            <StatTile label="Uses" value={String(selected.uses)} />
            <StatTile
              label="Accumulated"
              value={fmtUsd(selected.accumulatedUsd, selected.accumulatedUsd % 1 ? 2 : 0)}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() =>
                setQrs((prev) =>
                  prev.map((q) =>
                    q.id === selected.id ? { ...q, active: !q.active } : q
                  )
                )
              }
              className="rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-3 text-[12px] font-semibold text-white"
            >
              {selected.active ? "Pause" : "Activate"}
            </button>
            <button
              type="button"
              onClick={() => {
                // Demo: bump use as if someone paid
                setQrs((prev) =>
                  prev.map((q) =>
                    q.id === selected.id
                      ? {
                          ...q,
                          uses: q.uses + 1,
                          accumulatedUsd:
                            q.accumulatedUsd +
                            (q.amountUsd ?? 10),
                        }
                      : q
                  )
                );
              }}
              className="rounded-2xl bg-[#22c55e] px-3 py-3 text-[12px] font-semibold text-white shadow-[0_6px_18px_rgba(34,197,94,0.3)]"
            >
              Simulate scan
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={shell}>
      {!embedded ? (
        <div>
          <ProEyebrow>POS</ProEyebrow>
          <h1 className="mt-2 text-[clamp(26px,3.5vw,36px)] font-semibold tracking-tight text-white">
            Payment QRs
          </h1>
          <p className="mt-1 text-[13px] text-white/45">
            Create reusable USDC QR codes for the counter. Track uses and
            totals — UI preview.
          </p>
        </div>
      ) : null}

      {/* Stats — one block, three cards */}
      <div className={`grid grid-cols-3 ${embedded ? "gap-1.5" : "gap-3"}`}>
        <ProStat label="Codes" value={String(totals.count)} />
        <ProStat label="Uses" value={String(totals.uses)} />
        <ProStat
          label="Taken"
          value={fmtUsd(totals.accumulated, totals.accumulated % 1 ? 2 : 0)}
          accent
        />
      </div>

      <button
        type="button"
        onClick={openCreate}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#22c55e] px-4 py-3.5 text-[14px] font-semibold tracking-tight text-white shadow-[0_8px_24px_rgba(34,197,94,0.35)] transition-transform active:scale-[0.98]"
      >
        <span className="text-[18px] leading-none">+</span>
        Create payment QR
      </button>

      {/* All QRs */}
      <section
        className={`sl-pro-card sl-pro-card--flush ${
          embedded ? "p-3.5" : "p-5"
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="text-[8px] font-medium uppercase tracking-[0.16em] text-white/40">
            All payment QRs
          </p>
          <span className="text-[9px] text-white/35">
            {totals.active} active
          </span>
        </div>

        <div className="mt-2.5 space-y-1.5">
          {qrs.map((qr) => (
            <button
              key={qr.id}
              type="button"
              onClick={() => {
                setSelectedId(qr.id);
                setView("detail");
              }}
              className="flex w-full items-center gap-3 rounded-xl bg-white/[0.04] px-2.5 py-2.5 text-left transition-colors active:bg-white/[0.07]"
            >
              <QrThumb url={payUrl(slug, qr.id)} muted={!qr.active} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-[12px] font-semibold text-white">
                    {qr.label}
                  </p>
                  {!qr.active ? (
                    <span className="shrink-0 rounded-full bg-white/8 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.08em] text-white/40">
                      Paused
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[10px] text-white/40">
                  {qr.amountUsd != null
                    ? `${fmtUsd(qr.amountUsd)} fixed`
                    : "Open amount"}
                  {" · "}
                  {qr.uses} use{qr.uses === 1 ? "" : "s"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[12px] font-semibold tabular text-white">
                  {fmtUsd(qr.accumulatedUsd, qr.accumulatedUsd % 1 ? 2 : 0)}
                </p>
                <p className="mt-0.5 text-[8px] uppercase tracking-[0.1em] text-white/30">
                  total
                </p>
              </div>
            </button>
          ))}
          {qrs.length === 0 ? (
            <p className="px-2 py-6 text-center text-[11px] text-white/35">
              No payment QRs yet.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Header({ title }: { title: string }) {
  return (
    <div>
      <ProEyebrow>POS</ProEyebrow>
      <h1 className="mt-2 text-[clamp(26px,3.5vw,36px)] font-semibold tracking-tight text-white">
        {title}
      </h1>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.04] px-2.5 py-2.5">
      <p className="text-[8px] font-medium uppercase tracking-[0.12em] text-white/35">
        {label}
      </p>
      <p className="mt-1 text-[13px] font-semibold tabular leading-none text-white">
        {value}
      </p>
    </div>
  );
}

function QrThumb({ url, muted }: { url: string; muted?: boolean }) {
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white p-1 ${
        muted ? "opacity-40" : ""
      }`}
    >
      <QRCodeSVG value={url} size={36} level="L" />
    </div>
  );
}
