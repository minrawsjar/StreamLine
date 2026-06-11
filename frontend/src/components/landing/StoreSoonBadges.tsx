/** App Store / Google Play–style download tiles with QR motif and "Soon". */

function QrPlaceholder({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <rect x="4" y="4" width="14" height="14" rx="1" opacity="0.9" />
      <rect x="30" y="4" width="14" height="14" rx="1" opacity="0.9" />
      <rect x="4" y="30" width="14" height="14" rx="1" opacity="0.9" />
      <rect x="22" y="22" width="6" height="6" opacity="0.7" />
      <rect x="30" y="22" width="4" height="4" opacity="0.5" />
      <rect x="36" y="28" width="8" height="8" opacity="0.6" />
      <rect x="22" y="32" width="4" height="4" opacity="0.5" />
      <rect x="18" y="22" width="3" height="3" opacity="0.4" />
      <rect x="30" y="36" width="5" height="5" opacity="0.45" />
    </svg>
  );
}

function StoreBadge({
  store,
  subtitle,
}: {
  store: "apple" | "google";
  subtitle: string;
}) {
  const isApple = store === "apple";

  return (
    <div className="relative flex flex-1 items-center gap-2.5 rounded-xl border border-white/50 bg-white/40 px-3 py-2.5 opacity-[0.55] backdrop-blur-sm">
      <QrPlaceholder className="h-11 w-11 shrink-0 text-[#111]/70" />
      <div className="min-w-0 text-left">
        <p className="text-[8px] font-medium uppercase tracking-wider text-[#555]/80">
          {subtitle}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold leading-tight text-[#111]/75">
          {isApple ? (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden>
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.63 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden>
              <path d="M3.6 1.8l13.2 7.6c.5.3.5 1 0 1.3L3.6 18.2c-.6.3-1.3-.1-1.3-.8V2.6c0-.7.7-1.1 1.3-.8z" />
            </svg>
          )}
          {isApple ? "App Store" : "Google Play"}
        </p>
      </div>
      <span className="absolute right-2 top-1.5 rounded-full bg-[#1a9e8f]/15 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-[#1a9e8f]/80">
        Soon
      </span>
    </div>
  );
}

type StoreSoonBadgesProps = {
  className?: string;
  size?: "sm" | "md";
};

export function StoreSoonBadges({ className = "", size = "md" }: StoreSoonBadgesProps) {
  return (
    <div
      className={`flex w-full gap-2 ${size === "sm" ? "max-w-[240px]" : "max-w-[280px]"} ${className}`}
    >
      <StoreBadge store="apple" subtitle="Download on the" />
      <StoreBadge store="google" subtitle="Get it on" />
    </div>
  );
}
