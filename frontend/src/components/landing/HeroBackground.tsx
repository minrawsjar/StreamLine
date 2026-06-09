/** Organic mesh motif — echoes the translucent vein structure behind the phone mockup. */
export function HeroBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <svg
        className="absolute -left-[10%] top-1/2 h-[140%] w-[120%] -translate-y-1/2 opacity-[0.55]"
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
        <path
          d="M200 1100 C320 980, 420 840, 520 700 C600 580, 680 480, 780 380 C840 320, 900 260, 960 200"
          stroke="url(#sl-vein-b)"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M320 80 C400 200, 460 320, 520 440 C580 560, 640 680, 700 800 C740 880, 780 960, 820 1040"
          stroke="url(#sl-vein-a)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M400 40 C480 160, 540 280, 600 400 C660 520, 720 640, 780 760 C820 840, 860 920, 900 1000"
          stroke="url(#sl-vein-b)"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <circle cx="520" cy="200" r="4" fill="#1a9e8f" opacity="0.6" />
        <circle cx="600" cy="260" r="3" fill="#1a9e8f" opacity="0.45" />
        <circle cx="680" cy="300" r="5" fill="#1a9e8f" opacity="0.5" />
        <circle cx="400" cy="620" r="3" fill="#1a9e8f" opacity="0.4" />
        <circle cx="780" cy="380" r="4" fill="#1a9e8f" opacity="0.55" />
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
    </div>
  );
}
