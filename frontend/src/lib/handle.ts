/**
 * Pure helpers for StreamLine usernames (SuiNS subnames).
 *
 * User-facing form is `name@streamline`. The SuiNS canonical form is
 * `name.streamline.sui` (parent domain from NEXT_PUBLIC_SUINS_DOMAIN).
 */

export type ParsedHandle = { username: string; raw: string };

/** Lowercase a-z, 0-9, hyphen. 3–20 chars. No leading/trailing hyphen. */
export const USERNAME_RE = /^[a-z0-9](?:[a-z0-9-]{1,18}[a-z0-9])?$/;

/** Reserved usernames that no user may claim. */
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  "admin",
  "streamline",
  "support",
  "help",
  "api",
  "www",
  "root",
  "team",
  "system",
  "null",
  "me",
  "you",
  "owner",
  "operator",
  "billing",
  "security",
  "abuse",
  "info",
  "contact",
  "legal",
  "privacy",
  "app",
  "wallet",
  "vault",
  "send",
  "claim",
  "pro",
]);

/** Parent domain, e.g. `streamline.sui`. */
export function suinsDomain(): string {
  const raw =
    process.env.NEXT_PUBLIC_SUINS_DOMAIN?.trim().toLowerCase() ||
    "streamline.sui";
  return raw.endsWith(".sui") ? raw : `${raw}.sui`;
}

/** Brand label without `.sui`, e.g. `streamline`. */
export function suinsBrand(): string {
  return suinsDomain().replace(/\.sui$/, "");
}

/**
 * Whether to offer handle claim UX.
 * Always on — domain defaults to `streamline.sui` even without env.
 * Actual mint still needs the domain LIVE in Enoki + API keys.
 */
export function suinsConfigured(): boolean {
  return true;
}

/** True if the input looks like a Sui address (0x + 64 hex chars). */
export function isHexAddress(input: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(input.trim());
}

export type NormalizeResult =
  | { ok: true; handle: string }
  | {
      ok: false;
      reason:
        | "empty"
        | "too_short"
        | "too_long"
        | "charset"
        | "reserved";
    };

/**
 * Strip wrappers (`@`, `@streamline`, `.streamline.sui`), lowercase, validate.
 * Returns a discriminated result so callers can surface precise errors.
 */
export function normalizeHandle(raw: unknown): NormalizeResult {
  if (typeof raw !== "string") return { ok: false, reason: "empty" };
  let s = raw.trim().toLowerCase();
  if (!s) return { ok: false, reason: "empty" };

  if (s.startsWith("@")) s = s.slice(1);

  const brand = suinsBrand();
  const domain = suinsDomain();

  if (s.endsWith(`@${domain}`)) s = s.slice(0, -(`@${domain}`.length));
  if (s.endsWith(`@${brand}`)) s = s.slice(0, -(`@${brand}`.length));
  if (s.endsWith(`.${domain}`)) s = s.slice(0, -(`.${domain}`.length));

  if (s.length === 0) return { ok: false, reason: "empty" };
  if (s.length < 3) return { ok: false, reason: "too_short" };
  if (s.length > 20) return { ok: false, reason: "too_long" };
  if (!USERNAME_RE.test(s)) return { ok: false, reason: "charset" };
  if (RESERVED_USERNAMES.has(s)) return { ok: false, reason: "reserved" };
  return { ok: true, handle: s };
}

/** Short display form used on cards and chips: `alice@streamline`. */
export function formatHandle(username: string): string {
  return `${username}@${suinsBrand()}`;
}

/** True when a display/name string is our StreamLine subname (not any .sui). */
export function isStreamlineHandle(value: string): boolean {
  const s = value.trim().toLowerCase();
  if (!s) return false;
  const brand = suinsBrand();
  const domain = suinsDomain();
  // alice@streamline | alice.streamline.sui | alice@streamline.sui (Enoki list form)
  return (
    s.endsWith(`@${brand}`) ||
    s.endsWith(`.${domain}`) ||
    s.endsWith(`@${domain}`)
  );
}

/** Strip Enoki/SuiNS wrappers down to the bare username when possible. */
export function bareHandleFromName(name: string): string | null {
  let s = name.trim().toLowerCase();
  if (!s) return null;
  const brand = suinsBrand();
  const domain = suinsDomain();
  if (s.startsWith("@")) s = s.slice(1);
  if (s.endsWith(`@${domain}`)) s = s.slice(0, -(`@${domain}`.length));
  else if (s.endsWith(`@${brand}`)) s = s.slice(0, -(`@${brand}`.length));
  else if (s.endsWith(`.${domain}`)) s = s.slice(0, -(`.${domain}`.length));
  else if (s.includes("@")) s = s.split("@")[0] ?? s;
  const parsed = normalizeHandle(s);
  return parsed.ok ? parsed.handle : null;
}

/** True if an Enoki list entry refers to the given bare subname. */
export function enokiNameMatchesSubname(
  enokiName: string,
  subname: string
): boolean {
  const bare = bareHandleFromName(enokiName);
  return bare === subname.trim().toLowerCase();
}

/** Canonical SuiNS name: `alice.streamline.sui`. */
export function formatSuins(username: string): string {
  return `${username}.${suinsDomain()}`;
}

export function normalizeReasonMessage(
  reason: Exclude<NormalizeResult, { ok: true }>["reason"]
): string {
  switch (reason) {
    case "empty":
      return "Enter a handle.";
    case "too_short":
      return "Handles need at least 3 characters.";
    case "too_long":
      return "Handles are up to 20 characters.";
    case "charset":
      return "Letters, numbers, and hyphens only. No leading or trailing hyphen.";
    case "reserved":
      return "That handle is reserved.";
  }
}
