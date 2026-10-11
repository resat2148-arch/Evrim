// Üst bilgi çubuğu ve anlatım altyazıları.

import React from "react";
import { interpolate, spring } from "remotion";
import type { Caption } from "../narrative.ts";
import { C, FONT_DISPLAY, FONT_MONO, FPS } from "../theme.ts";

export const Header: React.FC<{ day: number; gen: number; gens: number; opacity: number }> = ({ day, gen, gens, opacity }) => (
  <div style={{ position: "absolute", left: 40, right: 40, top: 78, display: "flex", alignItems: "center", gap: 22, opacity }}>
    <div style={{ background: C.amber, color: "#1a1206", font: `800 40px "${FONT_DISPLAY}"`, padding: "4px 22px 8px", borderRadius: 16, letterSpacing: 1 }}>TAG {day}</div>
    <div style={{ color: C.ink, font: `600 30px "${FONT_MONO}"` }}>
      Generation {gen + 1}/{gens}
    </div>
    <div style={{ display: "flex", gap: 9 }}>
      {Array.from({ length: gens }, (_, i) => (
        <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: i < gen ? C.amber : i === gen ? C.ink : "rgba(243,239,228,0.18)" }} />
      ))}
    </div>
  </div>
);

/** *vurgu* işaretli metni renkli parçalara böler */
export function Rich({ text, tone }: { text: string; tone?: Caption["tone"] }) {
  const color = tone === "red" ? C.red : tone === "green" ? C.green : C.amber;
  return (
    <>
      {text.split("*").map((part, i) =>
        i % 2 ? (
          <span key={i} style={{ color }}>
            {part}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}

export const Captions: React.FC<{ caption: Caption | null; sinceStart: number; untilEnd: number }> = ({ caption, sinceStart, untilEnd }) => {
  if (!caption) return null;
  const inP = spring({ frame: sinceStart, fps: FPS, config: { damping: 18, stiffness: 160 } });
  const out = interpolate(untilEnd, [0, 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 168, height: 220, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", opacity: inP * out, transform: `translateY(${(1 - inP) * 24}px)` }}>
      <div style={{ color: C.ink, font: `800 66px/1.08 "${FONT_DISPLAY}"`, textWrap: "balance", textShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>
        <Rich text={caption.text} tone={caption.tone} />
      </div>
      {caption.sub && <div style={{ marginTop: 14, color: C.inkDim, font: `600 36px "${FONT_MONO}"` }}>{caption.sub}</div>}
    </div>
  );
};
