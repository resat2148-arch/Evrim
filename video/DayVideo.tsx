// Bir günün videosu. Yalnızca recordings/day-XX.json okunur.

import React, { useMemo } from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Day, RECORDINGS } from "./data.ts";
import { makeNarrative } from "./narrative.ts";
import { sceneAt, worldAt } from "./scene.ts";
import { ARENA, C, loadFonts } from "./theme.ts";
import { buildTimeline, frameState } from "./timeline.ts";
import { Arena } from "./components/Arena.tsx";
import { DayCounter, EventCard, ResultCard, VoteCard } from "./components/Cards.tsx";
import { GeneStats } from "./components/GeneStats.tsx";
import { Captions, Header } from "./components/Hud.tsx";
import { PopulationGraph } from "./components/PopulationGraph.tsx";

export type DayVideoProps = { day: number };

// @remotion/fonts render'ı fontlar yüklenene kadar kendisi bekletir
loadFonts();

export const DayVideo: React.FC<DayVideoProps> = ({ day: dayNo }) => {
  const frame = useCurrentFrame();
  const { day, timeline, narrative } = useMemo(() => {
    const day = new Day(RECORDINGS[dayNo]);
    return { day, timeline: buildTimeline(day.rec), narrative: makeNarrative(day) };
  }, [dayNo]);
  const rec = day.rec;
  const fs = frameState(rec, timeline.segments, frame);
  const scene = sceneAt(day, fs);
  const world = worldAt(day, fs);
  const f = narrative.facts;
  const kind = fs.seg.kind;
  const segFrame = fs.local;

  // Gerhard halkası: göründüğü ilk nesilden itibaren
  const heroStart = timeline.segments.find((s) => s.kind === "move" && s.gen === Math.max(0, f.heroBornGen));
  const heroVisible = heroStart ? interpolate(frame, [heroStart.from, heroStart.from + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;

  const hudIn = interpolate(frame, [timeline.segments[0].len - 12, timeline.segments[0].len], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dim = kind === "intro" ? 0.5 * (1 - interpolate(segFrame, [70, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })) : kind === "result" || kind === "vote" ? Math.min(0.6, (frame - (timeline.segments.find((s) => s.kind === "result")!.from)) / 12 * 0.6) : 0;

  const cap = narrative.captionAt(fs);
  const capAlpha = cap ? interpolate(frame, [cap.start, cap.start + 8, cap.end - 6, cap.end], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const heroAlive = f.hero ? !f.hero.died : false;
  const heroLine = f.hero && heroAlive ? `überlebt · ${f.heroKids.length} ${f.heroKids.length === 1 ? "Kind" : "Kinder"}` : null;
  const panelTop = ARENA.y + ARENA.size + 30;

  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 70% at 50% 45%, ${C.bg2} 0%, ${C.bg} 70%)` }}>
      {/* scripts/make-audio.ts ile kayıttan sentezlenen müzik ve efektler */}
      <Audio src={staticFile(`audio/day-${String(dayNo).padStart(2, "0")}-music.wav`)} volume={0.55} />
      <Audio src={staticFile(`audio/day-${String(dayNo).padStart(2, "0")}-sfx.wav`)} volume={0.95} />
      <Arena
        day={day}
        cells={scene.cells}
        food={scene.food}
        frame={frame}
        step={fs.step}
        heroVisible={kind === "vote" ? 0 : heroVisible}
        focus={cap?.focusId != null ? { id: cap.focusId, alpha: capAlpha } : null}
        focusColony={cap?.focusColony != null ? { id: cap.focusColony, alpha: capAlpha, label: cap.focusLabel ?? "Algen" } : null}
        world={world}
        dim={dim}
      />

      <Header day={rec.day} gen={fs.gen} gens={rec.generations.length} opacity={hudIn} />
      {cap && <Captions caption={cap} sinceStart={frame - cap.start} untilEnd={cap.end - frame} />}

      <div style={{ opacity: hudIn }}>
        <PopulationGraph rec={rec} step={fs.step} alive={scene.alive} x={40} y={panelTop} w={600} h={250} />
        <GeneStats cells={scene.cells} x={668} y={panelTop} w={372} h={250} />
      </div>

      {kind === "intro" && (
        <div style={{ position: "absolute", left: ARENA.x, top: ARENA.y, width: ARENA.size, height: ARENA.size }}>
          <DayCounter day={rec.day} line={`${f.startPop} identische Krümel. Futter wächst nur an *${f.coloniesStart} Algen*.`} frame={segFrame} len={fs.seg.len} />
        </div>
      )}
      {rec.event && kind === "move" && fs.seg.gen === 0 && segFrame < 90 && <EventCard title={rec.event.title} frame={segFrame} len={90} />}
      {kind === "result" && (
        <ResultCard day={rec.day} startPop={f.startPop} endPop={f.endPop} speedEnd={f.meanSpeedEnd} mutantsAlive={f.mutantsAlive} colonies={[f.coloniesStart, f.coloniesEnd]} heroLine={heroLine} frame={segFrame} len={fs.seg.len} />
      )}
      {kind === "vote" && <VoteCard nextDay={rec.day + 1} frame={segFrame} len={fs.seg.len} />}
    </AbsoluteFill>
  );
};

export function durationFor(dayNo: number): number {
  return buildTimeline(RECORDINGS[dayNo]).total;
}
