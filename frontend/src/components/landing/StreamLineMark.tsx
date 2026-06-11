type StreamLineMarkProps = {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "pro";
  className?: string;
};

const SIZES = {
  sm: "h-7 w-7 text-sm",
  md: "h-10 w-10 text-lg",
  lg: "h-12 w-12 text-xl",
};

/** Minimal StreamLine mark — a single bold S on teal. */
export function StreamLineMark({
  size = "md",
  variant = "default",
  className = "",
}: StreamLineMarkProps) {
  const pro = variant === "pro";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold leading-none ${
        pro
          ? "border border-white/20 bg-white/10 text-white shadow-none"
          : "bg-[#1a9e8f] text-white shadow-[0_4px_16px_rgba(26,158,143,0.35)]"
      } ${SIZES[size]} ${className}`}
      aria-hidden
    >
      S
    </span>
  );
}
