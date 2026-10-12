// Almanca anlatım metinleri. Hepsi kayıtlı veriden türetilir; veri bir şeyi
// desteklemiyorsa o cümle hiç kurulmaz. *yıldızlı* kısımlar vurgu rengiyle yazılır.

import type { Day, Track } from "./data.ts";
import { de } from "./theme.ts";
import type { FrameState } from "./timeline.ts";

export type Caption = { text: string; sub?: string; tone?: "red" | "green" | "amber"; focusId?: number; focusColony?: number; focusLabel?: string };

type Facts = ReturnType<typeof computeFacts>;

export function computeFacts(day: Day) {
  const rec = day.rec;
  const gens = rec.generations;
  const last = gens[gens.length - 1];
  const hero = day.hero;
  const heroParent = hero?.parentId != null ? day.byId.get(hero.parentId) ?? null : null;
  const heroBornGen = hero ? gens.findIndex((g) => g.startStep === hero.firstStep) : -1;
  const heroKids = hero ? rec.krumels.filter((k) => k.parentId === hero.id) : [];

  // Hızlılar daha çok mu yiyor? (nesil başına ortalama yemek, tempo > 1,1 vs. diğerleri)
  let fast = [0, 0];
  let norm = [0, 0];
  for (const g of gens) {
    for (const k of rec.krumels) {
      if (!k.track.length || k.firstStep > g.startStep || k.lastStep < g.endStep) continue;
      const m = day.mealsBetween(k, g.startStep, g.endStep);
      const b = k.genes.speed > 1.1 ? fast : norm;
      b[0] += m;
      b[1]++;
    }
  }
  const fastAvg = fast[1] ? fast[0] / fast[1] : 0;
  const normAvg = norm[1] ? norm[0] / norm[1] : 0;

  // Gün sonunda yaşayanlar: son nesilden sağ çıkanlar + son nesilde doğanlar
  const survivors = rec.krumels.filter(
    (k) => (k.track.length && k.lastStep >= last.endStep && !k.died) || k.firstStep === last.endStep + 1,
  );
  const isMutant = (k: Track) => k.genes.speed !== 1 || k.genes.size !== 1 || k.genes.sense !== 1;
  const startPop = gens[0].popStart;
  const meanSpeedEnd = last.meanGenes.speed;

  const envGens = rec.env.generations;
  const coloniesStart = envGens[0]?.colonies.filter((c) => c.fate !== "new").length ?? 0;
  const coloniesEnd = envGens[envGens.length - 1]?.colonies.filter((c) => c.fate !== "died").length ?? 0;

  return {
    coloniesStart,
    coloniesEnd,
    gens,
    hero,
    heroParent,
    heroBornGen,
    heroKids,
    fastAvg,
    normAvg,
    fastSample: fast[1],
    startPop,
    endPop: last.popEnd,
    mutantsAlive: survivors.filter(isMutant).length,
    meanSpeedEnd,
  };
}

function heroPct(f: Facts): number | null {
  if (!f.hero || !f.heroParent) return null;
  return Math.round((f.hero.genes.speed / f.heroParent.genes.speed - 1) * 100);
}

/** Neslin en çok yiyeni (eşitlikte küçük id) */
function topEater(day: Day, gen: number): { k: Track; meals: number } | null {
  const g = day.rec.generations[gen];
  let best: { k: Track; meals: number } | null = null;
  for (const k of day.rec.krumels) {
    if (!k.track.length || k.firstStep > g.startStep || k.lastStep < g.endStep) continue;
    const meals = day.mealsBetween(k, g.startStep, g.endStep);
    if (!best || meals > best.meals) best = { k, meals };
  }
  return best;
}

const kidsWord = (n: number) => (n === 1 ? "Kind" : "Kinder");

/** Bir neslin hareket kısmında gösterilecek cümleler (1. nesilde 3, sonra en fazla 2) */
function moveBeats(day: Day, f: Facts, gen: number, statShownAt: number): Caption[] {
  const g = f.gens[gen];
  const name = f.hero?.name ?? "";
  const top = topEater(day, gen);
  const champion: Caption | null =
    top && top.meals >= 3 && top.k.id !== f.hero?.id
      ? { text: `Krümel #${top.k.id} frisst *${top.meals}×*: das gibt *${top.meals - 1}* Kinder!`, focusId: top.k.id }
      : null;
  const env = day.rec.env.generations;
  if (gen === 0) {
    const biggest = [...env[0].colonies].sort((a, b) => b.start - a.start)[0];
    return [
      { text: "Wer nicht frisst, *stirbt*." },
      { text: "Jedes weitere Futter: ein *Kind* mehr." },
      biggest
        ? { text: "Futter wächst nur an den *Algen*.", tone: "green", focusColony: biggest.id, focusLabel: "Algen" }
        : champion ?? { text: `*${g.foodSpawned}* Futterstücke. Wer zuerst kommt, frisst.` },
    ];
  }
  // Dünya: önceki neslin sonunda neler değişti?
  const world: Caption[] = [];
  const prev = env[gen - 1];
  for (const c of prev.colonies.filter((c) => c.fate === "new")) {
    const text =
      c.cause === "detritus"
        ? "Wo Krümel starben, wachsen *neue Algen*."
        : c.cause === "spores"
          ? "Die Algen *breiten sich aus*."
          : "Auf fruchtbarem Boden wächst eine *neue Kolonie*.";
    world.push({ text, tone: "green", focusColony: c.id, focusLabel: "Neue Algen" });
  }
  const gone = prev.colonies.filter((c) => c.fate === "died").length;
  if (gone) world.push({ text: gone === 1 ? "Eine Algenkolonie wurde *abgegrast*." : `*${gone}* Algenkolonien wurden abgegrast.`, tone: "red" });
  const hero: Caption[] = [];
  const beats: Caption[] = [];
  if (f.hero && gen === f.heroBornGen) {
    hero.push({ text: `Neu geboren: *${name}*.` });
    const pct = heroPct(f);
    if (f.hero.mutation && pct && pct > 0) hero.push({ text: `*${pct} %* schneller als seine Eltern.` });
  }
  const kids = f.heroKids.filter((k) => k.firstStep === g.startStep);
  if (f.hero && kids.length) {
    hero.push({ text: `*${name}* hat *${kids.length}* ${kidsWord(kids.length)} bekommen.` });
    const fastest = kids.reduce((a, b) => (b.genes.speed > a.genes.speed ? b : a));
    const pct = Math.round((fastest.genes.speed / f.hero.genes.speed - 1) * 100);
    if (pct >= 10) hero.push({ text: `Eins davon ist *${pct} %* schneller.`, focusId: fastest.id });
  }
  if (f.hero && gen >= f.heroBornGen && day.aliveAt(f.hero, g.endStep)) {
    const m = day.mealsBetween(f.hero, g.startStep, g.endStep);
    if (m >= 2) hero.push({ text: `*${name}* frisst *${m}×* in dieser Generation.` });
  }
  // Kahraman ve dünya dönüşümlü; sonra diğerleri
  for (let i = 0; i < Math.max(hero.length, world.length); i++) {
    if (hero[i]) beats.push(hero[i]);
    if (world[i]) beats.push(world[i]);
  }
  if (champion) beats.push(champion);
  if (gen === statShownAt) {
    beats.push({ text: `Schnelle Krümel fressen mehr: *${de(f.fastAvg, 1)}* statt ${de(f.normAvg, 1)} pro Generation.` });
  }
  beats.push({ text: `Generation ${gen + 1}: ${g.foodSpawned < g.popStart ? "nur " : ""}*${g.foodSpawned}* Futter für ${g.popStart} Krümel.` });
  return beats.slice(0, 2);
}

export function makeNarrative(day: Day) {
  const f = computeFacts(day);
  // İstatistik cümlesi yeterli örnek varsa ve hızlılar gerçekten daha çok yiyorsa, 4. nesilde
  const statShownAt = f.fastSample >= 5 && f.fastAvg > f.normAvg * 1.15 ? Math.min(3, f.gens.length - 1) : -1;
  const beatsByGen = f.gens.map((_, g) => moveBeats(day, f, g, statShownAt));

  /** Geçerli altyazı ve ekranda kaldığı kare aralığı [start, end) */
  function captionAt(fs: FrameState): (Caption & { start: number; end: number }) | null {
    const seg = fs.seg;
    if (seg.kind === "move") {
      const beats = beatsByGen[seg.gen];
      if (!beats.length) return null;
      const i = Math.min(beats.length - 1, Math.floor((fs.local / seg.len) * beats.length));
      const per = seg.len / beats.length;
      return { ...beats[i], start: seg.from + Math.round(i * per), end: seg.from + Math.round((i + 1) * per) };
    }
    if (seg.kind === "sel") {
      const g = f.gens[seg.gen];
      const sub = `+${g.born} ${g.born === 1 ? "Kind" : "Kinder"}${g.mutants ? ` · ${g.mutants} mit Mutation` : ""}`;
      const span = { start: seg.from, end: seg.from + seg.len };
      if (g.died === 0) return { text: "Alle *überleben*.", sub, tone: "green", ...span };
      return { text: `*${g.died}* verhungert`, sub, tone: "red", ...span };
    }
    return null;
  }

  return { facts: f, captionAt };
}
