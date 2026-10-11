import React from "react";
import { Composition } from "remotion";
import { DayVideo, durationFor } from "./DayVideo.tsx";
import { RECORDINGS } from "./data.ts";
import { FPS, H, W } from "./theme.ts";

export const Root: React.FC = () => (
  <>
    {Object.keys(RECORDINGS).map((d) => {
      const day = Number(d);
      return (
        <Composition
          key={day}
          id={`Tag${String(day).padStart(2, "0")}`}
          component={DayVideo}
          durationInFrames={durationFor(day)}
          fps={FPS}
          width={W}
          height={H}
          defaultProps={{ day }}
        />
      );
    })}
  </>
);
