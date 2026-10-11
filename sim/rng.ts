// Seed'li, durumu kaydedilebilir RNG (sfc32).
// Simülasyondaki TÜM rastgelelik buradan gelir; Math.random() kullanılmaz.

export type RngState = [number, number, number, number];

export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  private constructor(state: RngState) {
    [this.a, this.b, this.c, this.d] = state;
  }

  static fromSeed(seed: number): Rng {
    // splitmix32 ile seed'den 4 kelimelik başlangıç durumu üret
    let s = seed >>> 0;
    const next = () => {
      s = (s + 0x9e3779b9) >>> 0;
      let z = s;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
      return (z ^ (z >>> 16)) >>> 0;
    };
    const rng = new Rng([next(), next(), next(), next()]);
    for (let i = 0; i < 15; i++) rng.next(); // ısınma
    return rng;
  }

  static fromState(state: RngState): Rng {
    return new Rng([...state] as RngState);
  }

  getState(): RngState {
    return [this.a, this.b, this.c, this.d];
  }

  /** [0, 1) aralığında uniform */
  next(): number {
    const t = (((this.a + this.b) >>> 0) + this.d) >>> 0;
    this.d = (this.d + 1) >>> 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) >>> 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.c = (this.c + t) >>> 0;
    return t / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  /** Standart normal dağılım (Box–Muller, önbelleksiz → durum sadece 4 kelime) */
  gaussian(): number {
    const u = 1 - this.next();
    const v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
