"use client";

import { useEffect, useState } from "react";

import type { ProStreamGroup, ProSubstream, ProSubstreamStatus } from "./types";

type EditorMode =
  | { kind: "group-create" }
  | { kind: "group-edit"; group: ProStreamGroup }
  | { kind: "substream-create"; groupId: string }
  | { kind: "substream-edit"; groupId: string; substream: ProSubstream };

type ProGroupEditorModalProps = {
  mode: EditorMode;
  onClose: () => void;
  onSaveGroup: (group: Omit<ProStreamGroup, "id" | "createdAt"> & { id?: string }) => void;
  onSaveSubstream: (
    groupId: string,
    substream: Omit<ProSubstream, "id"> & { id?: string }
  ) => void;
  onDeleteGroup?: (groupId: string) => void;
  onDeleteSubstream?: (groupId: string, substreamId: string) => void;
};

const STATUS_OPTIONS: ProSubstreamStatus[] = ["dripping", "paused", "pending"];

function overlayClass(compact: boolean) {
  return compact
    ? "absolute inset-0 z-30 flex items-end bg-black/50 p-3"
    : "fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm";
}

function panelClass(compact: boolean) {
  return compact
    ? "w-full rounded-xl border border-white/10 bg-[#141414] p-4 shadow-xl"
    : "w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-5 shadow-2xl";
}

export function ProGroupEditorModal({
  mode,
  onClose,
  onSaveGroup,
  onSaveSubstream,
  onDeleteGroup,
  onDeleteSubstream,
}: ProGroupEditorModalProps) {
  const compact = false;
  const isGroup = mode.kind === "group-create" || mode.kind === "group-edit";
  const isSubstream =
    mode.kind === "substream-create" || mode.kind === "substream-edit";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [dripPerSec, setDripPerSec] = useState("");
  const [status, setStatus] = useState<ProSubstreamStatus>("dripping");

  useEffect(() => {
    if (mode.kind === "group-edit") {
      setName(mode.group.name);
      setDescription(mode.group.description ?? "");
    } else if (mode.kind === "substream-edit") {
      setName(mode.substream.name);
      setBudget(String(mode.substream.budget));
      setDripPerSec(String(mode.substream.dripPerSec));
      setStatus(mode.substream.status);
    } else if (mode.kind === "substream-create") {
      setName("");
      setBudget("");
      setDripPerSec("1");
      setStatus("dripping");
    } else {
      setName("");
      setDescription("");
    }
  }, [mode]);

  const title =
    mode.kind === "group-create"
      ? "New stream group"
      : mode.kind === "group-edit"
        ? "Edit stream group"
        : mode.kind === "substream-create"
          ? "Add substream"
          : "Edit substream";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const isGroup = mode.kind === "group-create" || mode.kind === "group-edit";

    if (isGroup) {
      onSaveGroup({
        id: mode.kind === "group-edit" ? mode.group.id : undefined,
        name: trimmed,
        description: description.trim() || undefined,
        substreams: mode.kind === "group-edit" ? mode.group.substreams : [],
      });
      onClose();
      return;
    }

    const budgetNum = Number(budget);
    const dripNum = Number(dripPerSec);
    if (!Number.isFinite(budgetNum) || budgetNum <= 0) return;
    if (!Number.isFinite(dripNum) || dripNum < 0) return;

    const groupId =
      mode.kind === "substream-create" ? mode.groupId : mode.groupId;

    onSaveSubstream(groupId, {
      id: mode.kind === "substream-edit" ? mode.substream.id : undefined,
      name: trimmed,
      budget: budgetNum,
      dripPerSec: dripNum,
      status,
    });
    onClose();
  };

  const inputClass =
    "w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/25";

  return (
    <div className={overlayClass(compact)} onClick={onClose}>
      <div
        className={panelClass(compact)}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-editor-title"
      >
        <h2 id="pro-editor-title" className="text-base font-semibold text-white">
          {title}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block">
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">
              Name
            </span>
            <input
              className={`${inputClass} mt-1`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isGroup ? "Engineering, Q2 contractors…" : "Alex Chen, Vendor #12…"}
              autoFocus
              required
            />
          </label>

          {isGroup && (
            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                Description (optional)
              </span>
              <input
                className={`${inputClass} mt-1`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Team, region, or pay run notes"
              />
            </label>
          )}

          {isSubstream && (
            <>
              <label className="block">
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                  Budget (USDC)
                </span>
                <input
                  className={`${inputClass} mt-1 tabular`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="6400"
                  required
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                  Drip rate (/sec)
                </span>
                <input
                  className={`${inputClass} mt-1 tabular`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={dripPerSec}
                  onChange={(e) => setDripPerSec(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                  Status
                </span>
                <select
                  className={`${inputClass} mt-1`}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProSubstreamStatus)}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-[#141414]">
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              className="sl-glass-btn-dark sl-glass-btn-dark-primary !px-4 !py-2 !text-[10px]"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="sl-glass-btn-dark !px-4 !py-2 !text-[10px]"
            >
              Cancel
            </button>
            {mode.kind === "group-edit" && onDeleteGroup && (
              <button
                type="button"
                onClick={() => {
                  onDeleteGroup(mode.group.id);
                  onClose();
                }}
                className="ml-auto text-[10px] font-medium text-[#c0533a] hover:text-[#e06a50]"
              >
                Delete group
              </button>
            )}
            {mode.kind === "substream-edit" && onDeleteSubstream && (
              <button
                type="button"
                onClick={() => {
                  onDeleteSubstream(mode.groupId, mode.substream.id);
                  onClose();
                }}
                className="ml-auto text-[10px] font-medium text-[#c0533a] hover:text-[#e06a50]"
              >
                Delete substream
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
