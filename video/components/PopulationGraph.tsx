// Köşede canlı çizilen nüfus grafiği (kayıttaki adım adım canlı sayısı).

import React from "react";
import type { DayRecording } from "../../sim/types.ts";
import { C, FONT_DISPLAY, FONT_MONO } from "../theme.ts";

export const PopulationGraph: React.FC<{ rec: DayRecording; step: number; alive: number; x: number; y: number; w: number; h: number }> = ({ rec, step, alive, x, y, w, h }) => {
  const pad = { l: 54, r: 18, t: 78, b: 40 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;
  const total = rec.totalSteps;
  const ymax = Math.max(35, Math.ceil((Math.max(...rec.population) + 3) / 5) * 5);
  const sx = (s: number) => pad.l + (s / (total - 1)) * cw;
  const sy = (v: number) => pad.t + (1 - v / ymax) * ch;
  const upto = Math.min(total - 1, Math.floor(step));
  let d = `M${sx(0)},${sy(rec.generations[0].popStart)}`;
  for (let s = 0; s <= upto; s += 2) d += `L${sx(s).toFixed(1)},${sy(rec.population[s]).toFixed(1)}`;
  d += `L${sx(upto).toFixed(1)},${sy(rec.population[upto]).toFixed(1)}`;
  const area = `${d}L${sx(upto)},${sy(0)}L${sx(0)},${sy(0)}Z`;
  const ticks = [0, 10, 20, 30].filter((v) => v <= ymax);

  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: C.panel, borderRadius: 28, border: `2px solid ${C.line}` }}>
      <div style={{ position: "absolute", left: 26, top: 16, color: C.inkDim, font: `600 24px "${FONT_MONO}"`, letterSpacing: 2 }}>KRÜMEL</div>
      <div style={{ position: "absolute", right: 24, top: 2, color: C.ink, font: `800 60px "${FONT_DISPLAY}"`, fontVariantNumeric: "tabular-nums" }}>{alive}</div>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={w - pad.r} y1={sy(v)} y2={sy(v)} stroke={C.line} strokeWidth={1.5} />
            <text x={pad.l - 10} y={sy(v) + 8} textAnchor="end" fill={C.inkDim} style={{ font: `500 20px "${FONT_MONO}"` }}>
              {v}
            </text>
          </g>
        ))}
        {rec.generations.map((g, i) => (
          <g key={i}>
            {i > 0 && <line x1={sx(g.startStep)} x2={sx(g.startStep)} y1={pad.t} y2={pad.t + ch} stroke={C.line} strokeDasharray="5 6" strokeWidth={1.5} />}
            <text x={sx((g.startStep + g.endStep) / 2)} y={h - 12} textAnchor="middle" fill={step >= g.startStep ? C.inkDim : "rgba(243,239,228,0.25)"} style={{ font: `500 19px "${FONT_MONO}"` }}>
              G{i + 1}
            </text>
          </g>
        ))}
        <path d={area} fill="rgba(242,179,71,0.14)" />
        <path d={d} fill="none" stroke={C.amber} strokeWidth={4} strokeLinejoin="round" />
        <circle cx={sx(upto)} cy={sy(rec.population[upto])} r={8} fill={C.amber} stroke="#1a1206" strokeWidth={3} />
      </svg>
    </div>
  );
};
