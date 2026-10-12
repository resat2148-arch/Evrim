// Kuşbakışı arena: karanlık alan mikroskobu görüntüsü.

import React from "react";
import { random } from "remotion";
import type { Day } from "../data.ts";
import type { CellView, FoodView, WorldView } from "../scene.ts";
import { ARENA, C, CELL_VIS, FONT_DISPLAY, FONT_MONO, FOOD_VIS_R } from "../theme.ts";
import { Cell } from "./Cell.tsx";
import { World, WorldDefs } from "./World.tsx";

const Bokeh: React.FC<{ frame: number }> = ({ frame }) => {
  const S = ARENA.size;
  return (
    <g>
      {Array.from({ length: 14 }, (_, i) => {
        const x = (random(`bx${i}`) * S + frame * (random(`bvx${i}`) - 0.5) * 0.25 + S) % S;
        const y = (random(`by${i}`) * S + frame * (random(`bvy${i}`) - 0.5) * 0.25 + S) % S;
        const r = 40 + random(`br${i}`) * 110;
        return <circle key={i} cx={x} cy={y} r={r} fill="url(#bokeh)" opacity={0.25 + random(`bo${i}`) * 0.35} />;
      })}
      {Array.from({ length: 46 }, (_, i) => {
        // küçük partiküller: Brown hareketi gibi titrer
        const x = random(`dx${i}`) * S + Math.sin(frame * 0.07 + i) * 1.6 + Math.sin(frame * 0.013 + i * 3) * 6;
        const y = random(`dy${i}`) * S + Math.cos(frame * 0.06 + i * 2) * 1.6 + Math.cos(frame * 0.011 + i) * 6;
        return <circle key={`d${i}`} cx={x} cy={y} r={0.8 + random(`dr${i}`) * 1.4} fill="rgba(190,235,220,0.28)" />;
      })}
    </g>
  );
};

const Food: React.FC<{ f: FoodView; px: number; frame: number }> = ({ f, px, frame }) => {
  const r = FOOD_VIS_R * px * f.scale;
  if (r < 0.5) return null;
  const jx = Math.sin(frame * 0.09 + f.id * 1.7) * 0.6;
  const jy = Math.cos(frame * 0.08 + f.id * 2.3) * 0.6;
  return (
    <g transform={`translate(${f.x * px + jx} ${f.y * px + jy})`}>
      <circle r={r * 2.1} fill="url(#foodGlow)" />
      <circle r={r} fill="url(#food)" stroke="rgba(205,255,160,0.85)" strokeWidth={1.2} />
      <circle cx={-r * 0.3} cy={-r * 0.3} r={r * 0.28} fill="rgba(235,255,210,0.7)" />
    </g>
  );
};

export const Arena: React.FC<{
  day: Day;
  cells: CellView[];
  food: FoodView[];
  frame: number;
  step: number;
  heroVisible: number; // 0..1
  focus?: { id: number; alpha: number } | null; // altyazıda adı geçen hücre
  focusColony?: { id: number; alpha: number; label: string } | null; // altyazıda adı geçen koloni
  world: WorldView;
  dim?: number;
}> = ({ day, cells, food, frame, step, heroVisible, focus, focusColony, world, dim = 0 }) => {
  const S = ARENA.size;
  // Duvara değen hücreler kesilmesin: dünya, kenarlardan PAD kadar içeride çizilir
  const PAD = 44;
  const px = (S - 2 * PAD) / day.rec.arena.width;
  const baseR = day.rec.base.radius * CELL_VIS * px;
  const hero = day.hero ? cells.find((c) => c.k.id === day.hero!.id && c.lyse === 0) : undefined;
  const scaleBar = 10 * px;
  const focused = focus ? cells.find((c) => c.k.id === focus.id && c.lyse === 0) : undefined;

  return (
    <div style={{ position: "absolute", left: ARENA.x, top: ARENA.y, width: S, height: S, borderRadius: 46, overflow: "hidden", boxShadow: `0 0 0 4px #17322c, 0 0 80px rgba(60,160,140,0.18)` }}>
      <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ display: "block" }}>
        <defs>
          <WorldDefs />
          <radialGradient id="field" cx="50%" cy="48%" r="70%">
            <stop offset="0%" stopColor="#0f2a26" />
            <stop offset="60%" stopColor="#081a17" />
            <stop offset="100%" stopColor="#020807" />
          </radialGradient>
          <radialGradient id="bokeh">
            <stop offset="0%" stopColor="rgba(120,200,180,0.10)" />
            <stop offset="70%" stopColor="rgba(120,200,180,0.05)" />
            <stop offset="100%" stopColor="rgba(120,200,180,0)" />
          </radialGradient>
          <radialGradient id="food" cx="40%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#b9f28a" />
            <stop offset="55%" stopColor="#5fb53a" />
            <stop offset="100%" stopColor="#2f6e1d" />
          </radialGradient>
          <radialGradient id="foodGlow">
            <stop offset="0%" stopColor="rgba(150,230,100,0.35)" />
            <stop offset="100%" stopColor="rgba(150,230,100,0)" />
          </radialGradient>
          <radialGradient id="vignette" cx="50%" cy="50%" r="72%">
            <stop offset="55%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.72)" />
          </radialGradient>
        </defs>
        <rect width={S} height={S} fill="url(#field)" />
        <Bokeh frame={frame} />
        <g transform={`translate(${PAD} ${PAD})`}>
        <World world={world} px={px} size={S - 2 * PAD} frame={frame} colonyRadius={day.rec.env.colonyRadius} />
        {food.map((f) => (
          <Food key={f.id} f={f} px={px} frame={frame} />
        ))}
        {cells.map((c) => (
          <Cell key={`${c.k.id}`} view={c} px={px} radius={baseR * c.k.genes.size} frame={frame} />
        ))}
        {hero && heroVisible > 0 && (
          <g transform={`translate(${hero.x * px} ${hero.y * px})`} opacity={heroVisible}>
            <circle
              r={baseR * hero.k.genes.size * hero.scale + 22}
              fill="none"
              stroke={C.amber}
              strokeWidth={4}
              strokeDasharray="14 10"
              transform={`rotate(${frame * 1.5})`}
            />
            {/* etiket: üst kenara yakınsa halkanın altına */}
            <g transform={`translate(${Math.max(110 - PAD - hero.x * px, Math.min(S - PAD - 110 - hero.x * px, 0))} ${(hero.y * px + PAD < 110 ? 1 : -1) * (baseR * hero.k.genes.size + 46) + (hero.y * px + PAD < 110 ? 10 : 0)})`}>
              <rect x={-92} y={-30} width={184} height={50} rx={25} fill="rgba(10,20,18,0.82)" stroke={C.amber} strokeWidth={2.5} />
              <text y={6} textAnchor="middle" fill={C.amber} style={{ font: `800 32px "${FONT_DISPLAY}"` }}>
                {hero.k.name}
              </text>
            </g>
          </g>
        )}
        {(() => {
          const fc = focusColony ? world.colonies.find((c) => c.id === focusColony.id) : undefined;
          if (!fc || !focusColony) return null;
          const rr = day.rec.env.colonyRadius * px * 1.05 + 4 * Math.sin(frame / 4);
          const top = fc.y * px + PAD < 130;
          return (
            <g transform={`translate(${fc.x * px} ${fc.y * px})`} opacity={focusColony.alpha}>
              <circle r={rr} fill="none" stroke={C.green} strokeWidth={4} strokeDasharray="10 8" />
              <g transform={`translate(${Math.max(130 - PAD - fc.x * px, Math.min(S - PAD - 130 - fc.x * px, 0))} ${top ? rr + 40 : -(rr + 22)})`}>
                <rect x={-120} y={-28} width={240} height={46} rx={23} fill="rgba(10,20,18,0.85)" stroke={C.green} strokeWidth={2.5} />
                <text y={6} textAnchor="middle" fill={C.green} style={{ font: `800 27px "${FONT_DISPLAY}"` }}>
                  {focusColony.label}
                </text>
              </g>
            </g>
          );
        })()}
        {focused && focus && (
          <g transform={`translate(${focused.x * px} ${focused.y * px})`} opacity={focus.alpha}>
            <circle r={baseR * focused.k.genes.size * focused.scale + 20 + 4 * Math.sin(frame / 4)} fill="none" stroke="#ffffff" strokeWidth={4} />
            <g transform={`translate(${Math.max(80 - PAD - focused.x * px, Math.min(S - PAD - 80 - focused.x * px, 0))} ${(focused.y * px + PAD < 110 ? 1 : -1) * (baseR * focused.k.genes.size + 44) + (focused.y * px + PAD < 110 ? 10 : 0)})`}>
              <rect x={-62} y={-28} width={124} height={46} rx={23} fill="rgba(10,20,18,0.85)" stroke="#ffffff" strokeWidth={2.5} />
              <text y={6} textAnchor="middle" fill="#ffffff" style={{ font: `800 28px "${FONT_DISPLAY}"` }}>
                #{focused.k.id}
              </text>
            </g>
          </g>
        )}
        </g>
        <rect width={S} height={S} fill="url(#vignette)" />
        {dim > 0 && <rect width={S} height={S} fill={`rgba(2,8,7,${dim})`} />}
        {/* ölçek çubuğu ve kayıt bilgisi */}
        <g opacity={0.85}>
          <rect x={44} y={S - 58} width={scaleBar} height={7} rx={3.5} fill="rgba(235,245,240,0.85)" />
          <text x={44} y={S - 70} fill="rgba(235,245,240,0.85)" style={{ font: `500 24px "${FONT_MONO}"` }}>
            10 µm
          </text>
          <text x={S - 44} y={S - 52} textAnchor="end" fill="rgba(235,245,240,0.6)" style={{ font: `500 22px "${FONT_MONO}"` }}>
            seed {day.rec.seed} · Schritt {String(Math.floor(step)).padStart(4, "0")}
          </text>
        </g>
      </svg>
    </div>
  );
};
