import type { Language, LanguageCode } from "@/lib/types";

export const AUTO_LANGUAGE: Language = {
  code: "auto",
  name: "Auto detect",
  nativeName: "Автоматаар",
  region: "Browser",
  script: "Detected",
  defaultVoiceId: "auto",
  accent: "#2563eb",
  accent2: "#f2c14e",
  motif: "urban"
};

export const LANGUAGES: Language[] = [
  {
    code: "mn",
    name: "Mongolian",
    nativeName: "Монгол",
    region: "Mongolia",
    script: "Cyrillic",
    defaultVoiceId: "mn-MN-YesuiNeural",
    accent: "#0066cc",
    accent2: "#d51c2f",
    motif: "soyombo"
  },
  {
    code: "en",
    name: "English",
    nativeName: "English",
    region: "United States",
    script: "Latin",
    defaultVoiceId: "en-US-AndrewNeural",
    accent: "#2563eb",
    accent2: "#16a34a",
    motif: "urban"
  },
  {
    code: "ru",
    name: "Russian",
    nativeName: "Русский",
    region: "Russia",
    script: "Cyrillic",
    defaultVoiceId: "ru-RU-DmitryNeural",
    accent: "#dc2626",
    accent2: "#2563eb",
    motif: "river"
  },
  {
    code: "kk",
    name: "Kazakh",
    nativeName: "Қазақша",
    region: "Kazakhstan",
    script: "Cyrillic",
    defaultVoiceId: "kk-KZ-AigulNeural",
    accent: "#0ea5e9",
    accent2: "#facc15",
    motif: "steppe"
  },
  {
    code: "sah",
    name: "Sakha",
    nativeName: "Саха тыла",
    region: "Sakha",
    script: "Cyrillic",
    defaultVoiceId: "sah-RU-Standard",
    accent: "#0f766e",
    accent2: "#f59e0b",
    motif: "mountain"
  },
  {
    code: "tyv",
    name: "Tuvan",
    nativeName: "Тыва дыл",
    region: "Tuva",
    script: "Cyrillic",
    defaultVoiceId: "tyv-RU-Standard",
    accent: "#7c3aed",
    accent2: "#14b8a6",
    motif: "mountain"
  },
  {
    code: "bua",
    name: "Buryat",
    nativeName: "Буряад",
    region: "Buryatia",
    script: "Cyrillic",
    defaultVoiceId: "bua-RU-Standard",
    accent: "#0891b2",
    accent2: "#ef4444",
    motif: "river"
  },
  {
    code: "ky",
    name: "Kyrgyz",
    nativeName: "Кыргызча",
    region: "Kyrgyzstan",
    script: "Cyrillic",
    defaultVoiceId: "ky-KG-Standard",
    accent: "#dc2626",
    accent2: "#fbbf24",
    motif: "mountain"
  },
  {
    code: "uz",
    name: "Uzbek",
    nativeName: "O'zbekcha",
    region: "Uzbekistan",
    script: "Latin",
    defaultVoiceId: "uz-UZ-MadinaNeural",
    accent: "#0284c7",
    accent2: "#22c55e",
    motif: "silk"
  },
  {
    code: "tr",
    name: "Turkish",
    nativeName: "Türkçe",
    region: "Türkiye",
    script: "Latin",
    defaultVoiceId: "tr-TR-AhmetNeural",
    accent: "#dc2626",
    accent2: "#ffffff",
    motif: "urban"
  },
  {
    code: "zh",
    name: "Chinese",
    nativeName: "中文",
    region: "China",
    script: "Han",
    defaultVoiceId: "zh-CN-XiaoxiaoNeural",
    accent: "#dc2626",
    accent2: "#facc15",
    motif: "silk"
  },
  {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    region: "Japan",
    script: "Kana",
    defaultVoiceId: "ja-JP-NanamiNeural",
    accent: "#e11d48",
    accent2: "#64748b",
    motif: "urban"
  },
  {
    code: "ko",
    name: "Korean",
    nativeName: "한국어",
    region: "Korea",
    script: "Hangul",
    defaultVoiceId: "ko-KR-SunHiNeural",
    accent: "#2563eb",
    accent2: "#ef4444",
    motif: "urban"
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    region: "MENA",
    script: "Arabic",
    defaultVoiceId: "ar-SA-HamedNeural",
    accent: "#047857",
    accent2: "#d97706",
    motif: "silk"
  },
  {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    region: "Spain",
    script: "Latin",
    defaultVoiceId: "es-ES-AlvaroNeural",
    accent: "#c2410c",
    accent2: "#eab308",
    motif: "urban"
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    region: "France",
    script: "Latin",
    defaultVoiceId: "fr-FR-HenriNeural",
    accent: "#2563eb",
    accent2: "#dc2626",
    motif: "urban"
  },
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    region: "Germany",
    script: "Latin",
    defaultVoiceId: "de-DE-ConradNeural",
    accent: "#111827",
    accent2: "#f59e0b",
    motif: "urban"
  }
];

export const SOURCE_LANGUAGES = [AUTO_LANGUAGE, ...LANGUAGES];
export const TARGET_LANGUAGES = LANGUAGES;

export function getLanguage(code: LanguageCode) {
  return SOURCE_LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0];
}

export function getTargetLanguage(code: LanguageCode) {
  if (code === "auto") return LANGUAGES[0];
  return LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0];
}

export function getDefaultVoiceId(code: LanguageCode) {
  return getTargetLanguage(code).defaultVoiceId;
}

export function getFallbackTargetLanguage(source: LanguageCode, preferred?: LanguageCode): LanguageCode {
  if (preferred && preferred !== "auto" && preferred !== source) return preferred;
  return source === "mn" ? "en" : "mn";
}

export function normalizeLanguagePair(source: LanguageCode, target: LanguageCode, fallbackTarget?: LanguageCode) {
  const normalizedTarget = target === "auto" ? getFallbackTargetLanguage(source, fallbackTarget) : target;
  return {
    source,
    target: normalizedTarget === source ? getFallbackTargetLanguage(source, fallbackTarget) : normalizedTarget
  };
}

export function detectBrowserLanguage(): LanguageCode {
  if (typeof navigator === "undefined") return "en";
  const browserCodes = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const locale of browserCodes) {
    const shortCode = locale.toLowerCase().split("-")[0] as LanguageCode;
    if (LANGUAGES.some((language) => language.code === shortCode)) return shortCode;
    if (locale.toLowerCase().startsWith("mn")) return "mn";
    if (locale.toLowerCase().startsWith("ru")) return "ru";
    if (locale.toLowerCase().startsWith("kk")) return "kk";
  }
  return "en";
}

export function languageLabel(code: LanguageCode) {
  const language = getLanguage(code);
  return `${language.name} · ${language.nativeName}`;
}

export function languageSearchText(language: Language) {
  return `${language.name} ${language.nativeName} ${language.region} ${language.script} ${language.code}`.toLowerCase();
}

export function getRecentLanguageSet(source: LanguageCode, target: LanguageCode, recent: LanguageCode[]) {
  const candidates = [source, target, ...recent, "mn", "en", "ru", "kk", "sah", "tyv"];
  return Array.from(new Set(candidates)).filter((code) => code !== "auto") as LanguageCode[];
}
