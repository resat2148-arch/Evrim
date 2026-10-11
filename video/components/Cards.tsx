// DayCounter (açılış), EventCard (olay), ResultCard (gün sonucu), VoteCard (oylama).

import React from "react";
import { interpolate, spring } from "remotion";
import { ARENA, C, FONT_DISPLAY, FONT_MONO, FPS, de } from "../theme.ts";
import { Rich } from "./Hud.tsx";

const fade = (f: number, len: number, inF = 8, outF = 10) =>
  interpolate(f, [0, inF, len - outF, len], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

export const DayCounter: React.FC<{ day: number; line: string; frame: number; len: number }> = ({ day, line, frame, len }) => {
  const pop = spring({ frame, fps: FPS, config: { damping: 12, stiffness: 120 } });
  const o = fade(frame, len, 1, 12);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: o }}>
      <div style={{ color: C.inkDim, font: `600 34px "${FONT_MONO}"`, letterSpacing: 8, marginBottom: 6 }}>KRÜMEL-EVOLUTION</div>
      <div style={{ color: C.amber, font: `800 300px/0.9 "${FONT_DISPLAY}"`, transform: `scale(${0.6 + 0.4 * pop})`, textShadow: "0 10px 60px rgba(242,179,71,0.35)" }}>Tag {day}</div>
      <div style={{ marginTop: 34, color: C.ink, font: `800 58px/1.15 "${FONT_DISPLAY}"`, textAlign: "center", maxWidth: 900, opacity: interpolate(frame, [14, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        <Rich text={line} />
      </div>
    </div>
  );
};

export const EventCard: React.FC<{ title: string; frame: number; len: number }> = ({ title, frame, len }) => (
  <div style={{ position: "absolute", left: 80, right: 80, top: ARENA.y + 380, padding: "34px 40px", borderRadius: 32, background: "rgba(80,14,10,0.9)", border: `3px solid ${C.red}`, color: C.ink, textAlign: "center", font: `800 62px/1.1 "${FONT_DISPLAY}"`, opacity: fade(frame, len) }}>
    {title}
  </div>
);

export const ResultCard: React.FC<{
  day: number;
  startPop: number;
  endPop: number;
  speedEnd: number;
  mutantsAlive: number;
  heroLine: string | null;
  frame: number;
  len: number;
}> = ({ day, startPop, endPop, speedEnd, mutantsAlive, heroLine, frame, len }) => {
  const o = fade(frame, len, 8, 6);
  const pop = spring({ frame, fps: FPS, config: { damping: 14 } });
  const pct = Math.round((speedEnd - 1) * 100);
  const row = (label: string, value: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 20, font: `600 38px "${FONT_MONO}"`, color: C.ink, padding: "14px 0", borderTop: `2px solid ${C.line}` }}>
      <span style={{ color: C.inkDim }}>{label}</span>
      <span>{value}</span>
    </div>
  );
  return (
    <div style={{ position: "absolute", left: ARENA.x + 60, width: ARENA.size - 120, top: ARENA.y + 150, padding: "40px 48px 26px", borderRadius: 36, background: "rgba(6,18,16,0.9)", border: `3px solid ${C.amber}`, opacity: o, transform: `scale(${0.92 + 0.08 * pop})` }}>
      <div style={{ color: C.amber, font: `800 40px "${FONT_DISPLAY}"` }}>Ergebnis Tag {day}</div>
      <div style={{ color: C.ink, font: `800 150px/1 "${FONT_DISPLAY}"`, margin: "10px 0 6px" }}>
        {startPop} → {endPop}
      </div>
      <div style={{ color: C.inkDim, font: `600 34px "${FONT_MONO}"`, marginBottom: 20 }}>Krümel nach 5 Generationen</div>
      {row("⌀ Tempo", `${de(1)} → ${de(speedEnd)} (${pct >= 0 ? "+" : ""}${pct} %)`)}
      {row("Mutanten am Leben", `${mutantsAlive} von ${endPop}`)}
      {heroLine && row("Gerhard", heroLine)}
    </div>
  );
};

const Claw = () => (
  <svg width="120" height="120" viewBox="0 0 120 120">
    {[0, 1, 2].map((i) => (
      <path key={i} d={`M${30 + i * 24},18 C${20 + i * 24},50 ${26 + i * 24},80 ${46 + i * 24},104`} fill="none" stroke={C.red} strokeWidth="11" strokeLinecap="round" />
    ))}
  </svg>
);
const Flake = () => (
  <svg width="120" height="120" viewBox="-60 -60 120 120">
    {[0, 60, 120].map((a) => (
      <g key={a} transform={`rotate(${a})`} stroke="#8fd8ff" strokeWidth="9" strokeLinecap="round">
        <line x1="0" y1="-48" x2="0" y2="48" />
        <line x1="0" y1="-30" x2="-14" y2="-44" />
        <line x1="0" y1="-30" x2="14" y2="-44" />
        <line x1="0" y1="30" x2="-14" y2="44" />
        <line x1="0" y1="30" x2="14" y2="44" />
      </g>
    ))}
  </svg>
);

export const VoteCard: React.FC<{ nextDay: number; frame: number; len: number }> = ({ nextDay, frame, len }) => {
  const o = fade(frame, len, 8, 1);
  const a = spring({ frame: frame - 6, fps: FPS, config: { damping: 13 } });
  const b = spring({ frame: frame - 12, fps: FPS, config: { damping: 13 } });
  const pulse = 1 + 0.03 * Math.sin(frame / 4);
  const tile = (label: string, color: string, icon: React.ReactNode, s: number) => (
    <div style={{ flex: 1, borderRadius: 34, padding: "34px 10px 30px", background: "rgba(6,18,16,0.92)", border: `4px solid ${color}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, transform: `scale(${s * pulse})` }}>
      {icon}
      <div style={{ color, font: `800 64px "${FONT_DISPLAY}"` }}>{label}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", left: ARENA.x + 40, width: ARENA.size - 80, top: ARENA.y + 120, opacity: o, display: "flex", flexDirection: "column", alignItems: "center", gap: 34 }}>
      <div style={{ color: C.ink, font: `800 76px/1.05 "${FONT_DISPLAY}"`, textAlign: "center" }}>
        Was passiert an <span style={{ color: C.amber }}>Tag {nextDay}</span>?
      </div>
      <div style={{ display: "flex", gap: 30, width: "100%", alignItems: "center" }}>
        {tile("Raubtier", C.red, <Claw />, a)}
        <div style={{ color: C.inkDim, font: `800 44px "${FONT_DISPLAY}"` }}>oder</div>
        {tile("Eiszeit", "#8fd8ff", <Flake />, b)}
      </div>
      <div style={{ color: C.ink, font: `800 54px/1.15 "${FONT_DISPLAY}"`, textAlign: "center" }}>
        Ihr entscheidet!
        <div style={{ color: C.inkDim, font: `600 34px "${FONT_MONO}"`, marginTop: 10 }}>Schreibt es in die Kommentare</div>
      </div>
    </div>
  );
};
