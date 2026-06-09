"use client";

import Link from "next/link";
import { WalletButton } from "@/components/wallet/WalletButton";
import { StreamLineMark } from "./StreamLineMark";

export function HeroNav() {
  return (
    <nav className="relative z-20 flex items-center justify-between px-[5%] py-6">
      <Link href="/#top" className="flex items-center gap-3">
        <StreamLineMark size="md" />
        <span className="text-lg font-semibold tracking-tight text-[#111]">
          StreamLine
        </span>
      </Link>

      <ul className="flex list-none items-center gap-2.5">
        <li className="hidden min-[419px]:block">
          <Link href="/#how" className="sl-glass-btn">
            How it works
          </Link>
        </li>
        <li className="hidden md:block">
          <WalletButton className="sl-glass-btn" />
        </li>
        <li>
          <Link href="/app" className="sl-glass-btn sl-glass-btn-primary">
            Launch App
          </Link>
        </li>
      </ul>
    </nav>
  );
}
