// Krümel'lerin yaşadığı dünya: besinli toprak, çürüyen bedenler ve alg kolonileri.
// Koloniler küçük yeşil alg hücrelerinden oluşan kümeler olarak çizilir; biyokütle
// azaldıkça (otlanma) dıştaki hücreler kaybolur, büyüdükçe yenileri eklenir.

import React from "react";
import { random } from "remotion";
import type { ColonyView, WorldView } from "../scene.ts";

export const WorldDefs: React.FC = () => (
  <>
    <filter id="soilBlur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="34" />
    </filter>
    <radialGradient id="algae" cx="38%" cy="36%" r="70%">
      <stop offset="0%" stopColor="#d6ffb0" />
      <stop offset="45%" stopColor="#7fd35a" />
      <stop offset="100%" stopColor="#2f7a2a" />
    </radialGradient>
    <radialGradient id="algaeDead" cx="38%" cy="36%" r="70%">
      <stop offset="0%" stopColor="#d8c9a0" />
      <stop offset="100%" stopColor="#6b5a3a" />
    </radialGradient>
    <radialGradient id="colonyHalo">
      <stop offset="0%" stopColor="rgba(130,230,110,0.16)" />
      <stop offset="100%" stopColor="rgba(130,230,110,0)" />
    </radialGradient>
  </>
);

const Colony: React.FC<{ c: ColonyView; px: number; frame: number; radius: number }> = ({ c, px, frame, radius }) => {
  const total = Math.max(0, Math.min(30, 3 + c.biomass * 9));
  const visible = total * c.sprout;
  const n = Math.ceil(visible);
  const spacing = 9.5;
  const cells = [];
  for (let i = 0; i < n; i++) {
    const partial = i === n - 1 ? visible - i : 1; // en dıştaki hücre kısmen
    const a = i * 2.39996 + c.id * 1.3;
    const d = spacing * Math.sqrt(i + 0.5);
    const wob = Math.sin(frame * 0.05 + i * 1.7 + c.id) * 1.2;
    const r = (6.5 + random(`al${c.id}-${i}`) * 3) * (0.4 + 0.6 * Math.min(1, partial));
    cells.push(
      <g key={i} transform={`translate(${Math.cos(a) * d + wob} ${Math.sin(a) * d - wob})`} opacity={Math.min(1, partial * 1.5)}>
        <circle r={r} fill={c.wither > 0.3 ? "url(#algaeDead)" : "url(#algae)"} stroke={c.wither > 0.3 ? "rgba(220,200,160,0.6)" : "rgba(210,255,170,0.75)"} strokeWidth={1.2} />
        <circle cx={-r * 0.3} cy={-r * 0.3} r={r * 0.25} fill="rgba(240,255,225,0.55)" />
      </g>,
    );
  }
  return (
    <g transform={`translate(${c.x * px} ${c.y * px})`} opacity={c.alpha}>
      <circle r={radius * px * (0.6 + 0.4 * c.sprout) * Math.min(1.2, 0.5 + c.biomass * 0.35)} fill="url(#colonyHalo)" />
      {cells}
    </g>
  );
};

export const World: React.FC<{ world: WorldView; px: number; size: number; frame: number; colonyRadius: number }> = ({ world, px, size, frame, colonyRadius }) => {
  const G = world.grid;
  const tile = size / G;
  return (
    <g>
      {/* besinli toprak: verimli yerler sıcak, zeytin rengi lekeler */}
      <g filter="url(#soilBlur)">
        {world.nutrients.map((v, idx) => {
          const a = Math.max(0, Math.min(1.3, v) - 0.2) * 0.5; // verimli yer belirgin, fakir yer karanlık
          if (a < 0.02) return null;
          return <circle key={idx} cx={((idx % G) + 0.5) * tile} cy={(Math.floor(idx / G) + 0.5) * tile} r={tile * 0.62} fill={`rgba(150,150,70,${a.toFixed(3)})`} />;
        })}
        {world.deposits.map((d, i) => (
          <circle key={`d${i}`} cx={d.x * px} cy={d.y * px} r={20 + 60 * d.t} fill={`rgba(170,105,60,${(0.55 * (1 - d.t * 0.7)).toFixed(3)})`} />
        ))}
      </g>
      {world.colonies.map((c) => (
        <Colony key={c.id} c={c} px={px} frame={frame} radius={colonyRadius} />
      ))}
    </g>
  );
};
