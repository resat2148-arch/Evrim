// Bir günü çalıştırır ve kaydeder.
//   npm run sim:day -- --day 1 [--seed 7] [--force] [--dry] [--set food.spawnPerStep=0.12]
// Tag 1: config'deki başlangıç nüfusundan başlar.
// Tag N: state/day-(N-1)-end.json'dan devam eder; varsa events/day-NN.json uygulanır.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { configWithSets, pad2, parseArgs } from "./cli.ts";
import { assignHero } from "./heroes.ts";
import type { DayEvent, WorldState } from "./types.ts";
import { createInitialState, runDay } from "./world.ts";

const ROOT = join(import.meta.dirname, "..");
const { flags, sets } = parseArgs(process.argv.slice(2));
const day = Number(flags.day ?? 1);
const config = configWithSets(sets);
const seed = flags.seed !== undefined ? Number(flags.seed) : config.seed;

const statePath = (d: number) => join(ROOT, "state", `day-${pad2(d)}-end.json`);
const outState = statePath(day);
const outRec = join(ROOT, "recordings", `day-${pad2(day)}.json`);

if (existsSync(outState) && !flags.force && !flags.dry) {
  console.error(`${outState} zaten var. Dünya tek ve kesintisiz; üzerine yazmak için --force.`);
  process.exit(1);
}

let start: WorldState;
if (day === 1) {
  start = createInitialState(config, seed);
} else {
  const prev = statePath(day - 1);
  if (!existsSync(prev)) {
    console.error(`${prev} bulunamadı. Önce Tag ${day - 1} çalıştırılmalı.`);
    process.exit(1);
  }
  start = JSON.parse(readFileSync(prev, "utf8"));
  if (flags.seed !== undefined) console.warn("Uyarı: Tag > 1'de seed yok sayılır, RNG state'ten devam eder.");
}

const eventPath = join(ROOT, "events", `day-${pad2(day)}.json`);
const event: DayEvent | null = existsSync(eventPath) ? JSON.parse(readFileSync(eventPath, "utf8")) : null;

const { end, recording } = runDay(start, config, event);
assignHero(end, recording);

if (!flags.dry) {
  mkdirSync(join(ROOT, "state"), { recursive: true });
  mkdirSync(join(ROOT, "recordings"), { recursive: true });
  writeFileSync(outState, JSON.stringify(end, null, 1));
  writeFileSync(outRec, JSON.stringify(recording));
}

console.log(`Tag ${day} (seed ${start.seed})${event ? ` — Ereignis: ${event.title}` : ""}`);
console.log("Gen | Start | 0×  1×  2× | tot  geb (mut) | Ende | Futter | ⌀speed ⌀size ⌀sense");
for (const g of recording.generations) {
  const m = g.meanGenes;
  console.log(
    `${String(g.absolute + 1).padStart(3)} | ${String(g.popStart).padStart(5)} | ` +
      `${String(g.ate0).padStart(2)}  ${String(g.ate1).padStart(2)}  ${String(g.ate2).padStart(2)} | ` +
      `${String(g.died).padStart(3)}  ${String(g.born).padStart(3)} (${g.mutants}) | ${String(g.popEnd).padStart(4)} | ` +
      `${g.foodEaten}/${g.foodSpawned} | ${m.speed.toFixed(2)}  ${m.size.toFixed(2)}  ${m.sense.toFixed(2)}`,
  );
}
const hero = end.krumels.find((k) => k.name);
if (hero) console.log(`Held: ${hero.name} (#${hero.id})`);
if (!flags.dry) console.log(`→ ${outState}\n→ ${outRec}`);
