"use client";

import { useState } from "react";

import { WalletButton } from "@/components/wallet/WalletButton";
import { StreamLineMark } from "@/components/landing/StreamLineMark";
import type { StreamRequestParams } from "@/lib/request-link";
import { ScanIconButton } from "./PhoneHeaderActions";
import { ProActionButtons, ProTitleWithDemo } from "@/components/app/pro/ProHeaderExtras";
import { PhoneLauncher } from "./PhoneLauncher";
import { PhoneUserApp } from "./PhoneUserApp";
import { PhoneProApp } from "./PhoneProApp";
import { PhoneScanView } from "./PhoneScanView";
import { PhoneFulfillRequestView } from "./PhoneFulfillRequestView";
import type { PhoneAppRoute } from "./types";

type PhoneAppShellProps = {
  route: PhoneAppRoute;
  onNavigate: (route: PhoneAppRoute) => void;
};

export function PhoneAppShell({ route, onNavigate }: PhoneAppShellProps) {
  const isPro = route === "pro";
  const isScan = route === "scan";
  const isFulfill = route === "fulfill";
  const inWorkspace = route !== "launcher" && !isScan && !isFulfill;
  const [scanReturnRoute, setScanReturnRoute] = useState<PhoneAppRoute>("user");
  const [pendingRequest, setPendingRequest] = useState<StreamRequestParams | null>(
    null
  );

  const openScan = () => {
    setScanReturnRoute(route === "launcher" ? "launcher" : route);
    onNavigate("scan");
  };

  const handleScanResult = (request: StreamRequestParams) => {
    setPendingRequest(request);
    onNavigate("fulfill");
  };

  const clearRequest = () => {
    setPendingRequest(null);
    onNavigate("user");
  };

  return (
    <>
      <div className="flex shrink-0 items-center justify-between">
        {isScan ? (
          <button
            type="button"
            onClick={() => onNavigate(scanReturnRoute)}
            className="flex min-w-0 cursor-pointer items-center gap-2 text-left"
            aria-label="Back"
          >
            <StreamLineMark size="sm" variant="default" />
            <span className="truncate text-sm font-bold tracking-tight text-[#111]">
              Scan
            </span>
          </button>
        ) : isFulfill ? (
          <button
            type="button"
            onClick={clearRequest}
            className="flex min-w-0 cursor-pointer items-center gap-2 text-left"
            aria-label="Back"
          >
            <StreamLineMark size="sm" variant="default" />
            <span className="truncate text-sm font-bold tracking-tight text-[#111]">
              Review
            </span>
          </button>
        ) : inWorkspace ? (
          <button
            type="button"
            onClick={() => onNavigate("launcher")}
            className="flex min-w-0 cursor-pointer items-center gap-2 text-left"
            aria-label="Back to apps"
          >
            <StreamLineMark size="sm" variant={isPro ? "pro" : "default"} />
            {isPro ? (
              <ProTitleWithDemo compact />
            ) : (
              <span className="truncate text-sm font-bold tracking-tight text-[#111]">
                StreamLine
              </span>
            )}
          </button>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <StreamLineMark size="sm" variant="default" />
            <span className="truncate text-sm font-bold tracking-tight text-[#111]">
              StreamLine
            </span>
          </div>
        )}
        <div className="flex shrink-0 items-center gap-1.5">
          {!isScan && !isFulfill && (
            <ScanIconButton pro={isPro} onClick={openScan} />
          )}
          <WalletButton
            variant="profile"
            showFaucetInMenu={!isPro}
            profilePro={isPro}
          />
        </div>
      </div>

      {isPro && inWorkspace && (
        <div className="mt-2 shrink-0">
          <ProActionButtons compact />
        </div>
      )}

      <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
        {route === "launcher" && <PhoneLauncher onOpen={onNavigate} />}
        {route === "user" && <PhoneUserApp />}
        {route === "pro" && <PhoneProApp />}
        {route === "scan" && (
          <PhoneScanView
            onResult={handleScanResult}
            onCancel={() => onNavigate(scanReturnRoute)}
          />
        )}
        {route === "fulfill" && pendingRequest && (
          <PhoneFulfillRequestView
            request={pendingRequest}
            onAccepted={clearRequest}
            onDecline={clearRequest}
          />
        )}
        {route === "fulfill" && !pendingRequest && (
          <div className="flex flex-1 items-center justify-center px-4 text-center text-[11px] text-[#888]">
            No request to review.
          </div>
        )}
      </div>
    </>
  );
}
