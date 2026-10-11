// Karanlık alan mikroskobunda görünen tek hücreli bir canlı.
// Genler görünür özelliklere çevrilir:
//   hız   → renk tonu + kırbaç (flagellum) uzunluğu ve çırpma hızı
//   boyut → hücre çapı
//   görüş → kırmızı göz lekesinin (stigma) büyüklüğü
// Yediği her yemek hücrenin içinde yeşil bir besin kofulu olarak görünür.

import React from "react";
import { random } from "remotion";
import { speedHue } from "../theme.ts";
import type { CellView } from "../scene.ts";

type Pt = [number, number];

function closedSmoothPath(pts: Pt[]): string {
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d + "Z";
}

function openSmoothPath(pts: Pt[]): string {
  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += `Q${pts[i][0].toFixed(2)},${pts[i][1].toFixed(2)} ${mx.toFixed(2)},${my.toFixed(2)}`;
  }
  const l = pts[pts.length - 1];
  return d + `L${l[0].toFixed(2)},${l[1].toFixed(2)}`;
}

export const Cell: React.FC<{
  view: CellView;
  px: number; // dünya birimi → piksel
  radius: number; // piksel
  frame: number;
  opacity?: number;
}> = ({ view, px, radius, frame, opacity = 1 }) => {
  const { k } = view;
  const id = k.id;
  const rnd = (salt: string) => random(`${id}-${salt}`);
  const time = frame / 30;

  const lyse = view.lyse;
  const sat = 85 * (1 - lyse * 0.95);
  const hue = speedHue(k.genes.speed);
  const r = radius * view.scale;
  const alpha = opacity * (1 - lyse) ** 1.1;
  if (alpha <= 0.01 || r <= 0.5) return null;

  // Bölünürken hücre bölünme yönünde uzar; hareket ederken hafifçe uzar
  const rot = view.divideToward ?? view.heading;
  const sx = 1 + 0.07 * view.moving + 0.42 * view.stretch;
  const sy = 1 - 0.05 * view.moving - 0.1 * view.stretch;

  // Zar: yavaş dalgalanan, hücreye özgü düzensiz kontur
  const p1 = rnd("p1") * 6.28;
  const p2 = rnd("p2") * 6.28;
  const p3 = rnd("p3") * 6.28;
  const wob = 0.035 + lyse * 0.16;
  const pts: Pt[] = [];
  const N = 30;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    let rr = 1 + wob * Math.sin(3 * a + p1 + time * 1.3) + wob * 0.7 * Math.sin(5 * a + p2 - time * 1.9);
    rr += lyse * 0.12 * Math.sin(11 * a + p3); // zar buruşur
    if (view.stretch > 0) {
      // ortadan boğumlanma (bölünme oluğu)
      rr -= 0.28 * view.stretch * Math.exp(-((Math.cos(a) * 3) ** 2)) * Math.abs(Math.sin(a));
    }
    pts.push([Math.cos(a) * r * rr * sx, Math.sin(a) * r * rr * sy]);
  }
  const body = closedSmoothPath(pts);

  // Kırbaç: arkadan çıkar, hızla çırpar; dururken yavaşça sarkar
  const L = r * (1.1 + 1.25 * k.genes.speed);
  const beatSpeed = 9 * k.genes.speed;
  const phase = time * (view.moving > 0.05 ? beatSpeed : 1.2) + p1;
  const amp = r * (0.16 + 0.12 * view.moving);
  const flag: Pt[] = [];
  for (let j = 0; j <= 14; j++) {
    const u = j / 14;
    flag.push([-r * sx * 0.92 - u * L, amp * u ** 0.9 * Math.sin(u * 2.6 * Math.PI - phase)]);
  }
  const flagPath = openSmoothPath(flag);

  const gid = `cg${id}`;
  const membrane = `hsla(${hue},${sat}%,82%,${0.9 * alpha})`;

  // Sitoplazma tanecikleri
  const granules = Array.from({ length: 9 }, (_, i) => {
    const a = rnd(`ga${i}`) * 6.28 + time * (0.15 + rnd(`gs${i}`) * 0.25);
    const d = (0.2 + rnd(`gd${i}`) * 0.5) * r * (1 + lyse * 0.9);
    return { x: Math.cos(a) * d * sx, y: Math.sin(a) * d * sy, s: 1.2 + rnd(`gr${i}`) * 1.6 };
  });

  // Besin kofulları: yediği her yemek
  const vac = Array.from({ length: Math.min(view.vacuoles, 5) }, (_, i) => {
    const a = 2.2 + i * 1.25 + rnd(`va${i}`) * 0.4;
    const d = r * 0.45;
    const isNew = i === view.vacuoles - 1 && view.lastMealAge < 8;
    const grow = isNew ? Math.min(1, view.lastMealAge / 4 + 0.3) : 1;
    return { x: Math.cos(a) * d * sx, y: Math.sin(a) * d * sy, s: r * 0.21 * grow, flash: isNew ? 1 - view.lastMealAge / 8 : 0 };
  });

  // Kasılabilir koful: arkada yavaşça atar
  const cvR = r * (0.1 + 0.06 * Math.max(0, Math.sin(time * 2.2 + p2)));
  const eye = r * 0.1 * k.genes.sense;
  const hungryDim = view.hungry ? 0.72 : 1;

  return (
    <g transform={`translate(${(view.x * px).toFixed(2)} ${(view.y * px).toFixed(2)}) rotate(${((rot * 180) / Math.PI).toFixed(2)})`} opacity={alpha}>
      <defs>
        <radialGradient id={gid} cx="45%" cy="50%" r="60%">
          <stop offset="0%" stopColor={`hsla(${hue},${sat * 0.7}%,55%,${0.16 * hungryDim})`} />
          <stop offset="62%" stopColor={`hsla(${hue},${sat}%,58%,${0.3 * hungryDim})`} />
          <stop offset="88%" stopColor={`hsla(${hue},${sat}%,70%,${0.62 * hungryDim})`} />
          <stop offset="100%" stopColor={`hsla(${hue},${sat}%,86%,0.9)`} />
        </radialGradient>
      </defs>
      {/* kırbaç */}
      <path d={flagPath} fill="none" stroke={`hsla(${hue},${sat}%,75%,0.22)`} strokeWidth={r * 0.2} strokeLinecap="round" />
      <path d={flagPath} fill="none" stroke={`hsla(${hue},${sat}%,86%,0.75)`} strokeWidth={Math.max(1.4, r * 0.07)} strokeLinecap="round" />
      {/* karanlık alan parlaması */}
      <path d={body} fill="none" stroke={`hsla(${hue},${sat}%,70%,0.16)`} strokeWidth={r * 0.45} />
      {/* gövde */}
      <path d={body} fill={`url(#${gid})`} />
      {granules.map((g, i) => (
        <circle key={i} cx={g.x} cy={g.y} r={g.s} fill={`hsla(${hue},${sat}%,88%,${0.55 * hungryDim})`} />
      ))}
      {/* çekirdek + çekirdekçik */}
      <ellipse cx={-r * 0.12 * sx} cy={r * 0.06} rx={r * 0.34} ry={r * 0.28} fill={`hsla(${hue},${sat * 0.5}%,22%,0.5)`} stroke={`hsla(${hue},${sat}%,82%,0.45)`} strokeWidth={1.4} />
      <circle cx={-r * 0.06 * sx} cy={r * 0.02} r={r * 0.09} fill={`hsla(${hue},${sat}%,84%,0.7)`} />
      {/* besin kofulları */}
      {vac.map((v, i) => (
        <g key={i}>
          {v.flash > 0 && <circle cx={v.x} cy={v.y} r={v.s * (1.6 + v.flash)} fill={`rgba(170,240,120,${0.35 * v.flash})`} />}
          <circle cx={v.x} cy={v.y} r={v.s} fill={`rgba(120,205,85,${0.85 * view.vacuoleAlpha})`} stroke={`rgba(200,255,160,${0.9 * view.vacuoleAlpha})`} strokeWidth={1.3} />
          <circle cx={v.x - v.s * 0.3} cy={v.y - v.s * 0.3} r={v.s * 0.3} fill={`rgba(225,255,200,${0.6 * view.vacuoleAlpha})`} />
        </g>
      ))}
      {/* kasılabilir koful */}
      <circle cx={-r * 0.58 * sx} cy={-r * 0.22} r={cvR} fill="rgba(220,245,255,0.08)" stroke="rgba(220,245,255,0.45)" strokeWidth={1} />
      {/* göz lekesi */}
      <circle cx={r * 0.66 * sx} cy={-r * 0.2} r={eye * 1.9} fill={`rgba(255,90,60,${0.18 * (1 - lyse)})`} />
      <circle cx={r * 0.66 * sx} cy={-r * 0.2} r={eye} fill={`rgba(255,96,64,${0.95 * (1 - lyse)})`} />
      {/* zar */}
      <path d={body} fill="none" stroke={membrane} strokeWidth={Math.max(1.6, r * 0.075)} />
    </g>
  );
};
