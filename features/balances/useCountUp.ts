"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a minor-unit amount from a previous value to the target over
 * `durationMs`, using tabular-nums-safe integer steps.
 */
export function useCountUp(
  target: number,
  durationMs = 500
): number {
  const [display, setDisplay] = useState(target);
  const previous = useRef(target);

  useEffect(() => {
    const from = previous.current;
    const to = target;
    previous.current = target;

    if (from === to) {
      setDisplay(to);
      return;
    }

    const start = performance.now();
    let raf = 0;

    const step = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return display;
}
