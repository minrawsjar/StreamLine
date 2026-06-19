"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";

import { WalletButton } from "@/components/wallet/WalletButton";
import { usePhoneEmbedded } from "@/components/app/phone/PhoneEmbeddedContext";
import { loadProGroups, saveProGroups } from "@/lib/pro-groups-store";
import { ProAddGroupCard } from "./ProAddGroupCard";
import { ProGroupCard } from "./ProGroupCard";
import { ProGroupEditorModal } from "./ProGroupEditorModal";
import {
  groupBudget,
  remainingBalance,
  type ProStreamGroup,
  type ProSubstream,
} from "./types";

const TICK_MS = 1000;
const YIELD_APY = 0.12;

type EditorMode =
  | { kind: "group-create" }
  | { kind: "group-edit"; group: ProStreamGroup }
  | { kind: "substream-create"; groupId: string }
  | { kind: "substream-edit"; groupId: string; substream: ProSubstream }
  | null;

function fmtUsd(n: number, decimals = 0) {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ProDashboard() {
  const account = useCurrentAccount();
  const embedded = usePhoneEmbedded();
  const address = account?.address ?? "";

  const [groups, setGroups] = useState<ProStreamGroup[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editor, setEditor] = useState<EditorMode>(null);
  const [tick, setTick] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!address) {
      setGroups([]);
      setHydrated(true);
      return;
    }
    setGroups(loadProGroups(address));
    setHydrated(true);
  }, [address]);

  useEffect(() => {
    if (!hydrated || !address) return;
    saveProGroups(address, groups);
  }, [groups, address, hydrated]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const totals = useMemo(() => {
    const committed = groups.reduce((sum, g) => sum + groupBudget(g), 0);
    const remaining = groups.reduce(
      (sum, g) =>
        sum + g.substreams.reduce((s, sub) => s + remainingBalance(sub, tick), 0),
      0
    );
    const streamCount = groups.reduce((sum, g) => sum + g.substreams.length, 0);
    const yieldPerSec = committed * (YIELD_APY / 365 / 24 / 3600);
    const yieldEarned = tick * yieldPerSec;
    const displayTotal = remaining + yieldEarned;
    return { committed, remaining, streamCount, yieldEarned, displayTotal };
  }, [groups, tick]);

  const persistGroups = useCallback((next: ProStreamGroup[]) => {
    setGroups(next);
  }, []);

  const toggleExpanded = (groupId: string) => {
    setExpanded((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleSaveGroup = (input: {
    id?: string;
    name: string;
    description?: string;
    substreams: ProSubstream[];
  }) => {
    if (input.id) {
      persistGroups(
        groups.map((g) =>
          g.id === input.id
            ? { ...g, name: input.name, description: input.description }
            : g
        )
      );
      return;
    }
    const group: ProStreamGroup = {
      id: newId(),
      name: input.name,
      description: input.description,
      substreams: [],
      createdAt: Date.now(),
    };
    persistGroups([...groups, group]);
    setExpanded((prev) => ({ ...prev, [group.id]: true }));
  };

  const handleSaveSubstream = (
    groupId: string,
    input: Omit<ProSubstream, "id"> & { id?: string }
  ) => {
    persistGroups(
      groups.map((g) => {
        if (g.id !== groupId) return g;
        if (input.id) {
          return {
            ...g,
            substreams: g.substreams.map((s) =>
              s.id === input.id
                ? {
                    id: s.id,
                    name: input.name,
                    budget: input.budget,
                    dripPerSec: input.dripPerSec,
                    status: input.status,
                  }
                : s
            ),
          };
        }
        return {
          ...g,
          substreams: [
            ...g.substreams,
            {
              id: newId(),
              name: input.name,
              budget: input.budget,
              dripPerSec: input.dripPerSec,
              status: input.status,
            },
          ],
        };
      })
    );
  };

  const handleDeleteGroup = (groupId: string) => {
    persistGroups(groups.filter((g) => g.id !== groupId));
    setExpanded((prev) => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
  };

  const handleDeleteSubstream = (groupId: string, substreamId: string) => {
    persistGroups(
      groups.map((g) =>
        g.id === groupId
          ? { ...g, substreams: g.substreams.filter((s) => s.id !== substreamId) }
          : g
      )
    );
  };

  if (!account) {
    if (embedded) {
      return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 text-center font-[family-name:var(--font-inter)]">
          <p className="text-[10px] text-white/40">Connect wallet above to continue</p>
        </div>
      );
    }

    return (
      <div className="flex min-h-[calc(100dvh-57px)] flex-col items-center justify-center gap-6 px-6 text-center font-[family-name:var(--font-inter)]">
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/35">
          StreamLine.pro
        </p>
        <h1 className="max-w-xl text-[clamp(24px,4vw,40px)] font-semibold leading-[1.05] tracking-[-0.02em] text-white">
          Connect to manage payroll runs.
        </h1>
        <WalletButton className="sl-glass-btn-dark sl-glass-btn-dark-primary !px-8 !py-3" />
      </div>
    );
  }

  const labelClass = embedded
    ? "text-[8px] tracking-[0.18em]"
    : "text-[10px] tracking-[0.2em]";
  const totalClass = embedded ? "text-[1.5rem]" : "text-[clamp(32px,5vw,52px)]";
  const metaClass = embedded ? "text-[10px]" : "text-[13px]";

  return (
    <div
      className={
        embedded
          ? "flex min-h-0 flex-1 flex-col font-[family-name:var(--font-inter)]"
          : "mx-auto max-w-[1100px] px-6 py-10 font-[family-name:var(--font-inter)]"
      }
    >
      <div className={`flex items-start justify-between gap-3 ${embedded ? "" : ""}`}>
        <div className="min-w-0 flex-1">
          <p className={`font-medium uppercase text-white/35 ${labelClass}`}>
            Payroll run
          </p>
          <h1
            className={`mt-2 font-semibold tabular leading-none tracking-tight text-white ${totalClass}`}
          >
            {fmtUsd(totals.displayTotal, totals.displayTotal % 1 ? 2 : 0)}
          </h1>
          {totals.committed > 0 && (
            <p className="mt-1 text-[10px] font-semibold tabular text-[#1d9e75]">
              +{fmtUsd(totals.yieldEarned, 2)} yield accruing
            </p>
          )}
          <p className={`mt-1 text-white/45 ${metaClass}`}>
            {groups.length} group{groups.length === 1 ? "" : "s"} · {totals.streamCount}{" "}
            substream{totals.streamCount === 1 ? "" : "s"}
            {totals.committed > 0 ? " · streaming" : ""}
          </p>
        </div>
      </div>

      <div className={`${embedded ? "mt-4" : "mt-8"}`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <p
            className={`font-medium uppercase tracking-wider text-white/30 ${
              embedded ? "text-[8px]" : "text-[9px]"
            }`}
          >
            Stream groups
          </p>
        </div>

        <div className={`grid gap-3 ${embedded ? "" : "sm:grid-cols-2"}`}>
          {groups.map((group) => (
            <ProGroupCard
              key={group.id}
              group={group}
              tick={tick}
              expanded={!!expanded[group.id]}
              compact={embedded}
              onToggle={() => toggleExpanded(group.id)}
              onEditGroup={() => setEditor({ kind: "group-edit", group })}
              onAddSubstream={() => setEditor({ kind: "substream-create", groupId: group.id })}
              onEditSubstream={(substreamId) => {
                const substream = group.substreams.find((s) => s.id === substreamId);
                if (substream) {
                  setEditor({ kind: "substream-edit", groupId: group.id, substream });
                }
              }}
            />
          ))}
          <ProAddGroupCard
            compact={embedded}
            onClick={() => setEditor({ kind: "group-create" })}
          />
        </div>
      </div>

      {editor && (
        <ProGroupEditorModal
          mode={editor}
          onClose={() => setEditor(null)}
          onSaveGroup={handleSaveGroup}
          onSaveSubstream={handleSaveSubstream}
          onDeleteGroup={handleDeleteGroup}
          onDeleteSubstream={handleDeleteSubstream}
        />
      )}
    </div>
  );
}
