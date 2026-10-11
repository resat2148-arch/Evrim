// Kare → simülasyon adımı eşlemesi. Her neslin hareket kısmı sabit bir kare
// bütçesine sıkıştırılır (nesiller farklı uzunlukta olabilir), ardından seçilim anı gelir.

import type { DayRecording } from "../sim/types.ts";

export const INTRO = 90; // 3 sn: "Tag X"
export const MOVE_FIRST = 270; // 1. nesil: kurallar anlatılırken
export const MOVE = 150; // diğer nesiller: 5 sn
export const SEL = 48; // nesil sonu: ölüm ve bölünme
export const RESULT = 84;
export const VOTE = 111; // son ~3,7 sn: oylama

export type Segment =
  | { kind: "intro"; from: number; len: number }
  | { kind: "move"; gen: number; from: number; len: number }
  | { kind: "sel"; gen: number; from: number; len: number }
  | { kind: "result"; from: number; len: number }
  | { kind: "vote"; from: number; len: number };

export function buildTimeline(rec: DayRecording): { segments: Segment[]; total: number } {
  const segments: Segment[] = [];
  let f = 0;
  const push = (s: Segment) => {
    segments.push(s);
    f += s.len;
  };
  push({ kind: "intro", from: f, len: INTRO });
  rec.generations.forEach((_, gen) => {
    push({ kind: "move", gen, from: f, len: gen === 0 ? MOVE_FIRST : MOVE });
    push({ kind: "sel", gen, from: f, len: SEL });
  });
  push({ kind: "result", from: f, len: RESULT });
  push({ kind: "vote", from: f, len: VOTE });
  return { segments, total: f };
}

export type FrameState = {
  seg: Segment;
  local: number; // segment içi kare
  t: number; // segment içi 0..1
  step: number; // simülasyon adımı (ondalıklı)
  gen: number; // geçerli nesil (intro'da 0, sonuçta son nesil)
};

export function frameState(rec: DayRecording, segments: Segment[], frame: number): FrameState {
  const seg = segments.find((s) => frame < s.from + s.len) ?? segments[segments.length - 1];
  const local = Math.min(seg.len - 1, Math.max(0, frame - seg.from));
  const t = seg.len > 1 ? local / (seg.len - 1) : 1;
  const gens = rec.generations;
  const last = gens.length - 1;
  switch (seg.kind) {
    case "intro":
      return { seg, local, t, step: 0, gen: 0 };
    case "move": {
      const g = gens[seg.gen];
      // sona doğru hafif yavaşlama yok; doğrusal ve dürüst
      return { seg, local, t, step: g.startStep + (g.endStep - g.startStep) * t, gen: seg.gen };
    }
    case "sel":
      return { seg, local, t, step: gens[seg.gen].endStep, gen: seg.gen };
    default:
      return { seg, local, t, step: gens[last].endStep, gen: last };
  }
}
