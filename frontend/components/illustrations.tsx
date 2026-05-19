"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type IllProps = { className?: string };

export function NoSchools({ className }: IllProps) {
  return (
    <svg viewBox="0 0 160 120" className={cn("block", className)} aria-hidden>
      <defs>
        <radialGradient id="ns-bg" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ns-stroke" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--primary-2)" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="160" height="120" fill="url(#ns-bg)" />
      <circle cx="80" cy="60" r="34" fill="none" stroke="url(#ns-stroke)" strokeWidth="1.4" />
      <ellipse cx="80" cy="60" rx="34" ry="14" fill="none" stroke="url(#ns-stroke)" strokeWidth="1.2" opacity="0.6" />
      <line x1="46" y1="60" x2="114" y2="60" stroke="url(#ns-stroke)" strokeWidth="1.2" opacity="0.6" />
      <line x1="80" y1="26" x2="80" y2="94" stroke="url(#ns-stroke)" strokeWidth="1.2" opacity="0.6" />
      <g fill="var(--primary)">
        <Sparkle x={42} y={32} s={1} />
        <Sparkle x={124} y={40} s={0.8} />
        <Sparkle x={120} y={88} s={1.1} />
        <Sparkle x={36} y={92} s={0.7} />
      </g>
    </svg>
  );
}

export function NoJobs({ className }: IllProps) {
  return (
    <svg viewBox="0 0 160 120" className={cn("block", className)} aria-hidden>
      <defs>
        <linearGradient id="nj-stroke" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--primary-2)" />
        </linearGradient>
      </defs>
      <g transform="translate(40 26)" fill="none" stroke="var(--border-strong)" strokeWidth="1.2">
        <rect x="6" y="6" width="72" height="58" rx="6" fill="var(--card)" />
        <rect x="3" y="3" width="72" height="58" rx="6" fill="var(--card-2)" />
        <rect x="0" y="0" width="72" height="58" rx="6" fill="var(--card)" />
        <line x1="10" y1="14" x2="44" y2="14" />
        <line x1="10" y1="22" x2="58" y2="22" />
        <line x1="10" y1="30" x2="40" y2="30" />
      </g>
      <path
        d="M 18 90 L 36 90 L 44 78 L 58 102 L 70 84 L 84 96 L 100 78 L 116 92 L 142 92"
        fill="none"
        stroke="url(#nj-stroke)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IdleQueue({ className }: IllProps) {
  return (
    <svg viewBox="0 0 160 120" className={cn("block", className)} aria-hidden>
      <defs>
        <linearGradient id="iq-stroke" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
          <stop offset="50%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <g stroke="url(#iq-stroke)" strokeWidth="1.6" strokeLinecap="round" fill="none">
        {Array.from({ length: 18 }).map((_, i) => {
          const x = 14 + i * 8;
          const amp = Math.sin(i * 0.6) * 16 + 18;
          return <line key={i} x1={x} x2={x} y1={60 - amp / 2} y2={60 + amp / 2} />;
        })}
      </g>
      <g transform="translate(72 50)" fill="var(--card)" stroke="var(--primary)" strokeWidth="1.4">
        <rect x="0" y="0" width="6" height="20" rx="1" />
        <rect x="10" y="0" width="6" height="20" rx="1" />
      </g>
    </svg>
  );
}

function Sparkle({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 -5 L1.4 -1.4 L5 0 L1.4 1.4 L0 5 L-1.4 1.4 L-5 0 L-1.4 -1.4 Z" />
    </g>
  );
}
