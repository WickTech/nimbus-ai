import { describe, expect, it } from "vitest";
import { GLOW_LAYERS, glowBackgroundImage, PAGE_BG } from "../src/components/landing/glow";

type Rgb = [number, number, number];

const hex = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
const over = (base: Rgb, top: Rgb, alpha: number): Rgb => base.map((c, i) => c * (1 - alpha) + top[i] * alpha) as Rgb;

function luminance([r, g, b]: Rgb): number {
  const lin = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Worst case: every wash at full strength at the same point. It never happens on screen (the washes peak in
// different places), so any text that passes here passes everywhere.
const worst = GLOW_LAYERS.reduce<Rgb>((acc, l) => over(acc, l.rgb, l.alpha), hex(PAGE_BG));

describe("landing glow", () => {
  it("keeps body text readable on the brightest possible backdrop", () => {
    expect(contrast(hex("#d4d4d8"), worst)).toBeGreaterThanOrEqual(4.5); // zinc-300: hero lede, logo labels
    expect(contrast(hex("#e4e4e7"), worst)).toBeGreaterThanOrEqual(4.5); // zinc-200
    expect(contrast(hex("#ffffff"), worst)).toBeGreaterThanOrEqual(4.5); // headline
  });

  it("keeps the eyebrow pill (emerald-300 on emerald-500 at 15%) readable", () => {
    const pill = over(worst, hex("#10b981"), 0.15);
    expect(contrast(hex("#6ee7b7"), pill)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the large emerald headline phrase above 3:1", () => {
    expect(contrast(hex("#34d399"), worst)).toBeGreaterThanOrEqual(3);
  });

  it("documents that zinc-400 is NOT safe on the glow, so nobody puts it back", () => {
    expect(contrast(hex("#a1a1aa"), worst)).toBeLessThan(4.5);
  });

  it("never lets one wash get brighter than 20% opacity", () => {
    for (const layer of GLOW_LAYERS) expect(layer.alpha).toBeLessThanOrEqual(0.2);
  });

  it("builds a value with a fade layer, every wash, and no `transparent` keyword", () => {
    const value = glowBackgroundImage();
    expect(value).not.toContain("transparent");
    expect(value.startsWith("linear-gradient(to bottom")).toBe(true);
    expect(value.match(/radial-gradient/g)).toHaveLength(GLOW_LAYERS.length);
  });
});
