"use client";

import * as React from "react";
import { CalendarDays, Play, Search, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { LANGUAGES, getLanguage } from "@/lib/languages";
import { deleteTranslation, getTranslations, toggleFavorite } from "@/lib/indexedDb";
import type { LanguageCode, TranslationRecord } from "@/lib/types";
import { cn } from "@/lib/cn";

interface HistoryPanelProps {
  records: TranslationRecord[];
  onRecordsChange: (records: TranslationRecord[]) => void;
  onReplay: (record: TranslationRecord) => void;
  onMessage: (title: string, description?: string, variant?: "default" | "success" | "error") => void;
}

type DateFilter = "all" | "today" | "week" | "month";

function passesDateFilter(record: TranslationRecord, filter: DateFilter) {
  if (filter === "all") return true;
  const createdAt = new Date(record.createdAt);
  if (Number.isNaN(createdAt.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (filter === "today") return record.createdAt >= today.getTime();
  if (filter === "week") {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);
    return record.createdAt >= weekStart.getTime();
  }

  return createdAt.getFullYear() === today.getFullYear() && createdAt.getMonth() === today.getMonth();
}

export function HistoryPanel({ records, onRecordsChange, onReplay, onMessage }: HistoryPanelProps) {
  const [query, setQuery] = React.useState("");
  const [favoritesOnly, setFavoritesOnly] = React.useState(false);
  const [dateFilter, setDateFilter] = React.useState<DateFilter>("all");
  const [languageFilter, setLanguageFilter] = React.useState<"all" | LanguageCode>("all");

  const refresh = React.useCallback(async () => {
    onRecordsChange(await getTranslations());
  }, [onRecordsChange]);

  const filtered = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return records.filter((record) => {
      const sourceLanguage = getLanguage(record.sourceLanguage);
      const targetLanguage = getLanguage(record.targetLanguage);
      const text = `${record.sourceText} ${record.translatedText} ${record.pronunciation ?? ""} ${sourceLanguage.name} ${sourceLanguage.nativeName} ${targetLanguage.name} ${targetLanguage.nativeName}`.toLowerCase();
      const languageMatch =
        languageFilter === "all" || record.sourceLanguage === languageFilter || record.targetLanguage === languageFilter;
      return (
        (!normalized || text.includes(normalized)) &&
        (!favoritesOnly || record.favorite) &&
        passesDateFilter(record, dateFilter) &&
        languageMatch
      );
    });
  }, [dateFilter, favoritesOnly, languageFilter, query, records]);

  const pin = async (id: string) => {
    await toggleFavorite(id);
    await refresh();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this saved translation?")) return;
    await deleteTranslation(id);
    await refresh();
    onMessage("Deleted", "Түүхээс устгалаа.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
        <Badge>{filtered.length} saved</Badge>
      </CardHeader>
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
        <label className="relative block">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <span className="sr-only">Search history</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 w-full rounded-app border border-border bg-canvas pl-10 pr-3 text-base text-ink"
            placeholder="Search"
          />
        </label>
        <select
          aria-label="Filter by date"
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value as DateFilter)}
          className="h-11 rounded-app border border-border bg-canvas px-3 text-sm font-semibold text-ink"
        >
          <option value="all">All dates</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
        </select>
        <select
          aria-label="Filter by language"
          value={languageFilter}
          onChange={(event) => setLanguageFilter(event.target.value as "all" | LanguageCode)}
          className="h-11 rounded-app border border-border bg-canvas px-3 text-sm font-semibold text-ink"
        >
          <option value="all">All languages</option>
          {LANGUAGES.map((language) => (
            <option key={language.code} value={language.code}>
              {language.name}
            </option>
          ))}
        </select>
        <Switch label="Favorites" checked={favoritesOnly} onCheckedChange={setFavoritesOnly} />
      </div>

      <div className="mt-5 grid gap-3">
        {filtered.map((record) => (
          <article key={record.id} className="rounded-app border border-border bg-canvas p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Badge>
                  {getLanguage(record.sourceLanguage).nativeName} → {getLanguage(record.targetLanguage).nativeName}
                </Badge>
                <Badge className="gap-2 whitespace-nowrap">
                  <CalendarDays aria-hidden className="h-3.5 w-3.5" />
                  {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(record.createdAt)}
                </Badge>
              </div>
              <div className="flex gap-2">
                <IconButton
                  label={record.favorite ? "Remove favourite" : "Add favourite"}
                  className={cn("h-9 w-9", record.favorite && "border-accent-gold bg-accent-gold/15 text-accent-gold")}
                  onClick={() => pin(record.id)}
                >
                  <Star aria-hidden className={cn("h-4 w-4", record.favorite && "fill-current")} />
                </IconButton>
                <IconButton label="Replay translation" className="h-9 w-9" onClick={() => onReplay(record)}>
                  <Play aria-hidden className="h-4 w-4" />
                </IconButton>
                <IconButton label="Delete translation" className="h-9 w-9" onClick={() => remove(record.id)}>
                  <Trash2 aria-hidden className="h-4 w-4" />
                </IconButton>
              </div>
            </div>
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-muted">{record.sourceText}</p>
            <p className="mt-2 whitespace-pre-wrap break-words text-lg leading-8 text-ink">{record.translatedText}</p>
            {record.pronunciation ? <p className="mt-2 break-words text-sm leading-6 text-muted">{record.pronunciation}</p> : null}
          </article>
        ))}

        {!filtered.length ? (
          <div className="flex min-h-40 items-center justify-center rounded-app border border-dashed border-border text-center text-sm text-muted">
            No saved translations
          </div>
        ) : null}
      </div>
    </Card>
  );
}
