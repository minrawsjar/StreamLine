"use client";

import { useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";

import { PhoneHomeView } from "./PhoneHomeView";
import { PhoneCreateStreamModal } from "./PhoneCreateStreamModal";
import { PhoneRequestStreamModal } from "./PhoneRequestStreamModal";
import { PhoneTransferModal } from "./PhoneTransferModal";

export function PhoneUserShell() {
  const account = useCurrentAccount();
  const [showAllStreams, setShowAllStreams] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
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
          onCreate={() => setCreateOpen(true)}
          onRequest={() => setRequestOpen(true)}
          onTransfer={() => setTransferOpen(true)}
        />
      </div>
      <PhoneCreateStreamModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <PhoneRequestStreamModal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
      />
      <PhoneTransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
      />
    </div>
  );
}
