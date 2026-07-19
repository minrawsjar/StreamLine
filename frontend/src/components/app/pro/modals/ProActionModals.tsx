"use client";

import { useMemo, useState } from "react";
import { useSuiClient } from "@mysten/dapp-kit";

import { shortAddress } from "@/lib/format";
import { isHexAddress, suinsBrand } from "@/lib/handle";
import { resolveRecipientOrThrow } from "@/lib/use-resolve-recipient";
import { useProWorkspace } from "../ProWorkspaceContext";
import {
  fmtUsd,
  type ProCadence,
  type ProHireMode,
  type ProPoolBucket,
  type ProWorkerStatus,
} from "../types";
import {
  ProField,
  ProModal,
  proInputClass,
  proSelectClass,
} from "../ui";

/** Valid-looking Sui address for roster rows when resolve fails (pitch/demo). */
function demoRosterAddress(seed: string): string {
  let h = 0xc0ffee;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0;
  }
  let hex = "";
  let x = h;
  for (let i = 0; i < 8; i++) {
    hex += x.toString(16).padStart(8, "0");
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
  }
  return `0x${hex.slice(0, 64)}`;
}

export function ProActionModals() {
  const { modal, setModal } = useProWorkspace();
  if (!modal) return null;
  if (modal === "fund") return <FundModal onClose={() => setModal(null)} />;
  if (modal === "withdraw")
    return <WithdrawModal onClose={() => setModal(null)} />;
  if (modal === "invest")
    return <RebalanceModal onClose={() => setModal(null)} />;
  if (modal === "worker")
    return <WorkerModal onClose={() => setModal(null)} />;
  if (modal === "group") return <GroupModal onClose={() => setModal(null)} />;
  if (typeof modal === "object" && modal.kind === "worker-edit") {
    return (
      <WorkerModal workerId={modal.workerId} onClose={() => setModal(null)} />
    );
  }
  if (typeof modal === "object" && modal.kind === "group-edit") {
    return (
      <GroupModal groupId={modal.groupId} onClose={() => setModal(null)} />
    );
  }
  return null;
}

function FundModal({ onClose }: { onClose: () => void }) {
  const { fundTreasury, totals, workspace, creating } = useProWorkspace();
  const [amount, setAmount] = useState("25000");
  const [err, setErr] = useState<string | null>(null);
  const pending = workspace.workers.filter((w) => w.status === "pending").length;

  return (
    <ProModal
      title="Fund payroll pool"
      subtitle="Lock USDC into the shared run. Pending substreams start dripping after this deposit."
      onClose={onClose}
    >
      <div className="space-y-4">
        <ProField label="Amount (USDC)">
          <input
            data-demo="pro-fund-amount"
            className={proInputClass}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </ProField>
        <input
          type="range"
          data-demo="pro-fund-range"
          min={0}
          max={100_000}
          step={500}
          value={Math.min(100_000, Math.max(0, Math.floor(Number(amount) || 0)))}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full accent-[#22c55e]"
        />
        <p className="text-[12px] text-white/40">
          Coverage floor {fmtUsd(totals.floor)} · {pending} pending substream
          {pending === 1 ? "" : "s"} will activate.
        </p>
        {err && <p className="text-[12px] text-[#e0866a]">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="sl-glass-btn-dark !px-4 !py-2 !text-[11px]" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            data-demo-action="pro-fund-submit"
            className="sl-glass-btn-dark sl-glass-btn-dark-primary !px-4 !py-2 !text-[11px]"
            disabled={creating}
            onClick={async () => {
              const n = Number(amount);
              if (!Number.isFinite(n) || n <= 0) return;
              setErr(null);
              try {
                if (await fundTreasury(n)) onClose();
              } catch (e) {
                setErr(e instanceof Error ? e.message : String(e));
              }
            }}
          >
            {creating ? "Funding…" : "Fund pool"}
          </button>
        </div>
      </div>
    </ProModal>
  );
}

function WithdrawModal({ onClose }: { onClose: () => void }) {
  const { withdrawTreasury, totals, creating } = useProWorkspace();
  const max = Math.max(0, totals.withdrawable);
  const idle = Math.max(0, totals.investable) + totals.floor; // liquid balance
  const [amount, setAmount] = useState(String(Math.floor(max) || 0));
  const [err, setErr] = useState<string | null>(null);
  const willDivest = Number(amount) > idle;

  return (
    <ProModal
      title="Withdraw"
      subtitle="Pull capital above the coverage floor back to the org wallet."
      onClose={onClose}
    >
      <div className="space-y-4">
        <ProField label="Amount (USDC)">
          <input
            className={proInputClass}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </ProField>
        <input
          type="range"
          min={0}
          max={Math.max(1, Math.floor(max))}
          step={1}
          value={Math.min(Math.floor(Number(amount) || 0), Math.floor(max))}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full accent-[#22c55e]"
        />
        <p className="text-[12px] text-white/40">
          Available above floor: {fmtUsd(max)}
          {willDivest && max > 0 && (
            <span className="text-[#1d9e75]/80">
              {" "}
              · redeems the yield vault to cover it
            </span>
          )}
        </p>
        {err && <p className="text-[12px] text-[#e0866a]">{err}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="sl-glass-btn-dark !px-4 !py-2 !text-[11px]" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="sl-glass-btn-dark sl-glass-btn-dark-primary !px-4 !py-2 !text-[11px]"
            disabled={max <= 0 || creating}
            onClick={async () => {
              const n = Number(amount);
              if (!Number.isFinite(n) || n <= 0) return;
              if (n > max) {
                setErr(`Max withdrawable is ${fmtUsd(max)}.`);
                return;
              }
              setErr(null);
              try {
                if (await withdrawTreasury(n)) onClose();
              } catch (e) {
                setErr(e instanceof Error ? e.message : String(e));
              }
            }}
          >
            {creating ? "Withdrawing…" : "Withdraw"}
          </button>
        </div>
      </div>
    </ProModal>
  );
}

function RebalanceModal({ onClose }: { onClose: () => void }) {
  const {
    investTreasury,
    divestTreasury,
    rebalanceReserve,
    rebalance,
    totals,
    workspace,
    creating,
  } = useProWorkspace();
  const [from, setFrom] = useState<ProPoolBucket>("idle");
  const [to, setTo] = useState<ProPoolBucket>("yield_vault");
  const [amount, setAmount] = useState(0);
  const [providersOpen, setProvidersOpen] = useState(true);
  const [provider, setProvider] = useState<string>("native");
  const [err, setErr] = useState<string | null>(null);

  const fromBal = workspace.pool.allocation[from];
  const maxMove = useMemo(() => {
    if (from === "idle") return Math.max(0, totals.investable);
    return Math.max(0, fromBal);
  }, [from, fromBal, totals.investable]);

  const clamped = Math.min(amount, maxMove);

  const buckets: { id: ProPoolBucket; label: string }[] = [
    { id: "idle", label: "Liquid" },
    { id: "yield_vault", label: "Yield" },
    { id: "reserve", label: "Reserve" },
  ];

  const providers = [
    {
      id: "native",
      name: "StreamLine vault",
      detail: "Native adapter · ~3% APR testnet",
      available: true,
    },
    {
      id: "scallop",
      name: "Scallop",
      detail: "Lending · mainnet adapter soon",
      available: false,
    },
    {
      id: "navi",
      name: "Navi",
      detail: "Lending · mainnet adapter soon",
      available: false,
    },
    {
      id: "suilend",
      name: "Suilend",
      detail: "Lending · mainnet adapter soon",
      available: false,
    },
  ] as const;

  return (
    <ProModal
      title="Rebalance"
      subtitle="Move float between liquid, yield, and reserve. Keep the coverage floor liquid for payroll."
      onClose={onClose}
    >
      <div className="space-y-4">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-white/35">
            From
          </p>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            {buckets.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setFrom(b.id);
                  setAmount(0);
                  if (to === b.id) {
                    setTo(b.id === "idle" ? "yield_vault" : "idle");
                  }
                }}
                className={`rounded-xl px-2 py-2.5 text-[11px] font-semibold transition-colors ${
                  from === b.id
                    ? "bg-white text-[#0a0a0a]"
                    : "border border-white/10 bg-white/[0.04] text-white/55"
                }`}
              >
                {b.label}
                <span className="mt-0.5 block text-[9px] font-normal tabular opacity-70">
                  {fmtUsd(workspace.pool.allocation[b.id], 0)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-white/35">
            To
          </p>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            {buckets.map((b) => (
              <button
                key={b.id}
                type="button"
                disabled={b.id === from}
                onClick={() => setTo(b.id)}
                className={`rounded-xl px-2 py-2.5 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-25 ${
                  to === b.id
                    ? "bg-white text-[#0a0a0a]"
                    : "border border-white/10 bg-white/[0.04] text-white/55"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-white/35">
              Amount
            </p>
            <p className="text-[12px] font-semibold tabular text-white">
              {fmtUsd(clamped, clamped % 1 ? 2 : 0)}
            </p>
          </div>
          <input
            type="range"
            data-demo="pro-rebalance-range"
            min={0}
            max={Math.max(1, Math.floor(maxMove))}
            step={1}
            value={Math.floor(clamped)}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="mt-2 w-full accent-[#22c55e]"
          />
          <div className="mt-1 flex justify-between text-[10px] text-white/30">
            <span>0</span>
            <span>Max {fmtUsd(maxMove, 0)}</span>
          </div>
        </div>

        {to === "yield_vault" ? (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
            <button
              type="button"
              onClick={() => setProvidersOpen((o) => !o)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left"
            >
              <span className="text-[11px] font-medium text-white/70">
                Yield providers
              </span>
              <span className="text-[11px] text-white/35">
                {providersOpen ? "▴" : "▾"}
              </span>
            </button>
            {providersOpen ? (
              <div className="space-y-1 border-t border-white/[0.06] px-2 py-2">
                {providers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!p.available}
                    onClick={() => setProvider(p.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors disabled:opacity-40 ${
                      provider === p.id && p.available
                        ? "bg-white/[0.08]"
                        : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        p.available
                          ? provider === p.id
                            ? "bg-[#22c55e]"
                            : "bg-white/25"
                          : "bg-white/15"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-medium text-white">
                        {p.name}
                        {!p.available ? (
                          <span className="ml-1.5 text-[9px] font-normal uppercase tracking-wider text-white/30">
                            Soon
                          </span>
                        ) : null}
                      </span>
                      <span className="block text-[10px] text-white/40">
                        {p.detail}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <p className="text-[11px] text-white/40">
          Floor {fmtUsd(totals.floor)} stays preferred for payroll liquidity.
        </p>

        {err && <p className="text-[12px] text-[#e0866a]">{err}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="sl-glass-btn-dark !px-4 !py-2 !text-[11px]"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            data-demo-action="pro-rebalance-submit"
            className="sl-glass-btn-dark sl-glass-btn-dark-primary !px-4 !py-2 !text-[11px]"
            disabled={creating || clamped <= 0 || from === to}
            onClick={async () => {
              if (clamped <= 0 || from === to) return;
              setErr(null);
              if (
                from === "idle" &&
                to === "yield_vault" &&
                provider === "native"
              ) {
                try {
                  if (await investTreasury(clamped)) onClose();
                } catch (e) {
                  setErr(e instanceof Error ? e.message : String(e));
                }
                return;
              }
              // Yield → Liquid: real on-chain divest (redeems the whole vault
              // position). The amount slider doesn't apply — divest is all-or-nothing.
              if (from === "yield_vault" && to === "idle") {
                try {
                  if (await divestTreasury()) onClose();
                } catch (e) {
                  setErr(e instanceof Error ? e.message : String(e));
                }
                return;
              }
              // Any leg touching Reserve: real on-chain to_reserve/from_reserve
              // (with an invest/divest PTB for the yield legs).
              if (from === "reserve" || to === "reserve") {
                try {
                  if (await rebalanceReserve(from, to, clamped)) onClose();
                } catch (e) {
                  setErr(e instanceof Error ? e.message : String(e));
                }
                return;
              }
              rebalance(from, to, clamped);
              onClose();
            }}
          >
            {creating ? "Confirming…" : "Rebalance"}
          </button>
        </div>
      </div>
    </ProModal>
  );
}

function WorkerModal({
  workerId,
  onClose,
}: {
  workerId?: string;
  onClose: () => void;
}) {
  const { workspace, upsertWorker, deleteWorker } = useProWorkspace();
  const client = useSuiClient();
  const existing = workspace.workers.find((w) => w.id === workerId);
  const [alias, setAlias] = useState(existing?.alias ?? "");
  const [wallet, setWallet] = useState(
    existing?.shieldedAddress || existing?.walletAddress || ""
  );
  const [groupId, setGroupId] = useState(existing?.groupId ?? "");
  const [monthly, setMonthly] = useState(String(existing?.monthlyUsd ?? 5000));
  const [cadence, setCadence] = useState<ProCadence>(
    existing?.cadence ?? "MONTHLY"
  );
  const [status, setStatus] = useState<ProWorkerStatus>(
    existing?.status ?? "pending"
  );
  const [hireMode, setHireMode] = useState<ProHireMode>(
    existing?.hireMode ?? "private"
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <ProModal
      title={existing ? "Edit substream" : "Add substream"}
      subtitle="Roster is Seal-encrypted to your org wallet. Private hire funds the shielded pool from your wallet; public hire withdraws the treasury."
      onClose={onClose}
      wide
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <ProField label="Name">
          <input
            data-demo="pro-worker-name"
            className={proInputClass}
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
          />
        </ProField>
        <ProField label="Stream group">
          <select
            className={proSelectClass}
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            <option value="">Ungrouped</option>
            {workspace.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </ProField>
        <ProField label="Hire mode">
          <select
            data-demo="pro-worker-hire-mode"
            className={proSelectClass}
            value={hireMode}
            onChange={(e) => setHireMode(e.target.value as ProHireMode)}
            disabled={!!existing?.streamId || !!existing?.engagementId}
          >
            <option value="private">Private (shielded pool)</option>
            <option value="public">Public (treasury stream)</option>
          </select>
        </ProField>
        <ProField
          label={
            hireMode === "private"
              ? "Pay-to (sl1… preferred, or 0x / @handle)"
              : `Wallet (@${suinsBrand()} or 0x)`
          }
        >
          <input
            data-demo="pro-worker-payto"
            className={proInputClass}
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder={
              hireMode === "private" ? "sl1… or 0x…" : `@${suinsBrand()} or 0x…`
            }
            spellCheck={false}
            autoComplete="off"
          />
        </ProField>
        <ProField label="Monthly USDC">
          <input
            data-demo="pro-worker-monthly"
            className={proInputClass}
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
          />
        </ProField>
        <ProField label="Cadence">
          <select
            className={proSelectClass}
            value={cadence}
            onChange={(e) => setCadence(e.target.value as ProCadence)}
          >
            <option value="MONTHLY">Monthly</option>
            <option value="HOURLY">Hourly</option>
          </select>
        </ProField>
        <ProField label="Status">
          <select
            className={proSelectClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as ProWorkerStatus)}
          >
            <option value="pending">Pending</option>
            <option value="dripping">Streaming</option>
            <option value="paused">Paused</option>
            <option value="stopped">Stopped</option>
          </select>
        </ProField>
      </div>
      <p className="mt-3 text-[11px] text-white/35">
        {hireMode === "private"
          ? "Start opens a private engagement (overfund + split). Amount and who↔whom stay inside the pool."
          : "Start withdraws treasury into a cleartext Stream — salary and parties are public on-chain."}
      </p>
      {error && (
        <p className="mt-3 text-[11px] text-[#c0533a]">{error}</p>
      )}
      <div className="mt-5 flex items-center justify-between gap-2">
        {existing ? (
          <button
            type="button"
            className="text-[11px] text-[#c0533a] hover:underline"
            onClick={() => {
              deleteWorker(existing.id);
              onClose();
            }}
          >
            Remove
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" className="sl-glass-btn-dark !px-4 !py-2 !text-[11px]" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="sl-glass-btn-dark sl-glass-btn-dark-primary !px-4 !py-2 !text-[11px]"
            data-demo-action="pro-worker-save"
            disabled={saving}
            onClick={() => {
              void (async () => {
                const n = Number(monthly);
                if (!alias.trim() || !Number.isFinite(n) || n <= 0) return;
                setSaving(true);
                setError(null);
                try {
                  const raw = wallet.trim();
                  let walletAddress = raw;
                  let shieldedAddress: string | undefined;
                  if (raw.startsWith("sl1")) {
                    shieldedAddress = raw;
                    walletAddress =
                      existing?.walletAddress &&
                      !existing.walletAddress.startsWith("sl1")
                        ? existing.walletAddress
                        : demoRosterAddress(alias.trim() || "worker");
                  } else if (raw && isHexAddress(raw)) {
                    walletAddress = raw;
                  } else if (raw) {
                    try {
                      const resolved = await resolveRecipientOrThrow(
                        client,
                        wallet
                      );
                      walletAddress = resolved.address;
                    } catch {
                      // Demo / pitch: still add to roster if SuiNS/address resolve fails.
                      walletAddress = demoRosterAddress(
                        `${alias.trim()}:${raw}`
                      );
                    }
                  } else {
                    walletAddress = demoRosterAddress(alias.trim() || "worker");
                  }
                  upsertWorker({
                    id: existing?.id,
                    alias: alias.trim(),
                    walletAddress,
                    groupId: groupId || null,
                    monthlyUsd: n,
                    cadence,
                    status,
                    hireMode,
                    shieldedAddress,
                  });
                  onClose();
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setSaving(false);
                }
              })();
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      {existing ? (
        <p className="mt-3 text-[11px] text-white/30">
          {(existing.hireMode ?? "private") === "private" ? "Private" : "Public"} ·{" "}
          {existing.shieldedAddress
            ? `${existing.shieldedAddress.slice(0, 10)}…`
            : shortAddress(existing.walletAddress)}{" "}
          · streamed {fmtUsd(existing.streamedUsd)}
        </p>
      ) : null}
    </ProModal>
  );
}

function GroupModal({
  groupId,
  onClose,
}: {
  groupId?: string;
  onClose: () => void;
}) {
  const { workspace, upsertGroup, deleteGroup } = useProWorkspace();
  const existing = workspace.groups.find((g) => g.id === groupId);
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const memberCount = useMemo(
    () => workspace.workers.filter((w) => w.groupId === groupId).length,
    [workspace.workers, groupId]
  );

  return (
    <ProModal
      title={existing ? "Edit stream group" : "New stream group"}
      subtitle="Groups are org labels — all substreams still share one funding pool per token."
      onClose={onClose}
    >
      <div className="space-y-3">
        <ProField label="Name">
          <input className={proInputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </ProField>
        <ProField label="Description">
          <input
            className={proInputClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </ProField>
      </div>
      <div className="mt-5 flex items-center justify-between gap-2">
        {existing ? (
          <button
            type="button"
            className="text-[11px] text-[#c0533a] hover:underline"
            onClick={() => {
              deleteGroup(existing.id);
              onClose();
            }}
          >
            Delete group{memberCount ? ` (${memberCount} stay ungrouped)` : ""}
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" className="sl-glass-btn-dark !px-4 !py-2 !text-[11px]" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="sl-glass-btn-dark sl-glass-btn-dark-primary !px-4 !py-2 !text-[11px]"
            onClick={() => {
              if (!name.trim()) return;
              upsertGroup({
                id: existing?.id,
                name: name.trim(),
                description: description.trim() || undefined,
              });
              onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </ProModal>
  );
}
