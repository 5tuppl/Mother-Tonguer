"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeftRight, Check, Globe2, Search, X } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/Badge";
import {
  getLanguage,
  getRecentLanguageSet,
  languageSearchText,
  SOURCE_LANGUAGES,
  TARGET_LANGUAGES
} from "@/lib/languages";
import type { Language, LanguageCode } from "@/lib/types";
import { cn } from "@/lib/cn";

interface LanguageSelectorProps {
  source: LanguageCode;
  target: LanguageCode;
  recentLanguages: LanguageCode[];
  onChange: (source: LanguageCode, target: LanguageCode) => void;
  onSwap: () => void;
}

function LanguageButton({
  label,
  language,
  onClick
}: {
  label: string;
  language: Language;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="group min-h-24 w-full min-w-0 rounded-app border border-border bg-panel p-4 text-left shadow-soft transition hover:border-accent/50 hover:bg-accent/5"
      onClick={onClick}
    >
      <span className="text-xs font-semibold uppercase text-muted">{label}</span>
      <span className="mt-3 block break-words text-xl font-semibold text-ink sm:text-2xl" dir="auto">
        {language.nativeName}
      </span>
      <span className="mt-1 flex min-w-0 items-center gap-2 text-sm text-muted">
        <Globe2 aria-hidden className="h-4 w-4" />
        <span className="truncate">{language.name}</span>
      </span>
    </button>
  );
}

function LanguageSearchDialog({
  title,
  open,
  value,
  mode,
  excludedCode,
  onOpenChange,
  onSelect
}: {
  title: string;
  open: boolean;
  value: LanguageCode;
  mode: "source" | "target";
  excludedCode?: LanguageCode;
  onOpenChange: (open: boolean) => void;
  onSelect: (language: LanguageCode) => void;
}) {
  const [query, setQuery] = React.useState("");
  const languages = React.useMemo(() => {
    const options = mode === "source" ? SOURCE_LANGUAGES : TARGET_LANGUAGES;
    return excludedCode ? options.filter((language) => language.code !== excludedCode) : options;
  }, [excludedCode, mode]);
  const filtered = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return languages;
    return languages.filter((language) => languageSearchText(language).includes(normalized));
  }, [languages, query]);

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[84dvh] w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-app border border-border bg-panel shadow-soft">
          <div className="flex items-center justify-between border-b border-border p-4">
            <Dialog.Title className="text-base font-semibold text-ink">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <IconButton label="Close language picker" className="h-9 w-9">
                <X aria-hidden className="h-4 w-4" />
              </IconButton>
            </Dialog.Close>
          </div>
          <div className="border-b border-border p-4">
            <label className="relative block">
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <span className="sr-only">Search language</span>
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-11 w-full rounded-app border border-border bg-canvas pl-10 pr-4 text-base text-ink"
                placeholder="Search language"
              />
            </label>
          </div>
          <div className="max-h-[56dvh] overflow-y-auto p-2">
            {filtered.map((language) => (
              <button
                key={language.code}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-4 rounded-app px-3 py-3 text-left transition hover:bg-accent/8",
                  value === language.code && "bg-accent/10"
                )}
                onClick={() => {
                  onSelect(language.code);
                  onOpenChange(false);
                }}
              >
                <span className="min-w-0">
                  <span className="block break-words text-base font-semibold text-ink" dir="auto">
                    {language.nativeName}
                  </span>
                  <span className="block break-words text-sm text-muted">
                    {language.name} · {language.region} · {language.script}
                  </span>
                </span>
                {value === language.code ? <Check aria-hidden className="h-5 w-5 text-accent" /> : null}
              </button>
            ))}
            {!filtered.length ? (
              <div className="flex min-h-28 items-center justify-center rounded-app border border-dashed border-border px-4 text-center text-sm text-muted">
                No languages found
              </div>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function LanguageSelector({ source, target, recentLanguages, onChange, onSwap }: LanguageSelectorProps) {
  const [sourceOpen, setSourceOpen] = React.useState(false);
  const [targetOpen, setTargetOpen] = React.useState(false);
  const quickLanguages = getRecentLanguageSet(source, target, recentLanguages).filter((code) => code !== source);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <LanguageButton label="From" language={getLanguage(source)} onClick={() => setSourceOpen(true)} />
        <IconButton
          label="Swap languages"
          onClick={onSwap}
          className="mx-auto h-12 w-12 rounded-full border-accent/25 bg-panel shadow-soft md:mx-0"
        >
          <ArrowLeftRight aria-hidden className="h-5 w-5" />
        </IconButton>
        <LanguageButton label="To" language={getLanguage(target)} onClick={() => setTargetOpen(true)} />
      </div>

      <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1" aria-label="Recent languages">
        {quickLanguages.map((code) => {
          const language = getLanguage(code);
          const selected = code === target;
          return (
            <button
              key={code}
              type="button"
              aria-pressed={selected}
              className={cn(
                "shrink-0 rounded-full border px-3 py-2 text-sm font-semibold transition",
                selected
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-panel text-ink hover:border-accent/50 hover:bg-accent/5"
              )}
              onClick={() => onChange(source, code)}
            >
              <span dir="auto">{language.nativeName}</span>
            </button>
          );
        })}
        <Badge className="shrink-0">{getLanguage(target).script}</Badge>
      </div>

      <LanguageSearchDialog
        title="Choose source language"
        open={sourceOpen}
        value={source}
        mode="source"
        onOpenChange={setSourceOpen}
        onSelect={(language) => onChange(language, target)}
      />
      <LanguageSearchDialog
        title="Choose target language"
        open={targetOpen}
        value={target}
        mode="target"
        excludedCode={source === "auto" ? undefined : source}
        onOpenChange={setTargetOpen}
        onSelect={(language) => onChange(source, language)}
      />
    </div>
  );
}
