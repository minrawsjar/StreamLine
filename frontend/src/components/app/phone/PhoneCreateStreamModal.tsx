"use client";

import { StreamCreator } from "../StreamCreator";

type PhoneCreateStreamModalProps = {
  open: boolean;
  onClose: () => void;
};

export function PhoneCreateStreamModal({
  open,
  onClose,
}: PhoneCreateStreamModalProps) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-white/95 backdrop-blur-md">
      <div className="flex shrink-0 items-center justify-between border-b border-black/6 px-1 pb-3 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="text-[10px] font-medium text-[#666]"
        >
          Cancel
        </button>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#888]">
          Create stream
        </p>
        <span className="w-10" aria-hidden />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-3 pr-0.5">
        <StreamCreator />
      </div>
    </div>
  );
}
