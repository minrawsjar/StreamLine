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
  type ProPoolBucket,
  type ProWorkerStatus,
} from "../types";
import {
  ProField,
  ProModal,
  proInputClass,
  proSelectClass,
} from "../ui";

export function ProActionModals() {
  const { modal, setModal } = useProWorkspace();
  if (!modal) return null;
  if (modal === "fund") return <FundModal onClose={() => setModal(null)} />;
  if (modal === "withdraw")
    return <WithdrawModal onClose={() => setModal(null)} />;
  if (modal === "invest") return <InvestModal onClose={() => setModal(null)} />;
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
            className={proInputClass}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </ProField>
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

function InvestModal({ onClose }: { onClose: () => void }) {
  const { investIdle, investTreasury, rebalance, totals, workspace, creating } =
    useProWorkspace();
  const [mode, setMode] = useState<"invest" | "rebalance">("invest");
  const [err, setErr] = useState<string | null>(null);
  const [amount, setAmount] = useState(
    String(Math.floor(totals.investable) || 0)
  );
  const [bucket, setBucket] = useState<ProPoolBucket>("yield_vault");
  const [from, setFrom] = useState<ProPoolBucket>("yield_vault");
  const [to, setTo] = useState<ProPoolBucket>("idle");

  return (
    <ProModal
      title="Allocate idle capital"
      subtitle="Keep the coverage floor liquid. Route the rest into StreamLine’s yield vault or a reserve bucket."
      onClose={onClose}
    >
      <div className="mb-4 flex gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
        {(
          [
            ["invest", "Invest"],
            ["rebalance", "Rebalance"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`flex-1 rounded-full px-3 py-1.5 text-[11px] ${
              mode === id
                ? "bg-white text-[#0a0a0a]"
                : "text-white/50 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {mode === "invest" ? (
          <>
            <ProField label="Destination">
              <select
                className={proSelectClass}
                value={bucket}
                onChange={(e) => setBucket(e.target.value as ProPoolBucket)}
              >
                <option value="yield_vault">Yield vault</option>
                <option value="reserve">Reserve</option>
              </select>
            </ProField>
            <ProField label="Amount (USDC)">
              <input
                className={proInputClass}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </ProField>
            <p className="text-[12px] text-white/40">
              Investable now: {fmtUsd(totals.investable)} (floor{" "}
              {fmtUsd(totals.floor)})
            </p>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <ProField label="From">
                <select
                  className={proSelectClass}
                  value={from}
                  onChange={(e) => setFrom(e.target.value as ProPoolBucket)}
                >
                  <option value="idle">Liquid</option>
                  <option value="yield_vault">Yield vault</option>
                  <option value="reserve">Reserve</option>
                </select>
              </ProField>
              <ProField label="To">
                <select
                  className={proSelectClass}
                  value={to}
                  onChange={(e) => setTo(e.target.value as ProPoolBucket)}
                >
                  <option value="idle">Liquid</option>
                  <option value="yield_vault">Yield vault</option>
                  <option value="reserve">Reserve</option>
                </select>
              </ProField>
            </div>
            <ProField label="Amount (USDC)">
              <input
                className={proInputClass}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </ProField>
            <p className="text-[12px] text-white/40">
              {from}: {fmtUsd(workspace.pool.allocation[from])}
            </p>
          </>
        )}

        {err && <p className="text-[12px] text-[#e0866a]">{err}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="sl-glass-btn-dark !px-4 !py-2 !text-[11px]" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="sl-glass-btn-dark sl-glass-btn-dark-primary !px-4 !py-2 !text-[11px]"
            disabled={creating}
            onClick={async () => {
              const n = Number(amount);
              if (!Number.isFinite(n) || n <= 0) return;
              setErr(null);
              // Only "invest → yield vault" has on-chain backing; reserve moves
              // and rebalance stay local policy over the real balances.
              if (mode === "invest" && bucket === "yield_vault") {
                try {
                  if (await investTreasury(n)) onClose();
                } catch (e) {
                  setErr(e instanceof Error ? e.message : String(e));
                }
                return;
              }
              if (mode === "invest") investIdle(n, bucket);
              else rebalance(from, to, n);
              onClose();
            }}
          >
            {creating ? "Confirming…" : "Confirm"}
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
  const [wallet, setWallet] = useState(existing?.walletAddress ?? "");
  const [groupId, setGroupId] = useState(existing?.groupId ?? "");
  const [monthly, setMonthly] = useState(String(existing?.monthlyUsd ?? 5000));
  const [cadence, setCadence] = useState<ProCadence>(
    existing?.cadence ?? "MONTHLY"
  );
  const [status, setStatus] = useState<ProWorkerStatus>(
    existing?.status ?? "pending"
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <ProModal
      title={existing ? "Edit substream" : "Add substream"}
      subtitle="Roster entry maps to a continuous drip once the pool is funded."
      onClose={onClose}
      wide
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <ProField label="Name">
          <input className={proInputClass} value={alias} onChange={(e) => setAlias(e.target.value)} />
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
        <ProField label={`Wallet (@${suinsBrand()} or 0x)`}>
          <input
            className={proInputClass}
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder={`@${suinsBrand()} or 0x…`}
            spellCheck={false}
            autoComplete="off"
          />
        </ProField>
        <ProField label="Monthly USDC">
          <input className={proInputClass} value={monthly} onChange={(e) => setMonthly(e.target.value)} />
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
            disabled={saving}
            onClick={() => {
              void (async () => {
                const n = Number(monthly);
                if (!alias.trim() || !Number.isFinite(n) || n <= 0) return;
                setSaving(true);
                setError(null);
                try {
                  let walletAddress = wallet.trim();
                  if (!isHexAddress(walletAddress)) {
                    const resolved = await resolveRecipientOrThrow(
                      client,
                      wallet
                    );
                    walletAddress = resolved.address;
                  }
                  upsertWorker({
                    id: existing?.id,
                    alias: alias.trim(),
                    walletAddress,
                    groupId: groupId || null,
                    monthlyUsd: n,
                    cadence,
                    status,
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
          {shortAddress(existing.walletAddress)} · streamed{" "}
          {fmtUsd(existing.streamedUsd)}
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
