// Bir karede arenada ne görünür: hücreler, durumları ve yemekler.
// Tamamen kayıttan okunur; Arena, grafik ve gen çubukları aynı sahneyi kullanır.

import type { Day, Track } from "./data.ts";
import type { FrameState } from "./timeline.ts";

export type CellView = {
  k: Track;
  x: number; // dünya birimi
  y: number;
  heading: number;
  moving: number; // 0..1
  vacuoles: number; // görünen besin kofulu sayısı
  vacuoleAlpha: number;
  lastMealAge: number; // son yemekten bu yana adım (animasyon için)
  hungry: boolean;
  lyse: number; // 0..1 açlıktan ölüm
  stretch: number; // 0..1 bölünme sırasında uzama
  scale: number; // doğum animasyonu
  divideToward: number | null; // bölünme yönü (radyan)
};

export type FoodView = { id: number; x: number; y: number; scale: number };

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => (v < 0.5 ? 2 * v * v : 1 - (-2 * v + 2) ** 2 / 2);

export function sceneAt(day: Day, fs: FrameState): { cells: CellView[]; food: FoodView[]; alive: number } {
  const rec = day.rec;
  const gens = rec.generations;
  const cells: CellView[] = [];
  const food: FoodView[] = [];
  const s = fs.step;
  const si = Math.floor(s);

  const base = (k: Track, at: number, genStart: number): CellView => {
    const [x, y] = day.pos(k, at);
    const { heading, moving } = day.motion(k, at);
    const meals = day.mealsBetween(k, genStart, Math.floor(at));
    const lastMeal = k.meals.filter((m) => m >= genStart && m <= at).pop();
    return {
      k,
      x,
      y,
      heading,
      moving,
      vacuoles: meals,
      vacuoleAlpha: 1,
      lastMealAge: lastMeal !== undefined ? at - lastMeal : 999,
      hungry: meals === 0,
      lyse: 0,
      stretch: 0,
      scale: 1,
      divideToward: null,
    };
  };

  const kind = fs.seg.kind;
  if (kind === "intro") {
    for (const k of rec.krumels) {
      if (k.firstStep !== 0 || !k.track.length) continue;
      const c = base(k, 0, 0);
      c.moving = 0;
      cells.push(c);
    }
    return { cells, food, alive: cells.length };
  }

  if (kind === "move") {
    const g = gens[fs.gen];
    for (const k of rec.krumels) if (day.aliveAt(k, s)) cells.push(base(k, s, g.startStep));
    for (const f of rec.food) {
      const gone = f.gone ?? Infinity;
      if (f.spawn > s || s >= gone || f.spawn < g.startStep) continue;
      let x = f.x;
      let y = f.y;
      let scale = clamp01((s - f.spawn) / 5);
      // Yutulma: son 3 adımda hücreye doğru çekilir ve küçülür
      if (f.eatenBy != null && gone - s < 3) {
        const eater = day.byId.get(f.eatenBy);
        if (eater) {
          const [ex, ey] = day.pos(eater, s);
          const u = 1 - (gone - s) / 3;
          x += (ex - x) * u;
          y += (ey - y) * u;
          scale *= 1 - u * 0.6;
        }
      }
      food.push({ id: f.id, x, y, scale });
    }
    return { cells, food, alive: cells.length };
  }

  // Seçilim ya da gün sonu
  const gi = fs.gen;
  const g = gens[gi];
  const t = kind === "sel" ? fs.t : 1;
  const end = g.endStep;
  const kidsOf = new Map<number, Track[]>();
  for (const k of rec.krumels) {
    if (k.firstStep === end + 1 && k.parentId != null) {
      const arr = kidsOf.get(k.parentId) ?? [];
      arr.push(k);
      kidsOf.set(k.parentId, arr);
    }
  }
  const divT = ease(clamp01((t - 0.12) / 0.6)); // bölünme ilerlemesi
  let alive = 0;
  for (const k of rec.krumels) {
    if (!k.track.length || k.firstStep > end || k.lastStep < end) continue;
    const c = base(k, end, g.startStep);
    c.moving = 0;
    const starving = k.died?.step === end;
    if (starving) {
      c.lyse = ease(clamp01(t * 1.25));
      if (c.lyse >= 1) continue;
    } else {
      alive++;
    }
    const kids = kidsOf.get(k.id) ?? [];
    if (kids.length) {
      const [bx, by] = day.pos(kids[0], end + 1);
      c.divideToward = Math.atan2(by - c.y, bx - c.x);
      c.stretch = divT < 0.5 ? divT * 2 : 2 - divT * 2; // uzar, sonra ayrılınca toparlanır
      if (divT > 0.5) c.vacuoles = 0;
    } else if (!starving) {
      c.vacuoleAlpha = 1 - clamp01((t - 0.4) / 0.5); // sindirim
    }
    if (kind !== "sel") {
      c.vacuoles = 0;
      c.stretch = 0;
    }
    cells.push(c);
  }
  // Yavrular ebeveynin içinden ayrılır
  for (const [pid, kids] of kidsOf) {
    const p = day.byId.get(pid)!;
    const [px, py] = day.pos(p, end);
    for (const k of kids) {
      if (divT <= 0.35) continue;
      const [bx, by] = day.pos(k, end + 1);
      const u = clamp01((divT - 0.35) / 0.65);
      const c = base(k, end + 1, end + 1);
      c.x = px + (bx - px) * u;
      c.y = py + (by - py) * u;
      c.heading = Math.atan2(by - py, bx - px);
      c.moving = 0;
      c.vacuoles = 0;
      c.hungry = false;
      c.scale = 0.55 + 0.45 * u;
      cells.push(c);
      alive++;
    }
  }
  return { cells, food, alive };
}
