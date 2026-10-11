// Birden fazla seed ile Tag 1'i bellekte çalıştırır (dosya yazmaz) ve nüfus eğrilerini özetler.
//   npm run sim:sweep -- [--seeds 1,2,3,4,5] [--set food.spawnPerStep=0.12]

import { configWithSets, parseArgs } from "./cli.ts";
import { createInitialState, runDay } from "./world.ts";

const { flags, sets } = parseArgs(process.argv.slice(2));
const config = configWithSets(sets);
const seeds = String(flags.seeds ?? "1,2,3,4,5").split(",").map(Number);

if (sets.length) console.log(`Overrides: ${sets.join(" ")}`);
console.log(`Seed | Nüfus (nesil sonları)        | min  max | mutant | ⌀speed ⌀size ⌀sense (son) | adım/nesil (F=yemek bitti, N=kimse yiyemez, T=sınır)`);
const finals: number[] = [];
for (const seed of seeds) {
  const { recording } = runDay(createInitialState(config, seed), config, null);
  const gens = recording.generations;
  const curve = [config.initial.count, ...gens.map((g) => g.popEnd)];
  const last = gens[gens.length - 1];
  const mutants = gens.reduce((s, g) => s + g.mutants, 0);
  finals.push(last.popEnd);
  console.log(
    `${String(seed).padStart(4)} | ${curve.map((n) => String(n).padStart(3)).join(" →")} | ` +
      `${String(Math.min(...curve)).padStart(3)}  ${String(Math.max(...curve)).padStart(3)} | ` +
      `${String(mutants).padStart(6)} | ${last.meanGenes.speed.toFixed(2)}   ${last.meanGenes.size.toFixed(2)}  ${last.meanGenes.sense.toFixed(2)} | ` +
      gens.map((g) => `${g.endStep - g.startStep + 1}${g.endReason[0].toUpperCase()}`).join(" "),
  );
}
const avg = finals.reduce((a, b) => a + b, 0) / finals.length;
console.log(`Ortalama son nüfus: ${avg.toFixed(1)}  (min ${Math.min(...finals)}, max ${Math.max(...finals)})`);
