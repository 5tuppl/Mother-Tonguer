"use client";

import { Play, Trash2, UserRound } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/Badge";
import { getDefaultVoiceId, getLanguage } from "@/lib/languages";
import type { LanguageCode, VoiceProfile } from "@/lib/types";
import { cn } from "@/lib/cn";

interface VoiceSelectorProps {
  language: LanguageCode;
  voices: VoiceProfile[];
  selectedVoiceId?: string;
  onSelect: (voiceId: string) => void;
  onPlaySample: (voice: VoiceProfile) => void;
  onDelete: (voiceId: string) => void;
}

export function VoiceSelector({ language, voices, selectedVoiceId, onSelect, onPlaySample, onDelete }: VoiceSelectorProps) {
  const defaultVoiceId = getDefaultVoiceId(language);
  const languageLabel = getLanguage(language).nativeName;
  const selected = selectedVoiceId ?? defaultVoiceId;
  const confirmDelete = (voice: VoiceProfile) => {
    if (window.confirm(`Delete "${voice.name}"?`)) onDelete(voice.id);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Voice</h2>
        <Badge className="max-w-40 truncate" dir="auto">
          {languageLabel}
        </Badge>
      </div>
      <div className="scrollbar-none flex gap-3 overflow-x-auto pb-1" aria-label="Voice selector">
        <button
          type="button"
          aria-pressed={selected === defaultVoiceId}
          className={cn(
            "w-56 shrink-0 rounded-app border p-4 text-left transition",
            selected === defaultVoiceId ? "border-accent bg-accent/10" : "border-border bg-panel hover:border-accent/45"
          )}
          onClick={() => onSelect(defaultVoiceId)}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white">
            <UserRound aria-hidden className="h-5 w-5" />
          </span>
          <span className="mt-3 block text-sm font-semibold text-ink">Native voice</span>
          <span className="mt-1 block truncate text-xs text-muted">{defaultVoiceId}</span>
        </button>
        {voices
          .filter((voice) => voice.language === language)
          .map((voice) => (
            <div
              key={voice.id}
              className={cn(
                "w-60 shrink-0 rounded-app border bg-panel p-4 transition",
                selected === voice.voiceId ? "border-accent bg-accent/10" : "border-border"
              )}
            >
              <button
                type="button"
                className="block w-full text-left"
                aria-pressed={selected === voice.voiceId}
                onClick={() => onSelect(voice.voiceId)}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-red text-white">
                  <UserRound aria-hidden className="h-5 w-5" />
                </span>
                <span className="mt-3 block break-words text-sm font-semibold text-ink">{voice.name}</span>
                <span className="mt-1 block text-xs text-muted">{voice.cloned ? "Cloned voice" : "Saved sample"}</span>
              </button>
              <div className="mt-3 flex gap-2">
                <IconButton label={`Play ${voice.name}`} className="h-9 w-9" onClick={() => onPlaySample(voice)}>
                  <Play aria-hidden className="h-4 w-4" />
                </IconButton>
                <IconButton label={`Delete ${voice.name}`} className="h-9 w-9" onClick={() => confirmDelete(voice)}>
                  <Trash2 aria-hidden className="h-4 w-4" />
                </IconButton>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
