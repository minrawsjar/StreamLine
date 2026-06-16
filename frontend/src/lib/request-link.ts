export type StreamRequestParams = {
  recipient: string;
  amount: string;
  durationDays: string;
  isPrivate: boolean;
  useMilestones: boolean;
  milestones: string[];
  useSplitConfig: boolean;
  splits: { label: string; pct: number; yield: boolean }[];
  note?: string;
};

export type ResolvedStreamRequest = {
  freelancer: string;
  amount: number;
  durationMs: number;
  isPrivate: boolean;
  milestones: string[];
  splits: { label: string; address: string; pct: number; yield: boolean }[];
};

const DEFAULT_SPLITS: ResolvedStreamRequest["splits"] = [
  { label: "Spending wallet", address: "", pct: 70, yield: false },
  { label: "Scallop (yield)", address: "", pct: 30, yield: true },
];

export function resolveStreamRequest(
  request: StreamRequestParams
): ResolvedStreamRequest {
  return {
    freelancer: request.recipient,
    amount: Number(request.amount) || 0,
    durationMs: (Number(request.durationDays) || 0) * 86_400_000,
    isPrivate: request.isPrivate,
    milestones:
      request.useMilestones && request.milestones.length > 0
        ? request.milestones
        : ["Payment"],
    splits:
      request.useSplitConfig && request.splits.length > 0
        ? request.splits.map((s) => ({
            label: s.label,
            address: "",
            pct: s.pct,
            yield: s.yield,
          }))
        : DEFAULT_SPLITS,
  };
}

export function validateResolvedStreamRequest(
  resolved: ResolvedStreamRequest
): string[] {
  const errors: string[] = [];
  if (resolved.amount <= 0) errors.push("Amount must be greater than 0.");
  if (resolved.milestones.length === 0) errors.push("Add at least one milestone.");
  if (resolved.amount / Math.max(resolved.milestones.length, 1) < 0.01) {
    errors.push("Each milestone must be ≥ 0.01 USDC.");
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(resolved.freelancer.trim())) {
    errors.push("Recipient must be a full Sui address (0x + 64 hex).");
  }
  if (!resolved.isPrivate) {
    if (resolved.durationMs <= 0) errors.push("Duration must be greater than 0.");
    const splitSum = resolved.splits.reduce((s, r) => s + (Number(r.pct) || 0), 0);
    if (splitSum !== 100) errors.push(`Splits must total 100% (currently ${splitSum}%).`);
  }
  return errors;
}

function parseSplits(raw: string | null): StreamRequestParams["splits"] {
  if (!raw) return [];
  return raw
    .split("|")
    .map((part) => {
      const [labelEnc, pctRaw, yieldRaw] = part.split(":");
      if (!labelEnc || pctRaw === undefined) return null;
      return {
        label: decodeURIComponent(labelEnc),
        pct: Number(pctRaw) || 0,
        yield: yieldRaw === "1",
      };
    })
    .filter((row): row is StreamRequestParams["splits"][number] => row !== null);
}

/** Parse a StreamLine request share URL or raw query string. */
export function parseStreamRequestLink(input: string): StreamRequestParams | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const url = trimmed.includes("://")
      ? new URL(trimmed)
      : new URL(trimmed.startsWith("?") ? trimmed : `?${trimmed}`, "https://streamline.app/app");

    const params = url.searchParams;
    const recipient = params.get("recipient");
    if (!recipient) return null;

    const milestonesRaw = params.get("milestones");
    const milestonesCount = Number(params.get("milestones_count") ?? "0");
    const useMilestones =
      milestonesCount > 0 ||
      (milestonesRaw !== null && milestonesRaw !== "0" && milestonesRaw.length > 0);
    const milestones =
      useMilestones && milestonesRaw && milestonesRaw !== "0"
        ? milestonesRaw.split("|").filter(Boolean)
        : [];

    const useSplitConfig = params.get("use_splits") === "1";
    const splits = useSplitConfig ? parseSplits(params.get("splits")) : [];

    return {
      recipient,
      amount: params.get("amount") ?? "0",
      durationDays: params.get("duration_days") ?? "0",
      isPrivate: params.get("private") === "1",
      useMilestones,
      milestones,
      useSplitConfig,
      splits,
      note: params.get("note") ?? undefined,
    };
  } catch {
    return null;
  }
}
