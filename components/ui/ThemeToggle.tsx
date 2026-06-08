"use client";

import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { useAppStore } from "@/lib/store";
import type { ThemeMode } from "@/lib/types";
import { cn } from "@/lib/cn";

const themes: Array<{ value: ThemeMode; label: string; icon: typeof Sun }> = [
  { value: "system", label: "Use system theme", icon: Monitor },
  { value: "light", label: "Use light theme", icon: Sun },
  { value: "dark", label: "Use dark theme", icon: Moon }
];

const accents = [
  { value: "blue" as const, label: "Blue accent", className: "bg-[#0066cc]" },
  { value: "red" as const, label: "Red accent", className: "bg-[#d51c2f]" },
  { value: "gold" as const, label: "Gold accent", className: "bg-[#f4be34]" }
];

export function ThemeToggle() {
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const accent = useAppStore((state) => state.accent);
  const setAccent = useAppStore((state) => state.setAccent);

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2" aria-label="Appearance controls">
      <div className="flex shrink-0 rounded-app border border-border bg-panel p-1">
        {themes.map((item) => {
          const Icon = item.icon;
          return (
            <IconButton
              key={item.value}
              label={item.label}
              aria-pressed={theme === item.value}
              onClick={() => setTheme(item.value)}
              className={cn(
                "h-9 w-9 border-0 bg-transparent shadow-none",
                theme === item.value && "bg-accent/12 text-accent"
              )}
            >
              <Icon aria-hidden className="h-4 w-4" />
            </IconButton>
          );
        })}
      </div>
      <div className="flex shrink-0 rounded-app border border-border bg-panel p-1">
        <Palette aria-hidden className="mx-2 hidden h-9 w-4 text-muted sm:block" />
        {accents.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-label={item.label}
            aria-pressed={accent === item.value}
            className={cn(
              "m-1 h-5 w-5 rounded-full border border-border transition",
              item.className,
              accent === item.value && "ring-2 ring-accent-gold ring-offset-2 ring-offset-panel"
            )}
            onClick={() => setAccent(item.value)}
          />
        ))}
      </div>
    </div>
  );
}
