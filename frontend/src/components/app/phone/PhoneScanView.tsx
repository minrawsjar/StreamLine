"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

import { parseStreamRequestLink, type StreamRequestParams } from "@/lib/request-link";
import { PhoneField, phoneInputClass } from "./PhoneFormParts";

type PhoneScanViewProps = {
  onResult: (request: StreamRequestParams) => void;
};

export function PhoneScanView({ onResult }: PhoneScanViewProps) {
  const scannerId = useId().replace(/:/g, "");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [manualLink, setManualLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
    } catch {
      /* ignore stop races */
    }
    try {
      scanner.clear();
    } catch {
      /* ignore */
    }
  }, []);

  const handleDecoded = useCallback(
    (text: string) => {
      const parsed = parseStreamRequestLink(text);
      if (!parsed) {
        setError("Not a valid StreamLine request link.");
        return;
      }
      void stopScanner();
      setError(null);
      onResult(parsed);
    },
    [onResult, stopScanner]
  );

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        const scanner = new Html5Qrcode(scannerId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 160, height: 160 } },
          (decoded) => {
            if (!cancelled) handleDecoded(decoded);
          },
          () => {}
        );
        if (!cancelled) setCameraError(null);
      } catch {
        if (!cancelled) {
          setCameraError("Camera unavailable. Paste the link below instead.");
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [scannerId, handleDecoded, stopScanner]);

  const onManualSubmit = () => {
    const parsed = parseStreamRequestLink(manualLink);
    if (!parsed) {
      setError("Paste a full StreamLine request link.");
      return;
    }
    setError(null);
    void stopScanner();
    onResult(parsed);
  };

  return (
    <div className="sl-scrollbar-hidden flex min-h-0 flex-1 flex-col overflow-y-auto px-1 pb-4 pt-6">
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-[#111]">
            Scan request
          </h2>
          <p className="mt-1 text-[12px] leading-snug text-[#666]">
            Point at a QR code or paste the link to fund a stream.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-black/12">
          <div
            id={scannerId}
            className="mx-auto min-h-[168px] max-h-[180px] w-full max-w-[240px] [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover"
          />
          {cameraError && (
            <p className="border-t border-black/8 px-3 py-2 text-center text-[10px] text-[#777]">
              {cameraError}
            </p>
          )}
        </div>

        <PhoneField label="Or paste link">
          <input
            value={manualLink}
            onChange={(e) => {
              setManualLink(e.target.value);
              if (error) setError(null);
            }}
            placeholder="https://…/app?recipient=0x…"
            className={`${phoneInputClass} bg-transparent`}
          />
        </PhoneField>

        {error && <p className="text-[11px] text-[#c0533a]">{error}</p>}

        <button
          type="button"
          onClick={onManualSubmit}
          disabled={!manualLink.trim()}
          className="mt-2 w-full rounded-2xl bg-[#111] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white disabled:opacity-40"
        >
          Use link
        </button>
      </div>
    </div>
  );
}
