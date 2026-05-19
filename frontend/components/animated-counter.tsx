"use client";

import * as React from "react";

type Props = {
  to: number;
  durationMs?: number;
  format?: (n: number) => string;
  className?: string;
};

const defaultFormat = (n: number) => Math.round(n).toLocaleString();

export function AnimatedCounter({
  to,
  durationMs = 600,
  format = defaultFormat,
  className,
}: Props) {
  const reduced = useReducedMotion();
  if (reduced) {
    return (
      <span className={className} aria-label={format(to)}>
        {format(to)}
      </span>
    );
  }
  return (
    <AnimatedCounterImpl
      to={to}
      durationMs={durationMs}
      format={format}
      className={className}
    />
  );
}

function AnimatedCounterImpl({ to, durationMs, format, className }: Required<Pick<Props, "to" | "durationMs" | "format">> & { className?: string }) {
  const [display, setDisplay] = React.useState<number>(to);
  const fromRef = React.useRef<number>(0);
  const rafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    const delta = to - from;

    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + delta * eased;
      setDisplay(v);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      fromRef.current = to;
    };
  }, [to, durationMs]);

  return (
    <span className={className} aria-label={format(to)}>
      {format(display)}
    </span>
  );
}

function useReducedMotion(): boolean {
  return React.useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}
