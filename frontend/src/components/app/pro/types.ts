export type ProSubstreamStatus = "dripping" | "paused" | "pending";

export type ProSubstream = {
  id: string;
  name: string;
  budget: number;
  dripPerSec: number;
  status: ProSubstreamStatus;
};

export type ProStreamGroup = {
  id: string;
  name: string;
  description?: string;
  substreams: ProSubstream[];
  createdAt: number;
};

export function groupBudget(group: ProStreamGroup) {
  return group.substreams.reduce((sum, s) => sum + s.budget, 0);
}

export function groupDripRate(group: ProStreamGroup) {
  return group.substreams.reduce(
    (sum, s) => (s.status === "dripping" ? sum + s.dripPerSec : sum),
    0
  );
}

export function remainingBalance(substream: ProSubstream, tick: number) {
  if (substream.status !== "dripping") return substream.budget;
  return Math.max(0, substream.budget - tick * substream.dripPerSec);
}
