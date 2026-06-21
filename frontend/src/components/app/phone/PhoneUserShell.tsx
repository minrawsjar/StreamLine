"use client";

import { useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";

import { PhoneHomeView } from "./PhoneHomeView";
import { PhoneTransferModal } from "./PhoneTransferModal";
import type { PhoneAppRoute } from "./types";

type PhoneUserShellProps = {
  onNavigate: (route: PhoneAppRoute) => void;
};

export function PhoneUserShell({ onNavigate }: PhoneUserShellProps) {
  const account = useCurrentAccount();
  const [showAllStreams, setShowAllStreams] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  if (!account) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 text-center">
        <p className="text-[10px] text-[#888]">Connect wallet above to continue</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="sl-scrollbar-hidden min-h-0 flex-1 overflow-y-auto pr-0.5">
        <PhoneHomeView
          showAllStreams={showAllStreams}
          onShowAllStreams={() => setShowAllStreams(true)}
          onBackToHome={() => setShowAllStreams(false)}
          onCreate={() => onNavigate("create")}
          onRequest={() => onNavigate("request")}
          onTransfer={() => setTransferOpen(true)}
        />
      </div>
      <PhoneTransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
      />
    </div>
  );
}
