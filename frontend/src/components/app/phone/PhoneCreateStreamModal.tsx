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
    <div className="absolute inset-0 z-30 flex flex-col bg-white">
      <div className="sl-scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-[#111]">
              Create a stream
            </h2>
            <p className="mt-1 text-[12px] leading-snug text-[#666]">
              Lock USDC on-chain and drip it to a recipient on your terms.
            </p>
          </div>
          <StreamCreator onCancel={onClose} />
        </div>
      </div>
    </div>
  );
}
