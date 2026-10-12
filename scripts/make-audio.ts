// Bir günün müziğini ve ses efektlerini sentezler (harici ses dosyası yok, telif derdi yok).
// Efektler kayıttaki olaylardan üretilir: her yemek bir "blip", her ölüm bir "fizz",
// her bölünme bir "bloop". Zamanlama video/timeline.ts ile birebir aynıdır.
//   npx tsx scripts/make-audio.ts [gün=1]  →  public/audio/day-XX-music.wav, day-XX-sfx.wav

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Rng } from "../sim/rng.ts";
import type { DayRecording } from "../sim/types.ts";
import { buildTimeline, type Segment } from "../video/timeline.ts";

const ROOT = join(import.meta.dirname, "..");
const dayNo = Number(process.argv[2] ?? 1);
const pad2 = (n: number) => String(n).padStart(2, "0");
const rec: DayRecording = JSON.parse(readFileSync(join(ROOT, "recordings", `day-${pad2(dayNo)}.json`), "utf8"));
const { segments, total } = buildTimeline(rec);

const SR = 44100;
const FPS = 30;
const DUR = total / FPS;
const N = Math.ceil(DUR * SR);
const rng = Rng.fromSeed(rec.seed * 1000 + dayNo); // ses için ayrı, sabit seed

type Bus = { L: Float32Array; R: Float32Array };
const bus = (): Bus => ({ L: new Float32Array(N), R: new Float32Array(N) });
const music = bus();
const sfx = bus();

const TAU = Math.PI * 2;
const sec = (frame: number) => frame / FPS;
const segOf = (kind: Segment["kind"], gen?: number) =>
  segments.find((s) => s.kind === kind && (gen === undefined || ("gen" in s && s.gen === gen)))!;

/** Genel ses üreteci: freq(t) Hz, env(t) 0..1, dalga = harmonik genlikleri */
function voice(
  b: Bus,
  t0: number,
  dur: number,
  freq: (t: number) => number,
  env: (t: number) => number,
  gain: number,
  pan = 0,
  harmonics: number[] = [1],
) {
  const i0 = Math.max(0, Math.floor(t0 * SR));
  const i1 = Math.min(N, Math.floor((t0 + dur) * SR));
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  let phase = 0;
  for (let i = i0; i < i1; i++) {
    const t = (i - i0) / SR;
    phase += (TAU * freq(t)) / SR;
    let v = 0;
    for (let h = 0; h < harmonics.length; h++) if (harmonics[h]) v += harmonics[h] * Math.sin(phase * (h + 1));
    v *= env(t);
    b.L[i] += v * gl;
    b.R[i] += v * gr;
  }
}

function noise(b: Bus, t0: number, dur: number, env: (t: number) => number, gain: number, pan = 0, highpass = 0.5, lowpass = 0.35) {
  const i0 = Math.max(0, Math.floor(t0 * SR));
  const i1 = Math.min(N, Math.floor((t0 + dur) * SR));
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  let prev = 0;
  let lp = 0;
  for (let i = i0; i < i1; i++) {
    const t = (i - i0) / SR;
    const w = rng.next() * 2 - 1;
    const hp = w - prev * highpass; // basit yüksek geçiren
    prev = w;
    lp += (hp - lp) * lowpass;
    const v = lp * env(t);
    b.L[i] += v * gl;
    b.R[i] += v * gr;
  }
}

const adsr = (a: number, d: number) => (t: number) => (t < a ? t / a : Math.exp(-(t - a) / d));
const midi = (m: number) => 440 * 2 ** ((m - 69) / 12);

// ------------------------------------------------------------------ MÜZİK
// 100 BPM, Re minör: Dm – Bb – F – C, her akor 1 ölçü (2,4 sn)
const BEAT = 60 / 100;
const BAR = BEAT * 4;
const CHORDS = [
  [50, 53, 57], // Dm
  [46, 50, 53], // Bb
  [53, 57, 60], // F
  [48, 52, 55], // C
];
const intro = segOf("intro");
const result = segOf("result");
const vote = segOf("vote");
const tMainStart = sec(intro.len);
const tResult = sec(result.from);
const tVote = sec(vote.from);
const selRanges = segments.filter((s) => s.kind === "sel").map((s) => [sec(s.from), sec(s.from + s.len)]);
const inSel = (t: number) => selRanges.some(([a, b]) => t >= a && t < b);
const tGen = (g: number) => sec(segOf("move", g).from);

// Pad: yumuşak, yavaş açılan akorlar
for (let bar = 0; bar * BAR < DUR; bar++) {
  const t0 = bar * BAR;
  const chord = CHORDS[bar % 4];
  const fadeOut = (t: number) => Math.min(1, Math.max(0, (DUR - (t0 + t)) / 1.2));
  for (const [ni, n] of [...chord, chord[0] + 12].entries()) {
    for (const det of [-0.004, 0.004]) {
      voice(
        music,
        t0,
        BAR + 1.2,
        () => midi(n) * (1 + det),
        (t) => Math.min(1, t / 0.7) * Math.min(1, Math.max(0, (BAR + 1.2 - t) / 1.2)) * fadeOut(t),
        0.035,
        det < 0 ? -0.5 + ni * 0.1 : 0.5 - ni * 0.1,
        [1, 0.35, 0.18, 0.08, 0.04],
      );
    }
  }
}

// Bas: 1. ve 3. vuruşta kök
for (let b = 0; b * BEAT < DUR; b += 2) {
  const t0 = b * BEAT;
  if (t0 < tMainStart - 0.01 || t0 >= DUR - 1) continue;
  const root = CHORDS[Math.floor(t0 / BAR) % 4][0] - 12;
  voice(music, t0, 0.9, () => midi(root), adsr(0.01, 0.35), t0 >= tVote ? 0.12 : 0.18, 0, [1, 0.25, 0.05]);
}

// Arpej (marimba/kalimba tınısı): sekizlikler, seçilim anlarında kısılır
const ARP = [0, 1, 2, 3, 2, 1, 0, 2];
for (let e = 0; e * (BEAT / 2) < DUR; e++) {
  const t0 = e * (BEAT / 2);
  if (t0 < tMainStart || t0 >= tResult) continue;
  const chord = CHORDS[Math.floor(t0 / BAR) % 4];
  const notes = [...chord.map((n) => n + 12), chord[0] + 24];
  const n = notes[ARP[e % 8]];
  const g = inSel(t0) ? 0.03 : 0.075;
  voice(music, t0, 0.7, () => midi(n), adsr(0.004, 0.18), g, e % 2 ? 0.35 : -0.35, [1, 0, 0.25, 0, 0.06]);
}
// Oylama: seyrek arpej
for (let q = 0; q * BEAT < DUR; q++) {
  const t0 = q * BEAT;
  if (t0 < tVote || t0 > DUR - 1.2) continue;
  const chord = CHORDS[Math.floor(t0 / BAR) % 4];
  voice(music, t0, 1, () => midi(chord[q % 3] + 24), adsr(0.004, 0.3), 0.05, q % 2 ? 0.4 : -0.4, [1, 0, 0.2]);
}

// Davul: 2. nesilden itibaren kick, 3. nesilden itibaren shaker
for (let b = 0; b * BEAT < DUR; b++) {
  const t0 = b * BEAT;
  if (t0 >= tGen(1) && t0 < tResult && !inSel(t0) && b % 2 === 0) {
    voice(music, t0, 0.35, (t) => 45 + 85 * Math.exp(-t / 0.03), adsr(0.002, 0.11), 0.32);
  }
  for (const off of [0.5]) {
    const th = t0 + off * BEAT;
    if (th >= tGen(2) && th < tResult) noise(music, th, 0.08, adsr(0.002, 0.02), inSel(th) ? 0.02 : 0.05, 0.25, 0.95);
  }
}

// Sonuç: yükselen çan melodisi
[62, 65, 69, 74].forEach((n, i) => {
  voice(music, tResult + 0.15 + i * 0.22, 2.4, () => midi(n + 12), adsr(0.003, 0.7), 0.07, -0.3 + i * 0.2, [1, 0, 0, 0, 0.3, 0, 0, 0, 0.1]);
});

// ------------------------------------------------------------------ EFEKTLER
// Açılış: derin vuruş + parıltı
voice(sfx, 0.05, 2.2, (t) => 38 + 40 * Math.exp(-t / 0.08), adsr(0.004, 0.6), 0.5);
[86, 93, 98].forEach((n, i) => voice(sfx, 0.08 + i * 0.07, 1.8, () => midi(n), adsr(0.003, 0.5), 0.035, -0.4 + i * 0.4, [1, 0, 0.3]));

// Yemek: kayıttaki her yemek anı. Aynı nesilde 2., 3. yemek daha tiz çalar.
const W = rec.arena.width;
for (const [gi, g] of rec.generations.entries()) {
  const mv = segOf("move", gi);
  const span = Math.max(1, g.endStep - g.startStep);
  for (const k of rec.krumels) {
    const meals = k.meals.filter((m) => m >= g.startStep && m <= g.endStep);
    meals.forEach((m, idx) => {
      const t0 = sec(mv.from + ((m - g.startStep) / span) * mv.len);
      const fi = (m - k.firstStep) * 2;
      const x = k.track[fi] ?? W / 2;
      const f0 = 520 * 2 ** (Math.min(idx, 4) * 0.25) * (1 + (rng.next() - 0.5) * 0.06);
      voice(sfx, t0, 0.16, (t) => f0 * (1 + 0.9 * Math.min(1, t / 0.045)), adsr(0.002, 0.045), 0.16, (x / W) * 1.6 - 0.8, [1, 0.15]);
    });
  }
}

// Seçilim: nesil sonu gongu, ölümler (aşağı kayan fizz), bölünmeler (bloop)
for (const [gi, g] of rec.generations.entries()) {
  const sel = segOf("sel", gi);
  const t0 = sec(sel.from);
  const selDur = sec(sel.len);
  voice(sfx, t0, 2.5, () => midi(43), adsr(0.003, 0.9), 0.16, 0, [1, 0, 0.4, 0, 0, 0.15]);
  const dying = rec.krumels.filter((k) => k.died?.step === g.endStep);
  dying.forEach((k, i) => {
    const td = t0 + 0.08 + (i / Math.max(1, dying.length)) * selDur * 0.45;
    const x = k.track[k.track.length - 2] ?? W / 2;
    const pan = (x / W) * 1.6 - 0.8;
    const gain = 0.11 / Math.sqrt(Math.max(1, dying.length / 4));
    voice(sfx, td, 0.55, (t) => 340 * Math.exp(-t / 0.22) + 70, adsr(0.005, 0.16), gain, pan, [1, 0.3, 0.1]);
    noise(sfx, td, 0.35, adsr(0.01, 0.1), gain * 0.6, pan, 0.2, 0.08); // yumuşak, boğuk fizz
  });
  const kids = rec.krumels.filter((k) => k.firstStep === g.endStep + 1);
  kids.forEach((k, i) => {
    const tb = t0 + selDur * 0.38 + (i / Math.max(1, kids.length)) * selDur * 0.35;
    const x = k.born?.x ?? W / 2;
    const f0 = 240 * (1 + (rng.next() - 0.5) * 0.15);
    const gain = 0.13 / Math.sqrt(Math.max(1, kids.length / 4));
    voice(sfx, tb, 0.3, (t) => f0 * (1 + 1.1 * Math.min(1, t / 0.09)) * (1 + 0.04 * Math.sin(TAU * 22 * t)), adsr(0.004, 0.08), gain, (x / W) * 1.6 - 0.8, [1, 0.4, 0.1]);
  });
}

// Dünya: yeni alg kolonisi filizlenince yükselen çan, abgegrast olunca boğuk düşüş
for (const [gi, eg] of rec.env.generations.entries()) {
  const sel = segOf("sel", gi);
  const t0 = sec(sel.from);
  const selDur = sec(sel.len);
  for (const c of eg.colonies) {
    const pan = (c.x / W) * 1.6 - 0.8;
    if (c.fate === "new") {
      [79, 86].forEach((m, i) => voice(sfx, t0 + selDur * 0.55 + i * 0.09, 1.4, () => midi(m), adsr(0.003, 0.35), 0.06, pan, [1, 0, 0.3, 0, 0.1]));
    } else if (c.fate === "died") {
      voice(sfx, t0 + selDur * 0.25, 0.9, (t) => 180 * Math.exp(-t / 0.35) + 55, adsr(0.01, 0.3), 0.12, pan, [1, 0.2]);
    }
  }
}

// Altyazı geçişleri: hafif "whoosh"
for (const s of segments) {
  if (s.kind === "move" || s.kind === "result") noise(sfx, sec(s.from) - 0.05, 0.35, (t) => Math.sin(Math.PI * Math.min(1, t / 0.35)) ** 2, 0.035, 0, 0.2);
}
// Oylama: iki seçenek "ding"
[6, 12].forEach((d, i) => voice(sfx, sec(vote.from + d), 1.6, () => midi(i ? 81 : 76), adsr(0.003, 0.45), 0.09, i ? 0.4 : -0.4, [1, 0, 0.35, 0, 0.1]));

// ------------------------------------------------------------------ REVERB + YAZ
function reverb(b: Bus, wet: number) {
  const combs = [1557, 1617, 1491, 1422];
  const aps = [225, 556];
  for (const [ch, buf] of [b.L, b.R].entries()) {
    const out = new Float32Array(N);
    for (const d0 of combs) {
      const d = d0 + ch * 23;
      const line = new Float32Array(d);
      let idx = 0;
      let damp = 0;
      for (let i = 0; i < N; i++) {
        const y = line[idx];
        damp = y * 0.7 + damp * 0.3;
        line[idx] = buf[i] + damp * 0.8;
        out[i] += y / combs.length;
        idx = (idx + 1) % d;
      }
    }
    for (const d0 of aps) {
      const d = d0 + ch * 11;
      const line = new Float32Array(d);
      let idx = 0;
      for (let i = 0; i < N; i++) {
        const y = line[idx];
        const x = out[i] + y * 0.5;
        line[idx] = x;
        out[i] = y - x * 0.5;
        idx = (idx + 1) % d;
      }
    }
    for (let i = 0; i < N; i++) buf[i] = buf[i] * (1 - wet * 0.4) + out[i] * wet;
  }
}

function writeWav(path: string, b: Bus) {
  let peak = 0;
  for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(b.L[i]), Math.abs(b.R[i]));
  const norm = peak > 0 ? 0.89 / peak : 1;
  const data = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    data.writeInt16LE(Math.round(Math.tanh(b.L[i] * norm) * 32767), i * 4);
    data.writeInt16LE(Math.round(Math.tanh(b.R[i] * norm) * 32767), i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVEfmt ", 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 4, 28);
  h.writeUInt16LE(4, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([h, data]));
  console.log(`→ ${path} (peak ${peak.toFixed(2)})`);
}

reverb(music, 0.3);
reverb(sfx, 0.18);
mkdirSync(join(ROOT, "public", "audio"), { recursive: true });
writeWav(join(ROOT, "public", "audio", `day-${pad2(dayNo)}-music.wav`), music);
writeWav(join(ROOT, "public", "audio", `day-${pad2(dayNo)}-sfx.wav`), sfx);
console.log(`${DUR.toFixed(1)} sn, ${rec.krumels.reduce((s, k) => s + k.meals.length, 0)} yemek sesi`);
