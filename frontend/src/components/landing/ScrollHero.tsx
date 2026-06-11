"use client";

import Link from "next/link";
import { HeroNav } from "./HeroNav";
import { HeroBackground } from "./HeroBackground";
import { PhoneMockup } from "./PhoneMockup";
import { SceneTextPanel } from "./SceneTextPanel";
import { StoreSoonBadges } from "./StoreSoonBadges";
import { HERO_SCENES, SCENE_COUNT } from "./heroScenes";
import { useSceneNavigation } from "./useSceneNavigation";

export function ScrollHero() {
  const { activeIndex, sceneProgress, transitioning, goTo } = useSceneNavigation();
  const scene = HERO_SCENES[activeIndex];
  const textVisible = !transitioning;
  const isLast = activeIndex === SCENE_COUNT - 1;
  const isPro = scene.theme === "pro";

  return (
    <div
      className={`fixed inset-0 flex h-[100dvh] w-full flex-col overflow-hidden transition-colors duration-700 ${
        isPro ? "bg-[#0a0a0a]" : "bg-white"
      }`}
    >
      <HeroBackground theme={scene.theme} />
      <HeroNav onSceneSelect={goTo} theme={scene.theme} />

      {/* Desktop: fixed 3-column grid — text slots always same size */}
      <div className="relative z-10 mx-auto hidden w-full max-w-[1440px] flex-1 items-center px-[5%] lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-12">
        <div className="relative flex h-[320px] items-center justify-end">
          {HERO_SCENES.map((s, i) => (
            <div
              key={s.id}
              className={`absolute inset-0 flex items-center justify-end ${
                i === activeIndex ? "z-10" : "z-0 pointer-events-none"
              }`}
            >
              {i === activeIndex && (
                <SceneTextPanel
                  side="left"
                  content={s.left}
                  theme={s.theme}
                  visible={textVisible}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center">
          <PhoneMockup
            scene={scene.phone}
            sceneProgress={sceneProgress}
            transitioning={transitioning}
            theme={scene.theme}
          />
        </div>

        <div className="relative flex h-[320px] items-center justify-start">
          {HERO_SCENES.map((s, i) => (
            <div
              key={s.id}
              className={`absolute inset-0 flex items-center justify-start ${
                i === activeIndex ? "z-10" : "z-0 pointer-events-none"
              }`}
            >
              {i === activeIndex && (
                <SceneTextPanel
                  side="right"
                  content={s.right}
                  theme={s.theme}
                  visible={textVisible}
                  showLaunchCta={i === SCENE_COUNT - 1}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-[5%] lg:hidden">
        <PhoneMockup
          scene={scene.phone}
          sceneProgress={sceneProgress}
          transitioning={transitioning}
          theme={scene.theme}
          compact
        />
        <div className="mt-5 w-full max-w-[360px]">
          <SceneTextPanel
            side="left"
            content={scene.left}
            theme={scene.theme}
            visible={textVisible}
            compact
          />
          <div className="mt-4">
            <SceneTextPanel
              side="right"
              content={scene.right}
              theme={scene.theme}
              visible={textVisible}
              compact
            />
          </div>
          {isLast && (
            <div className="mt-5 flex flex-col items-center gap-3">
              <StoreSoonBadges />
              <Link href="/app" className="sl-glass-btn sl-glass-btn-primary">
                Launch App →
              </Link>
            </div>
          )}
        </div>
      </div>

      {isLast && textVisible && (
        <button
          type="button"
          onClick={() => goTo(0)}
          className="sl-glass-btn absolute bottom-6 right-[5%] z-30 !gap-2"
          aria-label="Start over from the beginning"
        >
          <span aria-hidden className="text-base leading-none">
            ↺
          </span>
          Start over
        </button>
      )}

      {!isLast && (
        <p
          className={`absolute bottom-6 right-[5%] z-30 hidden text-[10px] font-medium uppercase tracking-[0.2em] lg:block ${
            isPro ? "text-white/30" : "text-[#1a9e8f]/50"
          }`}
        >
          Scroll ↓
        </p>
      )}
    </div>
  );
}
