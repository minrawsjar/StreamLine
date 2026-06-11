import type { SceneTheme } from "./heroScenes";
import { LineWaveBackground } from "./LineWaveBackground";

type HeroBackgroundProps = {
  theme?: SceneTheme;
};

export function HeroBackground({ theme = "light" }: HeroBackgroundProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <LineWaveBackground theme={theme} />
    </div>
  );
}
