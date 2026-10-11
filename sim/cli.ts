// Küçük CLI yardımcıları: --key value ve --set a.b=1 (config denemeleri için)

import { simConfig, type SimConfig } from "../sim.config.ts";
import { deepMerge } from "./world.ts";

export function parseArgs(argv: string[]) {
  const flags: Record<string, string | true> = {};
  const sets: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    const value = next !== undefined && !next.startsWith("--") ? (i++, next) : true;
    if (key === "set" && typeof value === "string") sets.push(value);
    else flags[key] = value;
  }
  return { flags, sets };
}

/** "--set food.spawnPerStep=0.2" ifadelerini config'e uygular */
export function configWithSets(sets: string[]): SimConfig {
  const overrides: Record<string, unknown> = {};
  for (const s of sets) {
    const [path, raw] = s.split("=");
    const keys = path.split(".");
    let node = overrides;
    keys.slice(0, -1).forEach((k) => {
      node[k] = (node[k] as Record<string, unknown>) ?? {};
      node = node[k] as Record<string, unknown>;
    });
    node[keys[keys.length - 1]] = raw === "true" ? true : raw === "false" ? false : Number(raw);
  }
  return deepMerge(simConfig, overrides);
}

export const pad2 = (n: number) => String(n).padStart(2, "0");
