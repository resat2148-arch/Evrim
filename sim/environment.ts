// Dünya: besin haritası ve alg kolonileri. Krümel'lerle karşılıklı etkileşir:
//   koloniler yemek üretir → Krümel'ler otlar → koloni küçülür/ölür
//   Krümel açlıktan ölür → bedeni toprağı gübreler → orada yeni koloni filizlenebilir
// Tüm rastgelelik simülasyonun tek RNG'sinden gelir.

import type { SimConfig } from "../sim.config.ts";
import type { Rng } from "./rng.ts";
import type { Colony, EnvGeneration, EnvState } from "./types.ts";

type World = SimConfig["world"];

export function createEnv(config: SimConfig, rng: Rng): EnvState {
  const w = config.world;
  const G = w.grid;
  const { width, height } = config.arena;
  // Pürüzsüz bir başlangıç toprağı: birkaç rastgele "verimli tepe"
  const bumps = Array.from({ length: 4 }, () => ({ x: rng.range(0, G), y: rng.range(0, G), s: rng.range(1.5, 3) }));
  const raw: number[] = [];
  for (let j = 0; j < G; j++) {
    for (let i = 0; i < G; i++) {
      let v = 0;
      for (const b of bumps) v += Math.exp(-((i + 0.5 - b.x) ** 2 + (j + 0.5 - b.y) ** 2) / (2 * b.s * b.s));
      raw.push(v);
    }
  }
  const max = Math.max(...raw);
  const nutrients = raw.map((v) => 0.15 + 0.75 * (v / max));

  const env: EnvState = { grid: G, nutrients, colonies: [], nextColonyId: 1 };
  // İlk koloniler en verimli karelerde (birbirinden uzak)
  const order = nutrients.map((n, idx) => ({ n, idx })).sort((a, b) => b.n - a.n || a.idx - b.idx);
  for (const { idx } of order) {
    if (env.colonies.length >= w.initialColonies) break;
    const cx = ((idx % G) + rng.range(0.2, 0.8)) * (width / G);
    const cy = (Math.floor(idx / G) + rng.range(0.2, 0.8)) * (height / G);
    if (env.colonies.some((c) => Math.hypot(c.x - cx, c.y - cy) < w.minDistance * 1.6)) continue;
    env.colonies.push({ id: env.nextColonyId++, x: cx, y: cy, biomass: rng.range(0.9, 1.3), bornGeneration: 0 });
  }
  return env;
}

export function tileOf(env: EnvState, config: SimConfig, x: number, y: number): number {
  const G = env.grid;
  const i = Math.max(0, Math.min(G - 1, Math.floor((x / config.arena.width) * G)));
  const j = Math.max(0, Math.min(G - 1, Math.floor((y / config.arena.height) * G)));
  return j * G + i;
}

/** Koloniden bir yemek konumu (koloni yarıçapı içinde) */
export function emitPosition(c: Colony, w: World, config: SimConfig, rng: Rng): [number, number] {
  const a = rng.range(0, Math.PI * 2);
  const d = w.colonyRadius * Math.sqrt(rng.next());
  const m = 1.5;
  return [
    Math.min(config.arena.width - m, Math.max(m, c.x + Math.cos(a) * d)),
    Math.min(config.arena.height - m, Math.max(m, c.y + Math.sin(a) * d)),
  ];
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Nesil sonu: toprak gübrelenir, koloniler büyür/çürür/ölür, yenileri filizlenir,
 * besin yenilenir ve yayılır. `startColonies` nesil başındaki koloniler (kayıt için).
 */
export function endOfGeneration(
  env: EnvState,
  config: SimConfig,
  rng: Rng,
  absoluteGen: number,
  nutrientsStart: number[],
  startColonies: Colony[],
  deaths: { x: number; y: number }[],
): EnvGeneration {
  const w = config.world;
  const G = env.grid;
  const { width, height } = config.arena;
  const tileW = width / G;
  const tileH = height / G;
  const n = env.nutrients;
  const grazed = new Map(env.colonies.map((c) => [c.id, c.biomass]));

  // 1) Ölen Krümel'ler toprağa karışır
  const fertilized = new Set<number>();
  for (const d of deaths) {
    const t = tileOf(env, config, d.x, d.y);
    n[t] += w.deathNutrient;
    fertilized.add(t);
  }

  // 2) Koloniler büyür (besin tüketerek) ve doğal olarak çürür
  for (const c of env.colonies) {
    const t = tileOf(env, config, c.x, c.y);
    let dB = w.growth * c.biomass * n[t] * (1 - c.biomass / w.maxBiomass);
    dB = Math.max(0, Math.min(dB, n[t] / w.nutrientUse));
    n[t] -= dB * w.nutrientUse;
    c.biomass += dB;
    const lost = c.biomass * w.decay;
    c.biomass -= lost;
    n[t] += lost * 0.5;
  }

  // 3) Çok zayıflayan koloniler ölür (kalanı toprağa döner)
  const died: number[] = [];
  env.colonies = env.colonies.filter((c) => {
    if (c.biomass >= w.minBiomass) return true;
    n[tileOf(env, config, c.x, c.y)] += c.biomass * 0.5;
    died.push(c.id);
    return false;
  });

  // 4) Yeni koloniler: besinli karelerde filizlenme ve büyük kolonilerden spor
  const born: EnvGeneration["colonies"] = [];
  const free = (x: number, y: number) => env.colonies.every((c) => Math.hypot(c.x - x, c.y - y) >= w.minDistance);
  const tiles = n.map((v, idx) => ({ v, idx })).sort((a, b) => b.v - a.v || a.idx - b.idx);
  for (const { v, idx } of tiles) {
    if (env.colonies.length >= w.maxColonies || v < w.sproutThreshold) break;
    const x = ((idx % G) + 0.5) * tileW;
    const y = (Math.floor(idx / G) + 0.5) * tileH;
    if (!free(x, y) || rng.next() >= w.sproutChance) continue;
    const c: Colony = { id: env.nextColonyId++, x: x + rng.range(-1, 1), y: y + rng.range(-1, 1), biomass: w.sproutBiomass, bornGeneration: absoluteGen + 1 };
    n[idx] -= w.sproutBiomass * w.nutrientUse;
    env.colonies.push(c);
    born.push({ id: c.id, x: r2(c.x), y: r2(c.y), start: 0, grazed: 0, end: r2(c.biomass), fate: "new", cause: fertilized.has(idx) ? "detritus" : "nutrients" });
  }
  for (const p of [...env.colonies]) {
    if (env.colonies.length >= w.maxColonies || p.biomass < w.spreadAt || born.some((b) => b.id === p.id)) continue;
    if (rng.next() >= w.spreadChance) continue;
    const a = rng.range(0, Math.PI * 2);
    const d = rng.range(w.minDistance, w.minDistance * 1.5);
    const x = Math.min(width - 3, Math.max(3, p.x + Math.cos(a) * d));
    const y = Math.min(height - 3, Math.max(3, p.y + Math.sin(a) * d));
    if (!free(x, y)) continue;
    const c: Colony = { id: env.nextColonyId++, x, y, biomass: w.sproutBiomass * 0.7, bornGeneration: absoluteGen + 1 };
    p.biomass -= c.biomass;
    env.colonies.push(c);
    born.push({ id: c.id, x: r2(x), y: r2(y), start: 0, grazed: 0, end: r2(c.biomass), fate: "new", cause: "spores", parent: p.id });
  }
  // Hiç koloni kalmazsa en verimli karede bir tane filizlenir (dünya tamamen ölmez)
  if (env.colonies.length === 0) {
    const idx = tiles[0].idx;
    const c: Colony = { id: env.nextColonyId++, x: ((idx % G) + 0.5) * tileW, y: (Math.floor(idx / G) + 0.5) * tileH, biomass: w.sproutBiomass, bornGeneration: absoluteGen + 1 };
    env.colonies.push(c);
    born.push({ id: c.id, x: r2(c.x), y: r2(c.y), start: 0, grazed: 0, end: r2(c.biomass), fate: "new", cause: fertilized.has(idx) ? "detritus" : "nutrients" });
  }

  // 5) Toprak yenilenir ve komşu karelere yayılır
  for (let t = 0; t < n.length; t++) n[t] = Math.max(0, n[t] + w.nutrientRegen * (w.nutrientBase - n[t]));
  const next = n.slice();
  for (let j = 0; j < G; j++) {
    for (let i = 0; i < G; i++) {
      const nb = [
        [i - 1, j],
        [i + 1, j],
        [i, j - 1],
        [i, j + 1],
      ].filter(([a, b]) => a >= 0 && b >= 0 && a < G && b < G);
      const avg = nb.reduce((s, [a, b]) => s + n[b * G + a], 0) / nb.length;
      next[j * G + i] = n[j * G + i] + w.diffusion * (avg - n[j * G + i]);
    }
  }
  env.nutrients = next;

  const bornIds = new Set(born.map((b) => b.id));
  const colonies: EnvGeneration["colonies"] = [];
  for (const s0 of startColonies) {
    const id = s0.id;
    const alive = env.colonies.find((c) => c.id === id);
    const before = grazed.get(id) ?? 0;
    colonies.push({
      id,
      x: r2(s0.x),
      y: r2(s0.y),
      start: r2(s0.biomass),
      grazed: r2(before),
      end: alive ? r2(alive.biomass) : 0,
      fate: alive ? "alive" : "died",
    });
  }
  for (const b of born) if (bornIds.has(b.id)) colonies.push(b);
  return { nutrientsStart: nutrientsStart.map(r2), nutrientsEnd: env.nutrients.map(r2), colonies, deposits: deaths.map((d) => ({ x: r2(d.x), y: r2(d.y) })) };
}
