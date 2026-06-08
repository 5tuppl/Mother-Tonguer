"use client";

import { cn } from "@/lib/cn";

interface WaveformProps {
  levels: number[];
  active?: boolean;
  compact?: boolean;
}

export function Waveform({ levels, active, compact }: WaveformProps) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center gap-1 overflow-hidden rounded-app border border-border bg-canvas px-3",
        compact ? "h-16" : "h-24 sm:h-28"
      )}
      aria-hidden
    >
      {levels.map((level, index) => (
        <span
          key={index}
          className={cn(
            "w-1.5 rounded-full bg-accent transition-[height,opacity,background-color] duration-75",
            active ? "opacity-95" : "opacity-35"
          )}
          style={{
            height: `${Math.max(8, level * (compact ? 50 : 86))}px`,
            background:
              index % 7 === 0
                ? "rgb(var(--accent-red))"
                : index % 5 === 0
                  ? "rgb(var(--accent-gold))"
                  : "rgb(var(--accent))"
          }}
        />
      ))}
    </div>
  );
}
