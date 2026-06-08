import type { LanguageCode } from "@/lib/types";

export type BrowserSpeechRecognitionResult = {
  transcript: string;
  isFinal: boolean;
};

export type BrowserSpeechRecognitionEvent = {
  resultIndex: number;
  results: {
    length: number;
    item(index: number): {
      isFinal: boolean;
      length: number;
      item(index: number): { transcript: string };
      [index: number]: { transcript: string };
    };
    [index: number]: {
      isFinal: boolean;
      length: number;
      item(index: number): { transcript: string };
      [index: number]: { transcript: string };
    };
  };
};

export type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error?: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

export function languageToSpeechLocale(language: LanguageCode) {
  const locales: Record<LanguageCode, string> = {
    auto: "en-US",
    en: "en-US",
    mn: "mn-MN",
    ru: "ru-RU",
    kk: "kk-KZ",
    sah: "ru-RU",
    tyv: "ru-RU",
    bua: "ru-RU",
    ky: "ky-KG",
    uz: "uz-UZ",
    tr: "tr-TR",
    zh: "zh-CN",
    ja: "ja-JP",
    ko: "ko-KR",
    ar: "ar-SA",
    es: "es-ES",
    fr: "fr-FR",
    de: "de-DE"
  };
  return locales[language] ?? "en-US";
}

export function getBrowserSpeechRecognitionCtor() {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

export function readSpeechRecognitionResults(event: BrowserSpeechRecognitionEvent) {
  let transcript = "";
  let finalTranscript = "";

  for (let index = 0; index < event.results.length; index += 1) {
    const result = event.results[index] ?? event.results.item(index);
    const alternative = result[0] ?? result.item(0);
    const text = alternative?.transcript ?? "";
    transcript += text;
    if (result.isFinal) finalTranscript += text;
  }

  return {
    transcript: transcript.trim(),
    finalTranscript: finalTranscript.trim()
  };
}
