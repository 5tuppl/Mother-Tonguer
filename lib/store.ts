"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { normalizeLanguagePair } from "@/lib/languages";
import type { AppMode, LanguageCode, ThemeMode } from "@/lib/types";

interface AppState {
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  recentLanguages: LanguageCode[];
  theme: ThemeMode;
  accent: "blue" | "red" | "gold";
  selectedVoiceId?: string;
  appMode: AppMode;
  setLanguages: (source: LanguageCode, target: LanguageCode) => void;
  swapLanguages: () => void;
  pushRecentLanguage: (language: LanguageCode) => void;
  setTheme: (theme: ThemeMode) => void;
  setAccent: (accent: AppState["accent"]) => void;
  setSelectedVoiceId: (voiceId?: string) => void;
  setAppMode: (mode: AppMode) => void;
}

function addRecent(current: LanguageCode[], language: LanguageCode) {
  if (language === "auto") return current;
  return [language, ...current.filter((item) => item !== language)].slice(0, 8);
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      sourceLanguage: "en",
      targetLanguage: "mn",
      recentLanguages: ["mn", "en", "ru", "kk"],
      theme: "system",
      accent: "blue",
      appMode: "voice",
      setLanguages: (sourceLanguage, targetLanguage) =>
        set((state) => {
          const normalized = normalizeLanguagePair(sourceLanguage, targetLanguage, state.targetLanguage);
          return {
            sourceLanguage: normalized.source,
            targetLanguage: normalized.target,
            recentLanguages: addRecent(addRecent(state.recentLanguages, normalized.source), normalized.target)
          };
        }),
      swapLanguages: () =>
        set((state) => {
          const normalized = normalizeLanguagePair(state.targetLanguage, state.sourceLanguage);
          return {
            sourceLanguage: normalized.source,
            targetLanguage: normalized.target,
            recentLanguages: addRecent(addRecent(state.recentLanguages, normalized.source), normalized.target)
          };
        }),
      pushRecentLanguage: (language) => set((state) => ({ recentLanguages: addRecent(state.recentLanguages, language) })),
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setSelectedVoiceId: (selectedVoiceId) => set({ selectedVoiceId }),
      setAppMode: (appMode) => set({ appMode })
    }),
    {
      name: "mothertonguer-preferences",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sourceLanguage: state.sourceLanguage,
        targetLanguage: state.targetLanguage,
        recentLanguages: state.recentLanguages,
        theme: state.theme,
        accent: state.accent,
        selectedVoiceId: state.selectedVoiceId,
        appMode: state.appMode
      }),
      onRehydrateStorage: () => (state) => {
        if (state && !state.recentLanguages.includes("mn")) {
          state.recentLanguages = ["mn", ...state.recentLanguages].slice(0, 8) as LanguageCode[];
        }
        const browserLanguage = typeof navigator !== "undefined" ? navigator.language.toLowerCase().split("-")[0] : "";
        if (state && state.sourceLanguage === "en" && browserLanguage === "mn") {
          state.sourceLanguage = "mn";
          state.targetLanguage = "en";
        }
        if (state) {
          const normalized = normalizeLanguagePair(state.sourceLanguage, state.targetLanguage);
          state.sourceLanguage = normalized.source;
          state.targetLanguage = normalized.target;
        }
      }
    }
  )
);

export function getSelectedVoiceId() {
  return useAppStore.getState().selectedVoiceId;
}
