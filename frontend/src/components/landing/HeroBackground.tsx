import type { SceneTheme } from "./heroScenes";

type HeroBackgroundProps = {
  theme?: SceneTheme;
};

export function HeroBackground({ theme = "light" }: HeroBackgroundProps) {
  const isPro = theme === "pro";

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden transition-colors duration-700 ${
        isPro ? "bg-[#0a0a0a]" : "bg-white"
      }`}
      aria-hidden
    >
      {!isPro && (
        <>
          <svg
            className="absolute -left-[10%] top-1/2 h-[140%] w-[120%] -translate-y-1/2 opacity-[0.55] transition-opacity duration-700"
            viewBox="0 0 800 1200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M-40 920 C120 780, 200 640, 280 520 C360 400, 420 300, 520 200 C580 140, 660 80, 760 20"
              stroke="url(#sl-vein-a)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M-20 980 C140 860, 240 720, 340 580 C420 460, 500 360, 600 260 C680 180, 740 120, 820 60"
              stroke="url(#sl-vein-b)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M60 1040 C200 900, 300 760, 400 620 C480 500, 560 400, 680 300 C760 220, 820 160, 880 100"
              stroke="url(#sl-vein-a)"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="sl-vein-a" x1="0" y1="0" x2="800" y2="1200">
                <stop offset="0%" stopColor="#1a9e8f" stopOpacity="0.15" />
                <stop offset="45%" stopColor="#1a9e8f" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#0d6e63" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="sl-vein-b" x1="0" y1="1200" x2="800" y2="0">
                <stop offset="0%" stopColor="#2bb8a8" stopOpacity="0.1" />
                <stop offset="50%" stopColor="#1a9e8f" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#0d6e63" stopOpacity="0.15" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 bg-gradient-to-b from-white via-white/80 to-[#f4faf9]" />
        </>
      )}

      {isPro && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.04),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,rgba(26,158,143,0.06),transparent_45%)]" />
          <svg
            className="absolute inset-0 h-full w-full opacity-[0.07]"
            viewBox="0 0 800 800"
            fill="none"
          >
            <path
              d="M0 400 H800 M400 0 V800"
              stroke="white"
              strokeWidth="0.5"
            />
            {Array.from({ length: 9 }).map((_, i) => (
              <path
                key={i}
                d={`M0 ${i * 100} H800`}
                stroke="white"
                strokeWidth="0.3"
              />
            ))}
          </svg>
        </>
      )}
    </div>
  );
}
