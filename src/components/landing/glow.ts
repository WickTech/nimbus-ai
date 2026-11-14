/**
 * The full-screen emerald glow behind the landing hero (and the sign-in pages): three soft radial washes over
 * the zinc-950 page, faded out at the bottom so there is no hard edge. Static CSS, no animation.
 *
 * Text drawn over the glow must be zinc-300 or lighter: zinc-400 falls under 4.5:1 where the washes overlap.
 * `__tests__/landing-glow.test.ts` computes the worst case from these numbers and fails if the glow gets
 * brighter than the text colors allow.
 */
export type GlowLayer = {
  rgb: [number, number, number];
  alpha: number;
  /** radial-gradient size, "width height". */
  shape: string;
  /** radial-gradient center, "x y". */
  at: string;
  /** Percentage where the wash has faded to nothing. */
  stop: number;
};

export const PAGE_BG = "#09090b"; // zinc-950, the page background

export const GLOW_LAYERS: GlowLayer[] = [
  // emerald-400: full-width wash from the top edge
  { rgb: [52, 211, 153], alpha: 0.16, shape: "90% 70%", at: "50% 0%", stop: 70 },
  // emerald-500: top-left key light (the old spotlight's place)
  { rgb: [16, 185, 129], alpha: 0.14, shape: "55% 60%", at: "8% 30%", stop: 72 },
  // emerald-700: fills the right and lower half
  { rgb: [4, 120, 87], alpha: 0.18, shape: "60% 65%", at: "92% 70%", stop: 72 },
];

const FADE_TO_PAGE = `linear-gradient(to bottom, rgba(9, 9, 11, 0) 82%, ${PAGE_BG} 100%)`;

/** The `background-image` value: fade on top, then the washes. End stops use rgba(...,0), never `transparent`. */
export function glowBackgroundImage(): string {
  const washes = GLOW_LAYERS.map(({ rgb: [r, g, b], alpha, shape, at, stop }) => {
    return `radial-gradient(${shape} at ${at}, rgba(${r}, ${g}, ${b}, ${alpha}), rgba(${r}, ${g}, ${b}, 0) ${stop}%)`;
  });
  return [FADE_TO_PAGE, ...washes].join(", ");
}
