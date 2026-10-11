import type { SimConfig } from "../sim.config.ts";
import type { RngState } from "./rng.ts";

export type Genes = { speed: number; size: number; sense: number };

/** Gün sonunda kaydedilen, kalıcı Krümel bilgisi */
export type KrumelState = {
  id: number;
  parentId: number | null;
  name: string | null;
  bornDay: number;
  bornGeneration: number; // serinin başından itibaren mutlak nesil
  genes: Genes;
  x: number;
  y: number;
  heading: number;
};

/** state/day-XX-end.json */
export type WorldState = {
  version: 1;
  day: number; // bu state hangi günün sonu
  seed: number; // serinin ilk seed'i (bilgi amaçlı)
  rng: RngState; // ertesi gün buradan devam eder
  nextKrumelId: number;
  nextFoodId: number;
  generationsSoFar: number;
  krumels: KrumelState[];
  /** Gün başına nesil sonu nüfusları (seri geçmişi) */
  history: { day: number; generation: number; population: number }[];
  config: SimConfig;
};

/** events/day-XX.json */
export type DayEvent = {
  id: string; // örn. "predator", "iceAge"
  title: string; // ekranda gösterilecek başlık (Almanca)
  /** Bu gün için config üzerine yazılacak alanlar (derin birleştirme) */
  configOverrides?: Record<string, unknown>;
};

// ---------- Render kaydı (recordings/day-XX.json) ----------

export type DeathCause = "starved" | "eaten";

export type KrumelTrack = {
  id: number;
  parentId: number | null;
  name: string | null;
  genes: Genes;
  firstStep: number; // gün içi mutlak adım
  /** gün içinde doğduysa doğduğu konum (ebeveynin yanında) */
  born: { x: number; y: number } | null;
  lastStep: number; // son kayıtlı adım (dahil)
  died: { step: number; cause: DeathCause } | null;
  /** [x0,y0,x1,y1,...] firstStep..lastStep */
  track: number[];
  /** yemek yediği adımlar */
  meals: number[];
  /** ebeveynden farklıysa gen farkları */
  mutation: Partial<Genes> | null;
};

export type FoodRecord = {
  id: number;
  x: number;
  y: number;
  spawn: number;
  gone: number | null; // yendiği adım ya da nesil sonunda temizlendiği adım
  eatenBy: number | null;
};

export type GenerationSummary = {
  index: number; // gün içi 0-tabanlı
  absolute: number; // seri boyunca mutlak nesil
  startStep: number;
  endStep: number; // dahil
  /** foodGone: yemek bitti · noOneCanEat: herkes doydu ya da enerjisi bitti · timeout: adım sınırı */
  endReason: "foodGone" | "noOneCanEat" | "timeout";
  popStart: number;
  ate0: number;
  ate1: number;
  ate2: number;
  died: number;
  born: number;
  mutants: number; // doğanlar içinde mutasyonlu olanlar
  popEnd: number;
  foodSpawned: number;
  foodEaten: number;
  meanGenes: Genes; // nesil sonu (yavrular dahil)
};

export type DayRecording = {
  version: 1;
  day: number;
  seed: number;
  event: DayEvent | null;
  arena: { width: number; height: number };
  base: SimConfig["base"];
  foodRadius: number;
  totalSteps: number;
  generations: GenerationSummary[];
  krumels: KrumelTrack[];
  food: FoodRecord[];
  /** her adımın sonunda canlı sayısı */
  population: number[];
};
