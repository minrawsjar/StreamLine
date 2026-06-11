"use client";

import { useEffect, useState } from "react";

import { QRCodeSVG } from "qrcode.react";

import { StreamLineMark } from "./StreamLineMark";
import { PhoneAppShell } from "@/components/app/phone/PhoneAppShell";
import type { PhoneAppRoute } from "@/components/app/phone/types";
import type { PhoneScene, SceneTheme } from "./heroScenes";

const FLOW_STEPS = ["LOCK", "DRIP", "DONE"];

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
    <div
      className="absolute inset-0 opacity-40"
      style={{
        backgroundImage: `radial-gradient(circle at 70% 30%, rgba(0,0,0,0.08) 0%, transparent 50%),
          radial-gradient(circle at 20% 80%, rgba(0,0,0,0.05) 0%, transparent 40%)`,
      }}
    />
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

const DASHBOARD_BASE_EARNED = 142.5;
const DASHBOARD_EARN_PER_SEC = 0.5;

const BACK_CARD_LAYERS = [
  { tone: "bg-white/38 border-white/30", inset: "mx-4", top: 6 },
  { tone: "bg-white/50 border-white/42", inset: "mx-2", top: 20 },
] as const;

function DashboardScreen() {
  const [earned, setEarned] = useState(DASHBOARD_BASE_EARNED);

  useEffect(() => {
    const id = window.setInterval(() => {
      setEarned((prev) => prev + DASHBOARD_EARN_PER_SEC);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const formatted = earned.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="mt-1 flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative mx-0.5">
        {BACK_CARD_LAYERS.map((layer, i) => (
          <div
            key={i}
            className={`absolute inset-x-0 ${layer.inset}`}
            style={{ top: `${layer.top}px`, zIndex: i + 1 }}
            aria-hidden
          >
            <div
              className={`h-[88px] rounded-2xl border shadow-[0_4px_16px_rgba(0,0,0,0.04)] backdrop-blur-md ${layer.tone}`}
            />
          </div>
        ))}

        <div className="relative z-10 mt-[46px] rounded-2xl border border-white/70 bg-white/88 p-4 shadow-[0_10px_32px_rgba(0,0,0,0.1)] backdrop-blur-md">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#888]">
            Video Editing Gig
          </p>
          <p className="mt-1.5 text-[1.85rem] font-bold tabular-nums leading-none text-[#111]">
            {formatted}
          </p>
          <p className="mt-2 text-[11px] font-medium leading-snug text-[#555]">
            +$0.50/sec · Milestone 3 of 5
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/8">
            <div className="h-full w-[68%] rounded-full bg-[#111]" />
          </div>
        </div>
      </div>

      <div className="mt-auto grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-white/50 bg-white/65 p-2.5 backdrop-blur-md">
          <p className="text-[8px] font-medium uppercase tracking-wider text-[#888]">
            Split
          </p>
          <p className="mt-0.5 text-[11px] font-bold text-[#111]">70 / 30</p>
          <p className="mt-0.5 text-[8px] text-[#888]">wallet · yield</p>
        </div>
        <div className="rounded-xl border border-white/50 bg-white/65 p-2.5 backdrop-blur-md">
          <p className="text-[8px] font-medium uppercase tracking-wider text-[#888]">
            Next drip
          </p>
          <p className="mt-0.5 text-[11px] font-bold text-[#111]">~90s</p>
          <p className="mt-0.5 text-[8px] text-[#888]">gasless</p>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-white/50 bg-white/65 p-2 backdrop-blur-md">
          <p className="text-[8px] font-medium uppercase tracking-wider text-[#888]">
            Share
          </p>
          <QRCodeSVG
            value="https://streamline.app/gig/video-editing"
            size={44}
            level="M"
            marginSize={0}
            bgColor="#ffffff"
            fgColor="#111111"
            className="mt-1 rounded-sm"
            title="Share gig QR code"
          />
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
        In your wallet. No invoice. No gas. No claim button.
      </p>
    </div>
  );
}

function StatesScreen({ progress }: { progress: number }) {
  const active = Math.min(
    FLOW_STEPS.length - 1,
    Math.floor(progress * FLOW_STEPS.length)
  );
  return (
    <div className="mt-6 flex min-h-0 flex-1 flex-col">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#888]">
        Three steps
      </p>
      <div className="mt-4 space-y-2">
        {FLOW_STEPS.map((s, i) => (
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
            {i + 1}. {s}
          </div>
        ))}
      </div>
      <p className="mt-auto pt-4 text-xs font-medium leading-snug text-[#555]">
        {active === 1
          ? "USDC dripping while you work"
          : active === 2
            ? "All milestones complete"
            : "Full amount locked upfront"}
      </p>
    </div>
  );
}

function StatsScreen() {
  const stats = [
    { v: "$0.00", l: "transfer fee" },
    { v: "~90s", l: "drip interval" },
    { v: "48h", l: "auto-approve" },
    { v: "Private", l: "by default" },
  ];
  return (
    <div className="mt-6 flex min-h-0 flex-1 flex-col">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#888]">
        The numbers
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {stats.map((s) => (
          <div
            key={s.l}
            className="rounded-xl border border-white/50 bg-white/70 p-3.5 backdrop-blur-md"
          >
            <p className="text-base font-bold leading-tight text-[#111]">{s.v}</p>
            <p className="mt-1 text-[9px] font-medium uppercase tracking-wider text-[#888]">
              {s.l}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl bg-[#111] px-3.5 py-3">
        <p className="text-[9px] font-medium uppercase tracking-wider text-white/50">
          No wallet needed
        </p>
        <p className="mt-1 text-[11px] font-medium leading-relaxed text-white/80">
          Sign in with Google via zkLogin — free to start
        </p>
      </div>
      <p className="mt-auto pt-4 text-xl font-bold leading-tight text-[#111]">
        Free. Gasless. Private.
      </p>
    </div>
  );
}

function FinanceScreen({ progress }: { progress: number }) {
  const borrowed = Math.floor(890 + progress * 110);
  const yieldEarned = (12.4 + progress * 4.2).toFixed(2);
  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col justify-center gap-3">
      <div className="rounded-2xl border border-white/60 bg-white/75 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)] backdrop-blur-md">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#888]">
          Locked balance
        </p>
        <p className="mt-1.5 text-[1.65rem] font-bold tabular leading-none text-[#111]">
          $4,000
        </p>
        <p className="mt-2 text-[11px] font-medium text-[#555]">
          +${yieldEarned} yield in Scallop · 18 days left
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-white/50 bg-white/65 p-3.5 backdrop-blur-md">
          <p className="text-[9px] font-medium uppercase tracking-wider text-[#888]">
            Split
          </p>
          <p className="mt-0.5 text-sm font-bold text-[#111]">60 / 30 / 10</p>
          <p className="mt-0.5 text-[9px] text-[#888]">spend · yield · save</p>
        </div>
        <div className="rounded-xl border border-white/50 bg-white/65 p-3.5 backdrop-blur-md">
          <p className="text-[9px] font-medium uppercase tracking-wider text-[#888]">
            Borrowed
          </p>
          <p className="mt-0.5 text-sm font-bold tabular text-[#111]">${borrowed}</p>
          <p className="mt-0.5 text-[9px] text-[#888]">auto-repaying</p>
        </div>
      </div>
      <p className="text-center text-[11px] font-medium leading-snug text-[#555]">
        Idle money earns. Active streams collateralize.
      </p>
    </div>
  );
}

function ProScreen({ progress }: { progress: number }) {
  const paid = Math.floor(248500 + progress * 12500).toLocaleString();
  return (
    <div className="mt-6 flex min-h-0 flex-1 flex-col font-[family-name:var(--font-inter)]">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">
        Pay run · Q2 contractors
      </p>
      <p className="mt-2 text-[1.75rem] font-semibold tabular leading-none tracking-tight text-white">
        ${paid}
      </p>
      <p className="mt-1 text-[11px] text-white/45">
        42 payees · 6 departments · streaming
      </p>

      <div className="mt-5 space-y-2">
        {[
          { name: "Engineering", amt: "$84,200", status: "Dripping" },
          { name: "Design", amt: "$31,500", status: "Awaiting milestone" },
          { name: "Operations", amt: "$18,900", status: "Pay run scheduled" },
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
        <p className="mt-0.5 text-sm font-medium text-white/80">
          Friday · 09:00 UTC · auto
        </p>
      </div>
    </div>
  );
}

function ProWallpaper() {
  return (
    <div className="absolute inset-0 bg-[#111]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.06),transparent_50%)]" />
    </div>
  );
}

function LaunchScreen({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 text-center">
      <h2
        className={`font-bold tracking-[-0.045em] text-[#111] ${
          compact
            ? "text-[2.45rem] leading-[0.95]"
            : "text-[clamp(2.75rem,5.8vw,3.65rem)] leading-[0.92]"
        }`}
      >
        Money Streams
        <br />
        {" "}
        <span className="sl-shiny animate-shiny">Soon on Sui</span>
      </h2>
    </div>
  );
}

function PhoneScreenContent({
  scene,
  sceneProgress,
  onLaunchApp,
  compact = false,
}: {
  scene: PhoneScene;
  sceneProgress: number;
  onLaunchApp?: () => void;
  compact?: boolean;
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
    case "finance":
      return <FinanceScreen progress={sceneProgress} />;
    case "pro":
      return <ProScreen progress={sceneProgress} />;
    case "launch":
      return <LaunchScreen compact={compact} />;
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
  const isLaunchScene = scene === "launch" && !inApp;
  const isPro =
    phoneApp === "pro" || (!inApp && (theme === "pro" || scene === "pro"));
  const useDarkGlass = isPro;

  const shell = (
    <>
        <div
          className={`sl-levitate-glow absolute inset-x-4 top-6 bottom-6 rounded-[3.25rem] blur-3xl transition-colors duration-700 ${
            useDarkGlass ? "bg-white/8" : "bg-black/8"
          }`}
        />

        <div
          className={`relative rounded-[3rem] p-[11px] shadow-[0_48px_96px_rgba(0,0,0,0.2)] transition-colors duration-700 ${
            useDarkGlass
              ? "liquid-glass border border-white/10 bg-[#0e1014]/90 backdrop-blur-2xl"
              : "liquid-glass liquid-glass-light border border-black/[0.08] backdrop-blur-2xl"
          }`}
        >
        <div
          className={`absolute left-1/2 top-[18px] z-20 flex h-[26px] w-[96px] -translate-x-1/2 items-center justify-center gap-2.5 rounded-full ${
            useDarkGlass ? "liquid-glass-notch" : "liquid-glass-notch-light"
          }`}
        >
          <span
            className={`h-[7px] w-[7px] rounded-full ${
              useDarkGlass
                ? "bg-black/70 ring-1 ring-white/25"
                : "bg-black/50 ring-1 ring-black/10"
            }`}
            aria-hidden
          />
          <span
            className={`h-2 w-2 rounded-full ${
              useDarkGlass ? "bg-white/15" : "bg-black/8"
            }`}
            aria-hidden
          />
        </div>

        <div
          className={`relative w-full overflow-hidden rounded-[2.4rem] transition-colors duration-700 ${
            useDarkGlass ? "bg-[#111]" : "bg-white"
          }`}
          style={{ aspectRatio: SCREEN_ASPECT }}
        >
          {useDarkGlass ? <ProWallpaper /> : <PhoneWallpaper />}

          <div
            className={`absolute inset-0 z-10 flex flex-col px-6 pb-8 transition-all duration-[420ms] ease-out ${
              isLaunchScene ? "justify-center pt-12" : "pt-14"
            } ${
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
                {!isLaunchScene && <PhoneHeader pro={useDarkGlass} />}
                <PhoneScreenContent
                  scene={scene}
                  sceneProgress={sceneProgress}
                  onLaunchApp={onLaunchApp}
                  compact={compact}
                />
              </>
            )}
          </div>
        </div>
        </div>
    </>
  );

  return (
    <div
      className={`relative mx-auto transition-all duration-700 ${
        compact
          ? "w-[min(72vw,260px)]"
          : "w-[min(88vw,300px)] sm:w-[320px] lg:w-[340px]"
      }`}
    >
      <div className="sl-levitate relative">{shell}</div>
    </div>
  );
}
