import { glowBackgroundImage } from "./glow";

/**
 * Full-bleed emerald glow. Put it as the first child of a `relative isolate` wrapper: it fills the wrapper
 * and sits behind everything in it. Static CSS (see glow.ts for the colors and the contrast rule).
 */
export function HeroGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10"
      style={{ backgroundImage: glowBackgroundImage() }}
    />
  );
}
