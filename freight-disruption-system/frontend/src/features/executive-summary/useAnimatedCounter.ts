import { useState, useEffect, useRef } from 'react';

/**
 * Animated count-up hook with easing.
 * @param end - Target number
 * @param duration - Animation duration in ms (default 2000)
 * @param decimals - Decimal places (default 0)
 * @param startOnMount - Whether to start immediately (default true)
 */
export function useAnimatedCounter(
  end: number,
  duration: number = 2000,
  decimals: number = 0,
  startOnMount: boolean = true
): { value: number; formattedValue: string; start: () => void; } {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const hasStarted = useRef(false);

  const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

  const animate = () => {
    const now = performance.now();
    const elapsed = now - startTimeRef.current;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeOutQuart(progress);
    const currentValue = easedProgress * end;
    setValue(currentValue);

    if (progress < 1) {
      frameRef.current = requestAnimationFrame(animate);
    } else {
      setValue(end);
    }
  };

  const start = () => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    startTimeRef.current = performance.now();
    frameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (startOnMount && end > 0) {
      // Small delay so Framer Motion entrance animation shows first
      const timeout = setTimeout(start, 300);
      return () => {
        clearTimeout(timeout);
        cancelAnimationFrame(frameRef.current);
      };
    }
    return () => cancelAnimationFrame(frameRef.current);
  }, [end, startOnMount]);

  const formattedValue = decimals > 0
    ? value.toFixed(decimals)
    : Math.round(value).toLocaleString('en-IN');

  return { value, formattedValue, start };
}
