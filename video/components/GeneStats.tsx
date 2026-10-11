// Ortalama hız / boyut / görüş çubukları (o an yaşayan hücrelerin ortalaması).

import React from "react";
import type { CellView } from "../scene.ts";
import { C, FONT_MONO, de, speedHue } from "../theme.ts";

const ROWS: { key: "speed" | "size" | "sense"; label: string }[] = [
  { key: "speed", label: "Tempo" },
  { key: "size", label: "Größe" },
  { key: "sense", label: "Sicht" },
];

export const GeneStats: React.FC<{ cells: CellView[]; x: number; y: number; w: number; h: number }> = ({ cells, x, y, w, h }) => {
  const live = cells.filter((c) => c.lyse === 0);
  const mean = (k: "speed" | "size" | "sense") => (live.length ? live.reduce((s, c) => s + c.k.genes[k], 0) / live.length : 1);
  const barW = w - 52;
  const lo = 0.85;
  const hi = 1.15;
  const toX = (v: number) => (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * barW;

  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: C.panel, borderRadius: 28, border: `2px solid ${C.line}`, padding: "16px 26px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ color: C.inkDim, font: `600 24px "${FONT_MONO}"`, letterSpacing: 2 }}>⌀ GENE</div>
      {ROWS.map(({ key, label }) => {
        const v = mean(key);
        const col = key === "speed" ? `hsl(${speedHue(v)},85%,66%)` : key === "sense" ? "#ff7a5c" : "#9fd8c8";
        return (
          <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: C.ink, font: `600 26px "${FONT_MONO}"` }}>
              <span>{label}</span>
              <span style={{ fontVariantNumeric: "tabular-nums", color: Math.abs(v - 1) > 0.005 ? col : C.ink }}>
                {v > 1.005 ? "▲ " : v < 0.995 ? "▼ " : ""}
                {de(v)}
              </span>
            </div>
            <div style={{ position: "relative", height: 12, borderRadius: 6, background: "rgba(243,239,228,0.1)" }}>
              <div style={{ position: "absolute", left: Math.min(toX(1), toX(v)), width: Math.max(3, Math.abs(toX(v) - toX(1))), top: 0, bottom: 0, borderRadius: 6, background: col }} />
              <div style={{ position: "absolute", left: toX(1) - 1.5, width: 3, top: -5, bottom: -5, background: C.ink, opacity: 0.7 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
