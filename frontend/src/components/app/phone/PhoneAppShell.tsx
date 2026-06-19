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

// The confidential accept flow (Seal + ZK proof + wallet popup) is long enough
// that an in-memory pending request can be lost to a remount. Persist it so the
// fulfill screen survives the round-trip.
const REQUEST_KEY = "sl_pending_request";

function readStoredRequest(): StreamRequestParams | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(REQUEST_KEY);
    return raw ? (JSON.parse(raw) as StreamRequestParams) : null;
  } catch {
    return null;
  }
}

export function PhoneAppShell({ route, onNavigate }: PhoneAppShellProps) {
  const isPro = route === "pro";
  const isScan = route === "scan";
  const isFulfill = route === "fulfill";
  const inWorkspace = route !== "launcher" && !isScan && !isFulfill;
  const [scanReturnRoute, setScanReturnRoute] = useState<PhoneAppRoute>("user");
  const [pendingRequest, setPendingRequestState] =
    useState<StreamRequestParams | null>(readStoredRequest);

  const setPendingRequest = (req: StreamRequestParams | null) => {
    setPendingRequestState(req);
    try {
      if (req) window.sessionStorage.setItem(REQUEST_KEY, JSON.stringify(req));
      else window.sessionStorage.removeItem(REQUEST_KEY);
    } catch {
      /* sessionStorage unavailable — in-memory state still works */
    }
  };

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
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-[12px] leading-snug text-[#666]">
              No request loaded — it may have already been funded.
            </p>
            <button
              type="button"
              onClick={openScan}
              className="w-full max-w-[220px] rounded-2xl bg-[#111] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white"
            >
              Scan a request
            </button>
            <button
              type="button"
              onClick={() => onNavigate("user")}
              className="w-full max-w-[220px] rounded-2xl border border-black/12 bg-white px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#111]"
            >
              Back to wallet
            </button>
          </div>
        )}
      </div>
    </>
  );
}
