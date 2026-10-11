// Simülasyon motoru: bir günü (birkaç nesil) sıralı olarak hesaplar.
// Girdi: önceki günün state'i (ya da null → Tag 1 başlangıcı), config, olay.
// Çıktı: gün sonu state'i + render için adım adım kayıt.

import type { SimConfig } from "../sim.config.ts";
import { Rng } from "./rng.ts";
import type {
  DayEvent,
  DayRecording,
  FoodRecord,
  GenerationSummary,
  Genes,
  KrumelState,
  KrumelTrack,
  WorldState,
} from "./types.ts";

const GENE_KEYS: (keyof Genes)[] = ["speed", "size", "sense"];

type Krumel = KrumelState & {
  energy: number;
  eaten: number;
  alive: boolean;
  rec: KrumelTrack;
};

type Food = { id: number; x: number; y: number; rec: FoodRecord };

export function deepMerge<T>(base: T, overrides: Record<string, unknown> | undefined): T {
  if (!overrides) return structuredClone(base);
  const out = structuredClone(base) as Record<string, unknown>;
  for (const [k, v] of Object.entries(overrides)) {
    const cur = out[k];
    if (v && typeof v === "object" && !Array.isArray(v) && cur && typeof cur === "object") {
      out[k] = deepMerge(cur, v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

export function createInitialState(config: SimConfig, seed: number): WorldState {
  const rng = Rng.fromSeed(seed);
  const { width, height } = config.arena;
  const krumels: KrumelState[] = [];
  for (let i = 0; i < config.initial.count; i++) {
    krumels.push({
      id: i + 1,
      parentId: null,
      name: null,
      bornDay: 1,
      bornGeneration: 0,
      genes: { ...config.initial.genes },
      x: rng.range(width * 0.1, width * 0.9),
      y: rng.range(height * 0.1, height * 0.9),
      heading: rng.range(0, Math.PI * 2),
    });
  }
  return {
    version: 1,
    day: 0,
    seed,
    rng: rng.getState(),
    nextKrumelId: config.initial.count + 1,
    nextFoodId: 1,
    generationsSoFar: 0,
    krumels,
    history: [],
    config,
  };
}

export function moveCost(genes: Genes, config: SimConfig): number {
  return config.energy.costScale * (genes.size ** 3 * genes.speed ** 2 + genes.sense);
}

export function runDay(
  start: WorldState,
  baseConfig: SimConfig,
  event: DayEvent | null,
): { end: WorldState; recording: DayRecording } {
  const config = deepMerge(baseConfig, event?.configOverrides);
  const day = start.day + 1;
  const rng = Rng.fromState(start.rng);
  const { width, height } = config.arena;
  const maxSteps = config.day.maxStepsPerGeneration;
  let cursor = 0; // gün içi mutlak adım sayacı
  const dec = 10 ** config.record.decimals;
  const r = (v: number) => Math.round(v * dec) / dec;

  let nextKrumelId = start.nextKrumelId;
  let nextFoodId = start.nextFoodId;

  const tracks: KrumelTrack[] = [];
  const foods: FoodRecord[] = [];
  const population: number[] = [];
  const generations: GenerationSummary[] = [];

  const makeKrumel = (s: KrumelState, firstStep: number, mutation: Partial<Genes> | null): Krumel => {
    const rec: KrumelTrack = {
      id: s.id,
      parentId: s.parentId,
      name: s.name,
      genes: { ...s.genes },
      firstStep,
      born: firstStep > 0 ? { x: r(s.x), y: r(s.y) } : null,
      lastStep: firstStep,
      died: null,
      track: [],
      meals: [],
      mutation,
    };
    tracks.push(rec);
    return { ...structuredClone(s), energy: 0, eaten: 0, alive: true, rec };
  };

  let krumels: Krumel[] = start.krumels.map((k) => makeKrumel(k, 0, null));
  let food: Food[] = [];

  const spawnFood = (step: number) => {
    const margin = 2;
    const f: Food = {
      id: nextFoodId++,
      x: rng.range(margin, width - margin),
      y: rng.range(margin, height - margin),
      rec: null as unknown as FoodRecord,
    };
    f.rec = { id: f.id, x: r(f.x), y: r(f.y), spawn: step, gone: null, eatenBy: null };
    foods.push(f.rec);
    food.push(f);
  };

  for (let g = 0; g < config.day.generations; g++) {
    const startStep = cursor;
    let endStep = startStep;
    let endReason: GenerationSummary["endReason"] = "timeout";
    const absolute = start.generationsSoFar + g;
    const popStart = krumels.length;
    let foodSpawned = 0;
    let foodEaten = 0;

    // Nesil başı: enerji dolar, sayaçlar sıfırlanır, taze yemek
    for (const k of krumels) {
      k.energy = config.energy.budget;
      k.eaten = 0;
    }
    food = [];
    for (let i = 0; i < config.food.initial; i++) {
      spawnFood(startStep);
      foodSpawned++;
    }

    // Nesil, yemek tükenene kadar sürer (ya da kimse yiyemez hale gelene kadar)
    for (let step = startStep; ; step++) {
      // Yemek belirir (yalnızca spawnWindow içinde)
      const rate = config.food.spawnPerStep;
      let n = Math.floor(rate) + (rng.next() < rate - Math.floor(rate) ? 1 : 0);
      while (n-- > 0 && food.length < config.food.max && step - startStep < config.food.spawnWindow) {
        spawnFood(step);
        foodSpawned++;
      }

      const order = rng.shuffle(krumels.filter((k) => k.alive));
      for (const k of order) {
        if (!k.alive) continue; // bu adımda avlanmış olabilir
        // Doymak yok: enerjisi olan herkes yemek aramaya devam eder
        if (k.energy > 0) {
          const senseR = k.genes.sense * config.base.sense;
          const bodyR = k.genes.size * config.base.radius;
          const stepLen = k.genes.speed * config.base.speed;

          // Hedef seçimi: görüş alanındaki en yakın yemek (ya da av)
          let tx = 0;
          let ty = 0;
          let bestD = senseR;
          let hasTarget = false;
          for (const f of food) {
            const d = Math.hypot(f.x - k.x, f.y - k.y);
            if (d < bestD) {
              bestD = d;
              tx = f.x;
              ty = f.y;
              hasTarget = true;
            }
          }
          if (config.predation.enabled) {
            for (const o of krumels) {
              if (!o.alive || o === k) continue;
              if (k.genes.size < o.genes.size * config.predation.sizeRatio) continue;
              const d = Math.hypot(o.x - k.x, o.y - k.y);
              if (d < bestD) {
                bestD = d;
                tx = o.x;
                ty = o.y;
                hasTarget = true;
              }
            }
          }

          if (hasTarget) {
            k.heading = Math.atan2(ty - k.y, tx - k.x);
          } else {
            k.heading += rng.gaussian() * config.base.turnJitter;
          }
          const dist = hasTarget ? Math.min(stepLen, bestD) : stepLen;
          k.x += Math.cos(k.heading) * dist;
          k.y += Math.sin(k.heading) * dist;

          // Duvardan sekme
          if (k.x < bodyR) {
            k.x = bodyR;
            k.heading = Math.PI - k.heading;
          } else if (k.x > width - bodyR) {
            k.x = width - bodyR;
            k.heading = Math.PI - k.heading;
          }
          if (k.y < bodyR) {
            k.y = bodyR;
            k.heading = -k.heading;
          } else if (k.y > height - bodyR) {
            k.y = height - bodyR;
            k.heading = -k.heading;
          }

          k.energy -= moveCost(k.genes, config);

          // Yemek yeme
          for (let i = 0; i < food.length; i++) {
            const f = food[i];
            if (Math.hypot(f.x - k.x, f.y - k.y) <= bodyR + config.food.radius) {
              food.splice(i, 1);
              f.rec.gone = step;
              f.rec.eatenBy = k.id;
              k.eaten++;
              k.rec.meals.push(step);
              foodEaten++;
              break;
            }
          }

          // Avlanma
          if (config.predation.enabled) {
            for (const o of krumels) {
              if (!o.alive || o === k) continue;
              if (k.genes.size < o.genes.size * config.predation.sizeRatio) continue;
              const oR = o.genes.size * config.base.radius;
              if (Math.hypot(o.x - k.x, o.y - k.y) <= bodyR + oR * 0.5) {
                o.alive = false;
                o.rec.died = { step, cause: "eaten" };
                o.rec.lastStep = step;
                k.eaten += config.predation.foodValue;
                k.rec.meals.push(step);
                break;
              }
            }
          }
        }
      }

      // Konumları kaydet
      let alive = 0;
      for (const k of krumels) {
        if (!k.alive) continue;
        alive++;
        k.rec.track.push(r(k.x), r(k.y));
        k.rec.lastStep = step;
      }
      population.push(alive);

      // Nesil bitti mi?
      endStep = step;
      if (step - startStep + 1 >= config.food.spawnWindow && food.length === 0) {
        endReason = "foodGone";
        break;
      }
      const canStillEat = krumels.some(
        (k) => k.alive && k.energy > 0,
      );
      if (!canStillEat) {
        endReason = "noOneCanEat";
        break;
      }
      if (step - startStep + 1 >= maxSteps) break;
    }
    cursor = endStep + 1;

    // Nesil sonu: kalan yemek temizlenir
    for (const f of food) f.rec.gone = endStep;
    food = [];

    // Seçilim
    let ate0 = 0;
    let ate1 = 0;
    let ate2 = 0;
    let died = 0;
    let mutants = 0;
    const survivors: Krumel[] = [];
    const children: Krumel[] = [];
    for (const k of krumels) {
      if (!k.alive) {
        died++; // nesil içinde avlandı
        continue;
      }
      if (k.eaten >= config.rules.foodToSurvive + config.rules.foodPerChild) ate2++;
      else if (k.eaten >= config.rules.foodToSurvive) ate1++;
      else ate0++;

      if (k.eaten < config.rules.foodToSurvive) {
        k.alive = false;
        k.rec.died = { step: endStep, cause: "starved" };
        died++;
        continue;
      }
      survivors.push(k);
      // Hayatta kalmanın üstündeki her foodPerChild yemek = 1 yavru
      const nKids = Math.min(
        config.rules.maxChildren,
        Math.floor((k.eaten - config.rules.foodToSurvive) / config.rules.foodPerChild),
      );
      for (let c = 0; c < nKids; c++) {
        const genes = { ...k.genes };
        const mutation: Partial<Genes> = {};
        let mutated = false;
        for (const key of GENE_KEYS) {
          if (rng.next() < config.mutation.chancePerGene) {
            const v = genes[key] * (1 + rng.gaussian() * config.mutation.sd);
            genes[key] = Math.min(config.mutation.max, Math.max(config.mutation.min, v));
            mutation[key] = Math.round((genes[key] - k.genes[key]) * 1000) / 1000;
            mutated = true;
          }
        }
        if (mutated) mutants++;
        const a = rng.range(0, Math.PI * 2);
        const childState: KrumelState = {
          id: nextKrumelId++,
          parentId: k.id,
          name: null,
          bornDay: day,
          bornGeneration: absolute + 1,
          genes,
          x: Math.min(width - 2, Math.max(2, k.x + Math.cos(a) * 2.5)),
          y: Math.min(height - 2, Math.max(2, k.y + Math.sin(a) * 2.5)),
          heading: rng.range(0, Math.PI * 2),
        };
        // Son nesilde doğan yavrular ertesi günün ilk adımında görünür
        children.push(makeKrumel(childState, endStep + 1, mutated ? mutation : null));
      }
    }
    krumels = [...survivors, ...children];

    const mean = (key: keyof Genes) =>
      krumels.length ? krumels.reduce((s, k) => s + k.genes[key], 0) / krumels.length : 0;
    generations.push({
      index: g,
      absolute,
      startStep,
      endStep,
      endReason,
      popStart,
      ate0,
      ate1,
      ate2,
      died,
      born: children.length,
      mutants,
      popEnd: krumels.length,
      foodSpawned,
      foodEaten,
      meanGenes: { speed: mean("speed"), size: mean("size"), sense: mean("sense") },
    });

    if (krumels.length === 0) {
      // Nesil yok oldu: kalan nesiller boş geçer
      break;
    }
  }

  // Günün son neslinde doğan yavruların izi bu günün kaydında boş kalır;
  // render'da yalnızca "doğum" anı olarak gösterilir.
  for (const t of tracks) {
    if (t.track.length === 0) t.lastStep = t.firstStep - 1;
  }

  const end: WorldState = {
    version: 1,
    day,
    seed: start.seed,
    rng: rng.getState(),
    nextKrumelId,
    nextFoodId,
    generationsSoFar: start.generationsSoFar + generations.length,
    krumels: krumels.map((k) => ({
      id: k.id,
      parentId: k.parentId,
      name: k.name,
      bornDay: k.bornDay,
      bornGeneration: k.bornGeneration,
      genes: k.genes,
      x: k.x,
      y: k.y,
      heading: k.heading,
    })),
    history: [
      ...start.history,
      ...generations.map((g) => ({ day, generation: g.absolute, population: g.popEnd })),
    ],
    config,
  };

  const recording: DayRecording = {
    version: 1,
    day,
    seed: start.seed,
    event,
    arena: { width, height },
    base: config.base,
    foodRadius: config.food.radius,
    totalSteps: cursor,
    generations,
    krumels: tracks,
    food: foods,
    population,
  };

  return { end, recording };
}
