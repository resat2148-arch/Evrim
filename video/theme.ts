import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const W = 1080;
export const H = 1920;
export const FPS = 30;

/** Mikroskop alanı (arena) ekranda nerede */
export const ARENA = { x: 40, y: 400, size: 1000 };
/** Hücreleri simülasyondaki çarpışma yarıçapından büyük çiz (detay görünsün) */
export const CELL_VIS = 2.6;
export const FOOD_VIS_R = 1.0; // dünya birimi

export const C = {
  bg: "#030b0a",
  bg2: "#071614",
  ink: "#f3efe4",
  inkDim: "rgba(243,239,228,0.62)",
  amber: "#f2b347",
  red: "#ff6b5e",
  green: "#9be36a",
  panel: "rgba(14,32,29,0.78)",
  line: "rgba(160,220,200,0.16)",
};

export const FONT_DISPLAY = "Bricolage Grotesque";
export const FONT_MONO = "IBM Plex Mono";

let loaded: Promise<unknown> | null = null;
export function loadFonts() {
  loaded ??= Promise.all([
    loadFont({ family: FONT_DISPLAY, url: staticFile("fonts/bricolage-grotesque-latin-700-normal.woff2"), weight: "700" }),
    loadFont({ family: FONT_DISPLAY, url: staticFile("fonts/bricolage-grotesque-latin-800-normal.woff2"), weight: "800" }),
    loadFont({ family: FONT_MONO, url: staticFile("fonts/ibm-plex-mono-latin-500-normal.woff2"), weight: "500" }),
    loadFont({ family: FONT_MONO, url: staticFile("fonts/ibm-plex-mono-latin-600-normal.woff2"), weight: "600" }),
  ]);
  return loaded;
}

/** Hız geni → renk tonu: orijinal = altın, hızlı → macenta, yavaş → camgöbeği */
export function speedHue(speed: number): number {
  const t = Math.max(-1, Math.min(1, (speed - 1) / 0.4));
  const h = t >= 0 ? 42 - t * 72 : 42 + -t * 150;
  return (h + 360) % 360;
}

/** Almanca sayı biçimi (1,09) */
export const de = (v: number, d = 2) => v.toFixed(d).replace(".", ",");
