"use client";

import { useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";

import { PhoneHomeView } from "./PhoneHomeView";
import { PhoneCreateStreamModal } from "./PhoneCreateStreamModal";

export function PhoneUserShell() {
  const account = useCurrentAccount();
  const [showAllStreams, setShowAllStreams] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  if (!account) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 text-center">
        <p className="text-[10px] text-[#888]">Connect wallet above to continue</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        <PhoneHomeView
          showAllStreams={showAllStreams}
          onShowAllStreams={() => setShowAllStreams(true)}
          onBackToHome={() => setShowAllStreams(false)}
          onRequest={() => setCreateOpen(true)}
        />
      </div>
      <PhoneCreateStreamModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
