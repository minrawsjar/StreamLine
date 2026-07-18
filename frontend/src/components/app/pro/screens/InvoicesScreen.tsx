"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useCurrentAccount } from "@mysten/dapp-kit";

import { usePhoneEmbedded } from "@/components/app/phone/PhoneEmbeddedContext";
import { copyToClipboard, shortAddress } from "@/lib/format";
import {
  DEMO_INVOICE_KEY,
  buildInvoiceShareUrl,
  effectiveStatus,
  loadInvoices,
  nextInvoiceNumber,
  saveInvoices,
  type ProInvoice,
} from "@/lib/pro-invoices";
import { useProWorkspace } from "../ProWorkspaceContext";
import { fmtUsd } from "../types";
import { ProEyebrow, ProStat } from "../ui";

function newInvoiceIdLocal(): string {
  return `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

type View = "list" | "create" | "detail";

export function InvoicesScreen() {
  const embedded = usePhoneEmbedded();
  const account = useCurrentAccount();
  const { workspace, isDemo, nowMs } = useProWorkspace();
  // Logged-in wallet only — never fall back to the demo bucket while connected.
  const ownerKey = account?.address ?? (isDemo ? DEMO_INVOICE_KEY : "");
  const payee =
    account?.address ??
    (isDemo
      ? "0x0000000000000000000000000000000000000000000000000000000000d00001"
      : null);
  const canCreate = !!payee;

  const [invoices, setInvoices] = useState<ProInvoice[]>([]);
  const [view, setView] = useState<View>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [dueDays, setDueDays] = useState("14");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!ownerKey) {
      setInvoices([]);
      return;
    }
    setInvoices(loadInvoices(ownerKey));
  }, [ownerKey]);

  const persist = (next: ProInvoice[]) => {
    setInvoices(next);
    if (ownerKey) saveInvoices(ownerKey, next);
  };

  const selected = invoices.find((i) => i.id === selectedId) ?? null;

  const totals = useMemo(() => {
    const open = invoices.filter((i) => effectiveStatus(i, nowMs) !== "paid" && i.status !== "void");
    const outstanding = open.reduce((s, i) => s + i.amountUsd, 0);
    const paid = invoices
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + i.amountUsd, 0);
    return { count: invoices.length, outstanding, paid };
  }, [invoices, nowMs]);

  const shell = embedded
    ? "flex flex-col gap-2.5 px-0.5 pb-1 pt-0.5"
    : "mx-auto max-w-lg space-y-5";

  const create = () => {
    if (!payee) return;
    const n = Number(amount);
    if (!(n > 0) || !customer.trim()) return;
    const days = Number(dueDays);
    const inv: ProInvoice = {
      id: newInvoiceIdLocal(),
      number: nextInvoiceNumber(invoices),
      customer: customer.trim(),
      amountUsd: Math.round(n * 100) / 100,
      payeeAddress: payee,
      note: note.trim(),
      dueAtMs:
        Number.isFinite(days) && days > 0
          ? Date.now() + days * 86400000
          : null,
      status: "open",
      createdAtMs: Date.now(),
    };
    persist([inv, ...invoices]);
    setCustomer("");
    setAmount("");
    setNote("");
    setDueDays("14");
    setSelectedId(inv.id);
    setView("detail");
  };

  const markPaid = (id: string, digest?: string) => {
    persist(
      invoices.map((i) =>
        i.id === id
          ? {
              ...i,
              status: "paid" as const,
              paidAtMs: Date.now(),
              paidDigest: digest ?? i.paidDigest ?? `0xlocal${Date.now().toString(16)}`,
            }
          : i
      )
    );
  };

  const voidInv = (id: string) => {
    persist(
      invoices.map((i) =>
        i.id === id ? { ...i, status: "void" as const } : i
      )
    );
  };

  if (view === "create") {
    return (
      <div className={shell}>
        {!embedded ? <Header title="New invoice" /> : null}
        <section
          className={`sl-pro-card sl-pro-card--flush ${
            embedded ? "p-3.5" : "p-5"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[8px] font-medium uppercase tracking-[0.16em] text-white/40">
              Create invoice
            </p>
            <button
              type="button"
              onClick={() => setView("list")}
              className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] text-white/45"
            >
              Back
            </button>
          </div>

          <Field label="Customer">
            <input
              value={customer}
              onChange={(e) => setCustomer(e.target.value.slice(0, 48))}
              placeholder="Acme Studio"
              className={inputClass}
            />
          </Field>
          <Field label="Amount (USDC)">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </Field>
          <Field label="Due in (days)">
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={dueDays}
              onChange={(e) => setDueDays(e.target.value)}
              placeholder="14"
              className={inputClass}
            />
          </Field>
          <Field label="Note">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 80))}
              placeholder="Optional"
              className={inputClass}
            />
          </Field>

          <button
            type="button"
            disabled={!canCreate || !(Number(amount) > 0) || !customer.trim()}
            onClick={create}
            className="mt-4 flex w-full items-center justify-center rounded-2xl bg-[#22c55e] px-4 py-3.5 text-[14px] font-semibold text-white shadow-[0_8px_24px_rgba(34,197,94,0.35)] transition-transform enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none"
          >
            {canCreate ? "Create & share" : "Connect wallet to create"}
          </button>
          {canCreate ? (
            <p className="mt-2 text-center text-[9px] text-white/35">
              Pays to {shortAddress(payee, 6, 4)} · customer settles USDC on-chain
            </p>
          ) : null}
        </section>
      </div>
    );
  }

  if (view === "detail" && selected) {
    const url = buildInvoiceShareUrl(selected, workspace.orgName || "Org");
    const status = effectiveStatus(selected, nowMs);
    return (
      <div className={shell}>
        {!embedded ? <Header title={selected.number} /> : null}
        <section
          className={`sl-pro-card sl-pro-card--flush ${
            embedded ? "p-3.5" : "p-5"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[8px] font-medium uppercase tracking-[0.16em] text-white/40">
              Invoice
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

          <p className="mt-3 text-center text-[1.15rem] font-semibold tracking-tight text-white">
            {selected.customer}
          </p>
          <p className="mt-1 text-center text-[2rem] font-semibold tabular leading-none text-white">
            {fmtUsd(selected.amountUsd)}
          </p>
          <p className="mt-2 text-center text-[11px] text-white/40">
            {selected.number}
            {selected.dueAtMs
              ? ` · due ${new Date(selected.dueAtMs).toLocaleDateString()}`
              : ""}
            {selected.note ? ` · ${selected.note}` : ""}
          </p>
          <div className="mt-2 flex justify-center">
            <StatusPill status={status} />
          </div>

          <div className="mx-auto mt-4 flex items-center justify-center rounded-2xl bg-white p-3.5">
            <QRCodeSVG value={url} size={embedded ? 148 : 180} level="M" />
          </div>
          <p className="mt-2.5 break-all text-center text-[9px] leading-snug text-white/30">
            {url}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={async () => {
                if (await copyToClipboard(url)) {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                }
              }}
              className="rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-3 text-[12px] font-semibold text-white"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            {selected.status === "open" ? (
              <button
                type="button"
                onClick={() => markPaid(selected.id)}
                className="rounded-2xl bg-[#22c55e] px-3 py-3 text-[12px] font-semibold text-white"
              >
                Mark paid
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="rounded-2xl border border-white/10 px-3 py-3 text-[12px] font-semibold text-white/35"
              >
                {selected.status === "paid" ? "Paid" : "Void"}
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-[9px] text-white/35">
            Customer opens the link and transfers USDC on-chain. Mark paid after
            you see the transfer (manual for now).
          </p>
          {selected.status === "open" ? (
            <button
              type="button"
              onClick={() => voidInv(selected.id)}
              className="mt-1.5 w-full rounded-2xl px-3 py-2.5 text-[11px] font-medium text-white/40"
            >
              Void invoice
            </button>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <div className={shell}>
      {!embedded ? (
        <div>
          <ProEyebrow>Tools</ProEyebrow>
          <h1 className="mt-2 text-[clamp(26px,3.5vw,36px)] font-semibold tracking-tight text-white">
            Invoices
          </h1>
          <p className="mt-1 text-[13px] text-white/45">
            Create USDC invoices, share a QR or link, mark paid when settled.
          </p>
        </div>
      ) : null}

      {/* Stats — one block, three cards */}
      <div className={`grid grid-cols-3 ${embedded ? "gap-1.5" : "gap-3"}`}>
        <ProStat label="Bills" value={String(totals.count)} />
        <ProStat
          label="Open"
          value={fmtUsd(totals.outstanding, totals.outstanding % 1 ? 2 : 0)}
        />
        <ProStat
          label="Paid"
          value={fmtUsd(totals.paid, totals.paid % 1 ? 2 : 0)}
          accent
        />
      </div>

      <div>
        <button
          type="button"
          onClick={() => setView("create")}
          disabled={!canCreate && !isDemo}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#22c55e] px-4 py-3.5 text-[14px] font-semibold tracking-tight text-white shadow-[0_8px_24px_rgba(34,197,94,0.35)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none"
        >
          <span className="text-[18px] leading-none">+</span>
          {canCreate || isDemo ? "New invoice" : "Connect to create"}
        </button>
        <p className="mt-2 text-center text-[9px] leading-snug text-white/35">
          {isDemo
            ? "Explore-demo sample bills. Sign in for invoices paid to your wallet."
            : "Creating a bill is local. Paying the share link sends real USDC to you."}
        </p>
      </div>

      {/* All invoices */}
      <section
        className={`sl-pro-card sl-pro-card--flush ${
          embedded ? "p-3.5" : "p-5"
        }`}
      >
        <p className="text-[8px] font-medium uppercase tracking-[0.16em] text-white/40">
          All invoices
        </p>
        <div className="mt-2.5 space-y-1.5">
          {invoices.map((inv) => {
            const status = effectiveStatus(inv, nowMs);
            return (
              <button
                key={inv.id}
                type="button"
                onClick={() => {
                  setSelectedId(inv.id);
                  setView("detail");
                }}
                className="flex w-full items-center gap-3 rounded-xl bg-white/[0.04] px-2.5 py-2.5 text-left transition-colors active:bg-white/[0.07]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[12px] font-semibold text-white">
                      {inv.customer}
                    </p>
                    <StatusPill status={status} />
                  </div>
                  <p className="mt-0.5 text-[10px] text-white/40">
                    {inv.number}
                    {inv.dueAtMs
                      ? ` · due ${new Date(inv.dueAtMs).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
                <p className="shrink-0 text-[12px] font-semibold tabular text-white">
                  {fmtUsd(inv.amountUsd)}
                </p>
              </button>
            );
          })}
          {invoices.length === 0 ? (
            <p className="px-2 py-6 text-center text-[11px] text-white/35">
              No invoices yet.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

const inputClass =
  "mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] text-white placeholder:text-white/25 outline-none focus:border-white/25";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-3 block">
      <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-white/35">
        {label}
      </span>
      {children}
    </label>
  );
}

function Header({ title }: { title: string }) {
  return (
    <div>
      <ProEyebrow>Invoices</ProEyebrow>
      <h1 className="mt-2 text-[clamp(26px,3.5vw,36px)] font-semibold tracking-tight text-white">
        {title}
      </h1>
    </div>
  );
}

function StatusPill({
  status,
}: {
  status: ReturnType<typeof effectiveStatus>;
}) {
  const label =
    status === "paid"
      ? "Paid"
      : status === "void"
        ? "Void"
        : status === "overdue"
          ? "Overdue"
          : "Open";
  const cls =
    status === "paid"
      ? "bg-[#1d9e75]/20 text-[#1d9e75]"
      : status === "overdue"
        ? "bg-amber-400/15 text-amber-200/90"
        : status === "void"
          ? "bg-white/8 text-white/40"
          : "bg-white/10 text-white/70";
  return (
    <span
      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.08em] ${cls}`}
    >
      {label}
    </span>
  );
}
