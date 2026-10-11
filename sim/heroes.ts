// Öne çıkan Krümel'i seçer ve isim verir. RNG KULLANMAZ (simülasyonu etkilemez).
// İsim state'e yazılır; böylece "Gerhard" seri boyunca Gerhard kalır.

import type { DayRecording, WorldState } from "./types.ts";

export const HERO_NAMES = ["Gerhard", "Brunhilde", "Heinz", "Ursula", "Klaus", "Erna", "Dieter", "Hilde"];

/** Hâlâ yaşayan isimli bir Krümel yoksa, gün sonunda en büyük yaşayan soyu olan Krümel'e isim verir. */
export function assignHero(end: WorldState, rec: DayRecording): void {
  const aliveIds = new Set(end.krumels.map((k) => k.id));
  if (end.krumels.some((k) => k.name)) return;

  // Puan: gün sonunda yaşayan soy büyüklüğü (kendisi + yaşayan torunları),
  // eşitlikte gün içindeki yemek sayısı, sonra küçük id.
  const parentOf = new Map(rec.krumels.map((t) => [t.id, t.parentId]));
  const score = new Map<number, number>();
  for (const id of aliveIds) {
    for (let cur: number | null | undefined = id; cur != null && parentOf.has(cur); cur = parentOf.get(cur)) {
      score.set(cur, (score.get(cur) ?? 0) + 1);
    }
  }
  const meals = new Map(rec.krumels.map((t) => [t.id, t.meals.length]));
  const candidates = rec.krumels.filter((t) => aliveIds.has(t.id));
  if (candidates.length === 0) return;
  candidates.sort(
    (a, b) =>
      (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0) ||
      (meals.get(b.id) ?? 0) - (meals.get(a.id) ?? 0) ||
      a.id - b.id,
  );
  const hero = candidates[0];
  const usedNames = new Set(end.krumels.map((k) => k.name).filter(Boolean));
  const name = HERO_NAMES.find((n) => !usedNames.has(n)) ?? `Krümel #${hero.id}`;
  end.krumels.find((k) => k.id === hero.id)!.name = name;
  hero.name = name;
}
