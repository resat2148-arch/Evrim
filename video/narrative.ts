// Almanca anlatım metinleri. Hepsi kayıtlı veriden türetilir; veri bir şeyi
// desteklemiyorsa o cümle hiç kurulmaz. *yıldızlı* kısımlar vurgu rengiyle yazılır.

import type { Day, Track } from "./data.ts";
import { de } from "./theme.ts";
import type { FrameState } from "./timeline.ts";

export type Caption = { text: string; sub?: string; tone?: "red" | "green" | "amber" };

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

  return {
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

/** Bir neslin hareket kısmında gösterilecek (en fazla 2) cümle */
function moveBeats(day: Day, f: Facts, gen: number, statShownAt: number): Caption[] {
  const g = f.gens[gen];
  const name = f.hero?.name ?? "";
  if (gen === 0) {
    return [
      { text: "Wer nicht frisst, *stirbt*." },
      { text: "Wer zweimal frisst, bekommt ein *Kind*." },
      { text: `*${g.foodSpawned}* Futterstücke. Wer zuerst kommt, frisst.` },
    ];
  }
  const beats: Caption[] = [];
  if (f.hero && gen === f.heroBornGen && f.hero.mutation) {
    const first = f.gens.slice(0, gen).every((x) => x.mutants === 0) || gen === 1;
    beats.push({ text: `${first ? "Erste Mutation" : "Mutation"}: *${name}*` });
    const pct = heroPct(f);
    if (pct && pct > 0) beats.push({ text: `*${pct} %* schneller als seine Eltern.`, tone: "amber" });
  }
  const kid = f.heroKids.find((k) => k.firstStep === g.startStep);
  if (f.hero && kid) {
    const firstKid = f.heroKids.indexOf(kid) === 0;
    const ds = kid.genes.speed - f.hero.genes.speed;
    const how = Math.abs(ds) < 0.02 ? "genauso schnell wie er" : ds > 0 ? "noch schneller" : "etwas langsamer";
    const bigger = kid.genes.size > f.hero.genes.size + 0.1 ? " – und größer" : "";
    beats.push({ text: `${firstKid ? `*${name}* bekommt ein Kind` : `${name}s zweites Kind`}: ${how}${bigger}.` });
  }
  if (gen === statShownAt) {
    beats.push({ text: `Schnelle Krümel fressen mehr: *${de(f.fastAvg, 1)}* statt ${de(f.normAvg, 1)} pro Generation.` });
  }
  beats.push({ text: `Generation ${gen + 1}: ${g.foodSpawned < g.popStart ? "nur " : ""}*${g.foodSpawned}* Futter für ${g.popStart} Krümel.` });
  if (f.hero && day.aliveAt(f.hero, g.endStep) && day.mealsBetween(f.hero, g.startStep, g.endStep) > 0) {
    beats.push({ text: `*${name}* überlebt auch Generation ${gen + 1}.` });
  }
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
