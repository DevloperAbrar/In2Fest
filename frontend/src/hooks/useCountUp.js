import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

// Animates a number from its previous value to `target` (ease-out).
// Respects the OS "reduce motion" setting by returning the value immediately.
export function useCountUp(target = 0, duration = 900) {
  const reduce = useReducedMotion();
  const safeTarget = Number.isFinite(Number(target)) ? Number(target) : 0;
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduce) return undefined;

    const from = fromRef.current;
    const start = performance.now();
    let frame;

    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (safeTarget - from) * eased;
      fromRef.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [safeTarget, duration, reduce]);

  return reduce ? safeTarget : value;
}