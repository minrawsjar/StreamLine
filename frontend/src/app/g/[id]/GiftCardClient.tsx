"use client";

import { useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

import { StreamLineMark } from "@/components/landing/StreamLineMark";
import { PhoneClaimGiftCardView } from "@/components/app/phone/PhoneClaimGiftCardView";
import {
  blindingFromHex,
  type GiftCardParams,
} from "@/lib/giftcard";

export default function GiftCardClient() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();

  const gift = useMemo((): GiftCardParams | null => {
    const rawId = params.id ?? "";
    const id = rawId.startsWith("0x") ? rawId : `0x${rawId}`;
    if (!/^0x[0-9a-fA-F]{64}$/.test(id)) return null;
    const s = (search.get("s") ?? "").replace(/^0x/i, "");
    if (!/^[0-9a-fA-F]{64}$/.test(s)) return null;
    const vRaw = search.get("v") ?? "";
    if (!/^\d+$/.test(vRaw)) return null;
    const amountBase = BigInt(vRaw);
    if (amountBase <= 0n) return null;
    const blinding = blindingFromHex(search.get("r") ?? "");
    if (blinding === null) return null;
    return {
      cardId: id.toLowerCase(),
      secretHex: s.toLowerCase(),
      amountBase,
      blinding,
    };
  }, [params.id, search]);

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-[#f6f6f4] px-4 pb-8 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <StreamLineMark size="sm" />
          <span className="text-sm font-bold tracking-tight text-[#111]">
            StreamLine
          </span>
        </Link>
        <Link
          href="/app/user"
          className="text-[11px] font-medium text-[#666] hover:text-[#111]"
        >
          Open app
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-[1.5rem] border border-black/8 bg-white/90 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
        {gift ? (
          <PhoneClaimGiftCardView gift={gift} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
            <p className="text-sm font-semibold text-[#111]">Invalid gift card</p>
            <p className="mt-2 text-[12px] leading-relaxed text-[#666]">
              This URL is missing a valid card id, secret, or opening. Ask the
              sender for a fresh link.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
