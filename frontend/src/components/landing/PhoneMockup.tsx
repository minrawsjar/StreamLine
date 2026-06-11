"use client";

import { StreamLineMark } from "./StreamLineMark";
import { StoreSoonBadges } from "./StoreSoonBadges";
import { PhoneAppShell } from "@/components/app/phone/PhoneAppShell";
import type { PhoneAppRoute } from "@/components/app/phone/types";
import type { PhoneScene, SceneTheme } from "./heroScenes";

const STATES = ["LOCKED", "PENDING", "DRIPPING", "PAUSED", "DONE"];

/** iPhone 15 proportions: 393 × 852 pt → screen aspect 9:19.5 */
const SCREEN_ASPECT = "9 / 19.5";

type PhoneMockupProps = {
  scene: PhoneScene;
  sceneProgress?: number;
  transitioning?: boolean;
  theme?: SceneTheme;
  compact?: boolean;
  phoneApp?: PhoneAppRoute | null;
  onPhoneAppChange?: (route: PhoneAppRoute) => void;
  onCloseApp?: () => void;
  onLaunchApp?: () => void;
};

function PhoneWallpaper() {
  return (
    <>
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: `radial-gradient(circle at 70% 30%, rgba(0,0,0,0.12) 0%, transparent 50%),
            radial-gradient(circle at 20% 80%, rgba(0,0,0,0.08) 0%, transparent 40%)`,
        }}
      />
      <svg
        className="absolute inset-0 h-full w-full opacity-30"
        viewBox="0 0 393 852"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <path
          d="M-20 720 C100 600, 180 480, 260 360 C320 260, 380 160, 460 60"
          stroke="#111"
          strokeWidth="2"
        />
        <path
          d="M40 780 C160 660, 240 540, 320 420 C380 320, 440 220, 520 120"
          stroke="#111"
          strokeWidth="1.5"
        />
      </svg>
    </>
  );
}

function PhoneHeader({ pro = false }: { pro?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <StreamLineMark size="sm" variant={pro ? "pro" : "default"} />
      <span
        className={`text-sm font-semibold tracking-tight ${
          pro
            ? "font-[family-name:var(--font-inter)] text-white"
            : "font-bold text-[#111]"
        }`}
      >
        streamline{pro && <span className="text-white/40">.pro</span>}
      </span>
    </div>
  );
}

function DashboardScreen() {
  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col justify-center gap-3">
      <div className="rounded-2xl border border-white/60 bg-white/75 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)] backdrop-blur-md">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#888]">
          Earned today
        </p>
        <p className="mt-1.5 text-[1.85rem] font-bold tabular leading-none text-[#111]">
          $142.50
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/8">
          <div className="h-full w-[68%] rounded-full bg-[#111]" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
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
          <p className="mt-0.5 text-sm font-bold text-[#111]">42s</p>
        </div>
      </div>
    </div>
  );
}

function DripScreen({ progress }: { progress: number }) {
  const amount = (142.5 + progress * 12.3).toFixed(2);
  return (
    <div className="mt-6 flex min-h-0 flex-1 flex-col items-center justify-center text-center">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-black/10" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-black/25 bg-white/80 backdrop-blur-md">
          <span className="text-2xl">↓</span>
        </div>
      </div>
      <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/50">
        Incoming drip
      </p>
      <p className="mt-2 text-[2rem] font-bold tabular leading-none text-[#111]">
        +${amount}
      </p>
      <p className="mt-3 max-w-[200px] text-xs font-medium leading-snug text-[#555]">
        Lands in your wallet. No signature. No gas.
      </p>
    </div>
  );
}

function StatesScreen({ progress }: { progress: number }) {
  const active = Math.min(
    STATES.length - 1,
    Math.floor(progress * STATES.length)
  );
  return (
    <div className="mt-6 flex min-h-0 flex-1 flex-col">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#888]">
        State machine
      </p>
      <div className="mt-4 space-y-2">
        {STATES.map((s, i) => (
          <div
            key={s}
            className={`rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all duration-500 ${
              i === active
                ? "bg-[#111] text-white shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
                : i < active
                  ? "bg-black/10 text-[#111]"
                  : "bg-white/60 text-[#aaa]"
            }`}
          >
            {s}
          </div>
        ))}
      </div>
      <p className="mt-auto pt-4 text-xs font-medium leading-snug text-[#555]">
        {active === 2
          ? "Funds dripping every 60s"
          : active === 4
            ? "Stream complete"
            : "Enforced on-chain by Move"}
      </p>
    </div>
  );
}

function StatsScreen() {
  const stats = [
    { v: "$0.00", l: "per drip" },
    { v: "≤60s", l: "settlement" },
    { v: "5", l: "states" },
    { v: "1 bps", l: "keeper tip" },
  ];
  return (
    <div className="mt-6 flex min-h-0 flex-1 flex-col">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#888]">
        On-chain facts
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {stats.map((s) => (
          <div
            key={s.l}
            className="rounded-xl border border-white/50 bg-white/70 p-3.5 backdrop-blur-md"
          >
            <p className="text-lg font-bold tabular text-[#111]">{s.v}</p>
            <p className="text-[9px] font-medium uppercase tracking-wider text-[#888]">
              {s.l}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl bg-[#111] px-3.5 py-3">
        <p className="text-[9px] font-medium uppercase tracking-wider text-white/50">
          Primitives
        </p>
        <p className="mt-1 text-[11px] font-medium leading-relaxed text-white/80">
          Address Balances · PTBs · zkLogin · Move
        </p>
      </div>
      <p className="mt-auto pt-4 text-xl font-bold leading-tight text-[#111]">
        Only on Sui.
      </p>
    </div>
  );
}

function ProScreen({ progress }: { progress: number }) {
  const paid = Math.floor(248500 + progress * 12500).toLocaleString();
  return (
    <div className="mt-6 flex min-h-0 flex-1 flex-col font-[family-name:var(--font-inter)]">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">
        Payroll run · Q2
      </p>
      <p className="mt-2 text-[1.75rem] font-semibold tabular leading-none tracking-tight text-white">
        ${paid}
      </p>
      <p className="mt-1 text-[11px] text-white/45">42 contractors · 6 departments</p>

      <div className="mt-5 space-y-2">
        {[
          { name: "Engineering", amt: "$84,200", status: "Dripping" },
          { name: "Design", amt: "$31,500", status: "Approved" },
          { name: "Operations", amt: "$18,900", status: "Pending" },
        ].map((row) => (
          <div
            key={row.name}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5"
          >
            <div>
              <p className="text-[11px] font-medium text-white/80">{row.name}</p>
              <p className="text-[10px] text-white/35">{row.status}</p>
            </div>
            <p className="text-xs font-semibold tabular text-white/70">{row.amt}</p>
          </div>
        ))}
      </div>

      <div className="mt-auto rounded-lg border border-white/10 bg-white/5 px-3 py-3">
        <p className="text-[9px] uppercase tracking-wider text-white/35">
          Next disbursement
        </p>
        <p className="mt-0.5 text-sm font-medium text-white/80">Friday · 09:00 UTC</p>
      </div>
    </div>
  );
}

function ProWallpaper() {
  return (
    <div className="absolute inset-0 bg-[#111]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.06),transparent_50%)]" />
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: "repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 24px), repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 24px)",
      }} />
    </div>
  );
}

function LaunchScreen({ onLaunchApp }: { onLaunchApp?: () => void }) {
  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col items-center justify-center text-center">
      <StreamLineMark size="lg" className="!h-12 !w-12 !text-xl" />
      <h2 className="mt-5 text-lg font-bold leading-tight tracking-tight text-[#111]">
        Mobile apps
        <br />
        coming soon.
      </h2>
      <p className="mt-2 max-w-[220px] text-[11px] font-medium text-[#555]">
        Scan to download — available on iOS &amp; Android shortly.
      </p>
      <StoreSoonBadges className="mt-5" size="sm" />
      <button
        type="button"
        onClick={onLaunchApp}
        className="sl-glass-btn sl-glass-btn-primary mt-5 !px-5 !py-2.5 !text-[10px]"
      >
        Use web app →
      </button>
    </div>
  );
}

function PhoneScreenContent({
  scene,
  sceneProgress,
  onLaunchApp,
}: {
  scene: PhoneScene;
  sceneProgress: number;
  onLaunchApp?: () => void;
}) {
  switch (scene) {
    case "dashboard":
      return <DashboardScreen />;
    case "drip":
      return <DripScreen progress={sceneProgress} />;
    case "states":
      return <StatesScreen progress={sceneProgress} />;
    case "stats":
      return <StatsScreen />;
    case "pro":
      return <ProScreen progress={sceneProgress} />;
    case "launch":
      return <LaunchScreen onLaunchApp={onLaunchApp} />;
  }
}

export function PhoneMockup({
  scene,
  sceneProgress = 0,
  transitioning = false,
  theme = "light",
  compact = false,
  phoneApp = null,
  onPhoneAppChange,
  onCloseApp,
  onLaunchApp,
}: PhoneMockupProps) {
  const inApp = phoneApp !== null;
  const isPro =
    phoneApp === "pro" || (!inApp && (theme === "pro" || scene === "pro"));

  return (
    <div
      className={`relative mx-auto transition-all duration-700 ${
        compact
          ? "w-[min(72vw,260px)]"
          : "w-[min(88vw,300px)] sm:w-[320px] lg:w-[340px]"
      }`}
    >
      <div className="sl-levitate relative">
        <div
          className={`sl-levitate-glow absolute inset-x-4 top-6 bottom-6 rounded-[3.25rem] blur-3xl transition-colors duration-700 ${
            isPro ? "bg-white/8" : "bg-black/8"
          }`}
        />

        <div
          className={`relative rounded-[3rem] border-[3.5px] p-[11px] shadow-[0_48px_96px_rgba(0,0,0,0.2)] transition-colors duration-700 ${
            isPro
              ? "border-[#333] bg-[#1a1a1a]"
              : "border-[#1a1a1a] bg-[#1a1a1a]"
          }`}
        >
        <div className="absolute left-1/2 top-[18px] z-20 h-[26px] w-[96px] -translate-x-1/2 rounded-full bg-[#0a0a0a]" />

        <div
          className={`relative w-full overflow-hidden rounded-[2.4rem] transition-colors duration-700 ${
            isPro ? "bg-[#111]" : "bg-white"
          }`}
          style={{ aspectRatio: SCREEN_ASPECT }}
        >
          {isPro ? <ProWallpaper /> : <PhoneWallpaper />}

          <div
            className={`absolute inset-0 z-10 flex flex-col px-6 pb-8 pt-14 transition-all duration-[420ms] ease-out ${
              transitioning && !inApp
                ? "scale-[0.97] opacity-0"
                : "scale-100 opacity-100"
            }`}
          >
            {inApp && phoneApp && onPhoneAppChange ? (
              <PhoneAppShell
                route={phoneApp}
                onNavigate={onPhoneAppChange}
              />
            ) : (
              <>
                <PhoneHeader pro={isPro} />
                <PhoneScreenContent
                  scene={scene}
                  sceneProgress={sceneProgress}
                  onLaunchApp={onLaunchApp}
                />
              </>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
