"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  data: number[];
  className?: string;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  smooth?: boolean;
};

export function Sparkline({
  data,
  className,
  stroke = "var(--primary)",
  fill = "url(#sparkFill)",
  strokeWidth = 1.5,
  smooth = true,
}: Props) {
  const w = 200;
  const h = 60;
  const uid = React.useId();
  const fillId = `sparkFill-${uid}`;
  const fillRef = fill === "url(#sparkFill)" ? `url(#${fillId})` : fill;

  if (!data || data.length < 2) {
    return <svg viewBox={`0 0 ${w} ${h}`} className={cn("block", className)} aria-hidden />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = w / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return [x, y] as const;
  });

  const linePath = smooth
    ? buildSmoothPath(points)
    : points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn("block", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={fillRef} />
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function buildSmoothPath(pts: ReadonlyArray<readonly [number, number]>): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const d: string[] = [`M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d.push(`C${cx.toFixed(2)},${y0.toFixed(2)} ${cx.toFixed(2)},${y1.toFixed(2)} ${x1.toFixed(2)},${y1.toFixed(2)}`);
  }
  return d.join(" ");
}
