import type { StreamRecord } from "./indexer";

export type StreamState = StreamRecord["state"];

/** USDC already settled on-chain for this stream (base units). */
export function paidBase(s: StreamRecord): number {
  return s.total - s.remaining;
}

/** Payout cap for a 0-based milestone index (equal-split streams). */
export function milestoneCeilingBase(
  s: StreamRecord,
  milestoneIndex: number
): number {
  if (s.n_milestones <= 0) return s.total;
  return Math.ceil(((milestoneIndex + 1) * s.total) / s.n_milestones);
}

/** Whether the current milestone's allocation has fully dripped on-chain. */
export function milestoneFullyPaid(s: StreamRecord): boolean {
  return paidBase(s) >= milestoneCeilingBase(s, s.current_milestone);
}

/**
 * UI-facing state. The indexer can lag after a milestone completes (the contract
 * flips to LOCKED inside the same `drip` tx with no extra event).
 */
export function effectiveState(s: StreamRecord): StreamState {
  if (s.state === "dripping" && milestoneFullyPaid(s)) return "locked";
  return s.state;
}

/** Number of milestones fully paid out. */
export function completedMilestones(s: StreamRecord): number {
  if (effectiveState(s) === "locked" && s.state === "dripping") {
    return s.current_milestone + 1;
  }
  return s.current_milestone;
}

/** 1-based milestone the freelancer should raise next. */
export function nextMilestoneNo(s: StreamRecord): number {
  if (effectiveState(s) === "locked" && s.state === "dripping") {
    return s.current_milestone + 2;
  }
  return s.current_milestone + 1;
}
