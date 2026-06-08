export type LanguageCode =
  | "auto"
  | "en"
  | "mn"
  | "ru"
  | "kk"
  | "sah"
  | "tyv"
  | "bua"
  | "ky"
  | "uz"
  | "tr"
  | "zh"
  | "ja"
  | "ko"
  | "ar"
  | "es"
  | "fr"
  | "de";

export type ThemeMode = "system" | "light" | "dark";

export type AppMode = "voice" | "text" | "conversation" | "history";

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  region: string;
  script: string;
  defaultVoiceId: string;
  accent: string;
  accent2: string;
  motif: "soyombo" | "mountain" | "river" | "steppe" | "urban" | "silk";
}

export interface TranslationRecord {
  id: string;
  createdAt: number;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  sourceText: string;
  translatedText: string;
  pronunciation?: string;
  favorite: boolean;
  mode: AppMode;
  voiceId?: string;
}

export interface VoiceProfile {
  id: string;
  name: string;
  language: LanguageCode;
  voiceId: string;
  createdAt: number;
  cloned: boolean;
  sampleBlob?: Blob;
  sampleUrl?: string;
  sampleMimeType?: string;
}

export interface TranslateInput {
  text: string;
  source: LanguageCode;
  target: LanguageCode;
}

export interface TranslateOutput {
  text: string;
  detectedSource?: LanguageCode;
  confidence?: number;
  raw?: unknown;
}

export interface AsrOutput {
  text: string;
  language?: LanguageCode;
  raw?: unknown;
}

export interface TtsOutput {
  audioUrl?: string;
  audioBlob?: Blob;
  speechText?: string;
  language?: LanguageCode;
  durationMs?: number;
  raw?: unknown;
}

export interface StreamEvent {
  type: "partial" | "final" | "audio" | "status" | "error";
  transcript?: string;
  translation?: string;
  audioUrl?: string;
  audioBlob?: Blob;
  language?: LanguageCode;
  message?: string;
  raw?: unknown;
}

export interface FriendlyMessage {
  en: string;
  mn: string;
}
