"use client";

type ProAddGroupCardProps = {
  onClick: () => void;
  compact?: boolean;
};

export function ProAddGroupCard({ onClick, compact = false }: ProAddGroupCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.02] text-center transition-colors hover:border-white/35 hover:bg-white/[0.05] ${
        compact ? "gap-1 px-3 py-6" : "gap-2 px-5 py-10"
      }`}
    >
      <span
        className={`flex items-center justify-center rounded-full border border-white/20 text-white/55 ${
          compact ? "h-7 w-7 text-base" : "h-9 w-9 text-xl"
        }`}
      >
        +
      </span>
      <span className={`font-medium text-white/55 ${compact ? "text-[10px]" : "text-sm"}`}>
        Add stream group
      </span>
      <span className={`text-white/30 ${compact ? "text-[8px]" : "text-[11px]"}`}>
        Organize pay runs, teams, and substreams
      </span>
    </button>
  );
}
