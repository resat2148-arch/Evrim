// Kayıtlı simülasyon verisine erişim. Burada HİÇBİR simülasyon hesabı yapılmaz;
// sadece kaydedilmiş konumlar okunur ve kareler arası yumuşatma için enterpole edilir.

import type { DayRecording, KrumelTrack } from "../sim/types.ts";
import day01 from "../recordings/day-01.json";

export const RECORDINGS: Record<number, DayRecording> = {
  1: day01 as unknown as DayRecording,
};

export type Track = KrumelTrack;

export class Day {
  readonly rec: DayRecording;
  readonly byId: Map<number, Track>;
  readonly hero: Track | null;

  /** koloni id → o koloniden çıkan yemeklerin yendiği adımlar (otlanma) */
  readonly grazeSteps: Map<number, number[]>;

  constructor(rec: DayRecording) {
    this.rec = rec;
    this.byId = new Map(rec.krumels.map((k) => [k.id, k]));
    this.hero = rec.krumels.find((k) => k.name) ?? null;
    this.grazeSteps = new Map();
    for (const f of rec.food) {
      if (f.colony == null || f.eatenBy == null || f.gone == null) continue;
      const arr = this.grazeSteps.get(f.colony) ?? [];
      arr.push(f.gone);
      this.grazeSteps.set(f.colony, arr);
    }
  }

  /** s adımına kadar bu nesilde koloniden yenen yemek sayısı */
  grazedBy(colonyId: number, from: number, to: number): number {
    let c = 0;
    for (const g of this.grazeSteps.get(colonyId) ?? []) if (g >= from && g <= to) c++;
    return c;
  }

  private nPos(k: Track) {
    return k.track.length / 2;
  }

  /** s adımındaki konum (dünya birimi). Doğmadan önce doğum konumu. */
  pos(k: Track, s: number): [number, number] {
    const n = this.nPos(k);
    if (n === 0 || s < k.firstStep) {
      if (k.born) return [k.born.x, k.born.y];
      return n ? [k.track[0], k.track[1]] : [this.rec.arena.width / 2, this.rec.arena.height / 2];
    }
    const i = Math.max(0, Math.min(n - 1, s - k.firstStep));
    const i0 = Math.floor(i);
    const i1 = Math.min(n - 1, i0 + 1);
    const f = i - i0;
    return [
      k.track[i0 * 2] * (1 - f) + k.track[i1 * 2] * f,
      k.track[i0 * 2 + 1] * (1 - f) + k.track[i1 * 2 + 1] * f,
    ];
  }

  /** Hareket yönü ve hızı (son birkaç adımdan) */
  motion(k: Track, s: number): { heading: number; moving: number } {
    const n = this.nPos(k);
    if (n < 2 || s < k.firstStep) return { heading: (k.id * 2.39996) % (Math.PI * 2), moving: 0 };
    // yönü birkaç adım geriye bakarak bul (duran hücre son yönünü korur)
    const i = Math.max(0, Math.min(n - 1, Math.round(s - k.firstStep)));
    let heading = (k.id * 2.39996) % (Math.PI * 2);
    for (let back = 1; back <= 40 && i - back >= 0; back++) {
      const dx = k.track[i * 2] - k.track[(i - back) * 2];
      const dy = k.track[i * 2 + 1] - k.track[(i - back) * 2 + 1];
      if (Math.hypot(dx, dy) > 0.25) {
        heading = Math.atan2(dy, dx);
        break;
      }
    }
    const j = Math.max(0, i - 1);
    const moving = Math.min(1, Math.hypot(k.track[i * 2] - k.track[j * 2], k.track[i * 2 + 1] - k.track[j * 2 + 1]) / 0.6);
    return { heading, moving };
  }

  aliveAt(k: Track, s: number): boolean {
    return k.track.length > 0 && k.firstStep <= s && s <= k.lastStep + 0.999;
  }

  mealsBetween(k: Track, from: number, to: number): number {
    let c = 0;
    for (const m of k.meals) if (m >= from && m <= to) c++;
    return c;
  }

  generationOf(s: number): number {
    const g = this.rec.generations.findIndex((g) => s <= g.endStep);
    return g === -1 ? this.rec.generations.length - 1 : g;
  }
}
