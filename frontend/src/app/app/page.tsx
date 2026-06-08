import Link from "next/link";
import { WalletButton } from "@/components/wallet/WalletButton";

export default function AppHome() {
  return (
    <main className="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-8 bg-[#f1efe9] px-6 text-center">
      <Link
        href="/"
        className="absolute left-6 top-6 text-[11px] uppercase tracking-[0.18em] text-[#2b2a5e]/60 hover:opacity-60"
      >
        ← back
      </Link>
      <p className="text-[11px] uppercase tracking-[0.24em] text-[#5b54e6]">
        StreamLine app
      </p>
      <h1 className="max-w-2xl text-[clamp(28px,5vw,52px)] font-black leading-[0.95] tracking-[-0.03em] text-[#2b2a5e]">
        Connect to create and watch streams.
      </h1>
      <p className="max-w-md text-[14px] leading-relaxed text-[#2b2a5e]/60">
        Stream creator, client dashboard, live earn counter, and collateral panel
        land here next.
      </p>
      <WalletButton />
    </main>
  );
}
