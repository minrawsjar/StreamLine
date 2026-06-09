import Link from "next/link";
import { StreamLineMark } from "./StreamLineMark";

export function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[min(100%,300px)] sm:w-[340px] lg:w-[380px] xl:w-[400px]">
      {/* Soft glow behind the device */}
      <div className="absolute inset-x-4 top-6 bottom-6 rounded-[3.5rem] bg-[#1a9e8f]/12 blur-3xl" />

      <div className="relative rounded-[3rem] border-[3.5px] border-[#1a1a1a] bg-[#1a1a1a] p-[11px] shadow-[0_48px_96px_rgba(0,0,0,0.2)]">
        {/* Dynamic island */}
        <div className="absolute left-1/2 top-[20px] z-20 h-[28px] w-[104px] -translate-x-1/2 rounded-full bg-[#0a0a0a]" />

        {/* Screen */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white">
          {/* Organic wallpaper inside screen */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `radial-gradient(circle at 70% 30%, #1a9e8f 0%, transparent 50%),
                radial-gradient(circle at 20% 80%, #0d6e63 0%, transparent 40%)`,
            }}
          />
          <svg
            className="absolute inset-0 h-full w-full opacity-40"
            viewBox="0 0 300 600"
            fill="none"
            aria-hidden
          >
            <path
              d="M-20 500 C80 400, 140 300, 200 200 C240 140, 280 80, 340 20"
              stroke="#1a9e8f"
              strokeWidth="1.5"
            />
            <path
              d="M20 540 C120 440, 180 340, 240 240 C280 180, 320 120, 380 60"
              stroke="#1a9e8f"
              strokeWidth="1"
            />
            <path
              d="M60 580 C160 480, 220 380, 280 280 C320 220, 360 160, 420 100"
              stroke="#2bb8a8"
              strokeWidth="0.8"
            />
          </svg>

          <div className="relative z-10 flex min-h-[560px] flex-col px-7 pb-9 pt-16 sm:min-h-[620px] lg:min-h-[660px]">
            {/* In-app nav */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <StreamLineMark size="sm" />
                <span className="text-sm font-bold tracking-tight text-[#111]">
                  streamline
                </span>
              </div>
              <span className="rounded-full bg-[#1a9e8f]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#1a9e8f]">
                Live
              </span>
            </div>

            {/* Mini dashboard preview */}
            <div className="mt-9 space-y-3.5">
              <div className="rounded-2xl border border-white/60 bg-white/75 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] backdrop-blur-md">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#888]">
                  Earned today
                </p>
                <p className="mt-1.5 text-[2rem] font-bold tabular leading-none text-[#111]">
                  $142.50
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e8f5f3]">
                  <div className="h-full w-[68%] rounded-full bg-[#1a9e8f]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-white/50 bg-white/65 p-3.5 backdrop-blur-md">
                  <p className="text-[9px] font-medium uppercase tracking-wider text-[#888]">
                    Milestone
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-[#111]">3 / 5</p>
                </div>
                <div className="rounded-xl border border-white/50 bg-white/65 p-3.5 backdrop-blur-md">
                  <p className="text-[9px] font-medium uppercase tracking-wider text-[#888]">
                    Next drip
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-[#1a9e8f]">42s</p>
                </div>
              </div>
            </div>

            {/* Headline on screen */}
            <div className="mt-auto">
              <h2 className="text-[clamp(1.6rem,4vw,2rem)] font-bold leading-[1.05] tracking-tight text-[#111]">
                Pay as
                <br />
                you build.
              </h2>

              <div className="mt-6 flex gap-2.5">
                <Link
                  href="/app"
                  className="sl-glass-btn sl-glass-btn-primary flex-1 !px-4 !py-2.5 !text-[11px]"
                >
                  Launch →
                </Link>
                <Link
                  href="/#how"
                  className="sl-glass-btn flex-1 !px-4 !py-2.5 !text-[11px]"
                >
                  How it works
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
