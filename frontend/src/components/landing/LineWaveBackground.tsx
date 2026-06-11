"use client";

import { useEffect, useRef } from "react";
import type { SceneTheme } from "./heroScenes";

type LineWaveBackgroundProps = {
  theme?: SceneTheme;
};

type LinePalette = {
  bg: string;
  strokeRgb: string;
  alphaMin: number;
  alphaMax: number;
  waveScale: number;
  lineWidth: number;
  lineSpacing: number;
};

const PALETTES: Record<SceneTheme, LinePalette> = {
  light: {
    bg: "#ffffff",
    strokeRgb: "0, 0, 0",
    alphaMin: 0.09,
    alphaMax: 0.26,
    waveScale: 16,
    lineWidth: 0.6,
    lineSpacing: 2,
  },
  pro: {
    bg: "#0a0a0a",
    strokeRgb: "255, 255, 255",
    alphaMin: 0.1,
    alphaMax: 0.28,
    waveScale: 16,
    lineWidth: 0.6,
    lineSpacing: 2,
  },
};

const MAX_DPR = 2;

class WaveLine {
  baseX = 0;
  phase = 0;
  x = 0;

  constructor(baseX: number, phase: number) {
    this.baseX = baseX;
    this.phase = phase;
  }

  update(counter: number, waveScale: number) {
    this.x = this.baseX + Math.sin(counter + this.phase) * waveScale;
  }

  /** Smooth flowing opacity — no hard on/off bands. */
  opacity(counter: number, palette: LinePalette, viewW: number, viewH: number) {
    const wave = 0.5 + 0.5 * Math.sin(counter * 0.9 + this.phase);
    const alongField = 0.5 + 0.5 * Math.sin(this.baseX * 0.004 + counter * 0.35);
    const centerBias =
      0.82 +
      0.18 * (1 - Math.abs(this.baseX / Math.max(viewW, 1) - 0.5) * 1.2);
    const vertical =
      0.55 +
      0.45 * Math.sin((this.phase + counter * 0.25) * 0.6 + viewH * 0.0004);

    const blend = wave * 0.45 + alongField * 0.35 + vertical * 0.2;
    const alpha =
      palette.alphaMin +
      (palette.alphaMax - palette.alphaMin) * blend * centerBias;

    return Math.min(palette.alphaMax, Math.max(palette.alphaMin, alpha));
  }
}

export function LineWaveBackground({ theme = "light" }: LineWaveBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const palette = PALETTES[theme];
  const isPro = theme === "pro";

  useEffect(() => {
    const container = containerRef.current;
    const canvasHost = canvasHostRef.current;
    if (!container || !canvasHost) return;

    const canvas = document.createElement("canvas");
    canvas.className = "h-full w-full";
    canvasHost.appendChild(canvas);

    const context = canvas.getContext("2d");
    if (!context) return;

    const fps = 120;
    const fpsInterval = 1000 / fps;
    let then = Date.now();
    let counter = 0;
    let raf = 0;
    let lines: WaveLine[] = [];
    let viewW = 0;
    let viewH = 0;

    const buildLines = (width: number) => {
      const count = Math.ceil(width / palette.lineSpacing) + 2;
      lines = Array.from({ length: count }, (_, i) => {
        return new WaveLine(i * palette.lineSpacing, i * 0.016);
      });
    };

    const applyVerticalFade = () => {
      context.save();
      context.globalCompositeOperation = "destination-in";
      const fade = context.createLinearGradient(0, 0, 0, viewH);
      fade.addColorStop(0, "rgba(0,0,0,0)");
      fade.addColorStop(0.08, "rgba(0,0,0,0.72)");
      fade.addColorStop(0.5, "rgba(0,0,0,1)");
      fade.addColorStop(0.92, "rgba(0,0,0,0.72)");
      fade.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = fade;
      context.fillRect(0, 0, viewW, viewH);
      context.restore();
    };

    const render = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.lineCap = "butt";
      context.lineWidth = palette.lineWidth;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const t = counter + i * 0.0008;
        line.update(t, palette.waveScale);

        const alpha = line.opacity(t, palette, viewW, viewH);
        context.strokeStyle = `rgba(${palette.strokeRgb}, ${alpha})`;

        context.beginPath();
        context.moveTo(line.x, 0);
        context.lineTo(line.x, viewH);
        context.stroke();
      }

      applyVerticalFade();
      counter += 0.0035;
    };

    const loop = () => {
      raf = window.requestAnimationFrame(loop);

      const now = Date.now();
      if (now - then > fpsInterval) {
        render();
        then = now;
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      viewW = container.clientWidth;
      viewH = container.clientHeight;

      canvas.width = Math.round(viewW * dpr);
      canvas.height = Math.round(viewH * dpr);
      canvas.style.width = `${viewW}px`;
      canvas.style.height = `${viewH}px`;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildLines(viewW);
      counter = 0;
    };

    resize();
    loop();

    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      if (canvas.parentNode === canvasHost) {
        canvasHost.removeChild(canvas);
      }
    };
  }, [
    palette.alphaMax,
    palette.alphaMin,
    palette.bg,
    palette.lineSpacing,
    palette.lineWidth,
    palette.strokeRgb,
    palette.waveScale,
  ]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden transition-colors duration-700"
      style={{ backgroundColor: palette.bg }}
      aria-hidden
    >
      <div ref={canvasHostRef} className="absolute inset-0" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: isPro
            ? "linear-gradient(145deg, rgba(255,255,255,0.04) 0%, transparent 42%, transparent 58%, rgba(255,255,255,0.025) 100%)"
            : "linear-gradient(145deg, rgba(0,0,0,0.025) 0%, transparent 42%, transparent 58%, rgba(0,0,0,0.02) 100%)",
        }}
      />
    </div>
  );
}
