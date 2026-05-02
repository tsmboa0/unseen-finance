"use client";

import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";

export function useLoopTime(
  duration: number,
  options?: { intervalMs?: number; paused?: boolean },
) {
  const { intervalMs = 80, paused = false } = options ?? {};
  const reducedMotion = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (reducedMotion || paused) {
      return;
    }

    setElapsed(0);
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      setElapsed((performance.now() - startedAt) % duration);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [duration, intervalMs, paused, reducedMotion]);

  return elapsed;
}

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

export function phaseProgress(elapsed: number, start: number, end: number) {
  if (end <= start) {
    return 1;
  }

  return clamp((elapsed - start) / (end - start));
}

export function rangeActive(elapsed: number, start: number, end: number) {
  return elapsed >= start && elapsed < end;
}

export function typeByProgress(text: string, progress: number) {
  const visible = Math.floor(text.length * clamp(progress));
  return text.slice(0, visible);
}

type Segment = {
  className?: string;
  text: string;
};

export function TypedSegments({
  segments,
  visibleChars,
}: {
  segments: Segment[];
  visibleChars: number;
}) {
  const rendered = useMemo(() => {
    return segments.map((segment, index) => {
      const consumed = segments
        .slice(0, index)
        .reduce((total, current) => total + current.text.length, 0);
      const available = visibleChars - consumed;

      if (available <= 0) {
        return null;
      }

      const text = segment.text.slice(0, available);

      if (!text) {
        return null;
      }

      return (
        <span className={segment.className} key={`${segment.text}-${index}`}>
          {text}
        </span>
      );
    });
  }, [segments, visibleChars]);

  return <>{rendered}</>;
}
