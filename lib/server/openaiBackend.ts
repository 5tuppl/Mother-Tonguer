import type { LanguageCode } from "@/lib/types";
import { BackendError } from "@/lib/server/backendErrors";

const OPENAI_API_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_TRANSLATION_MODEL = "gpt-4o-mini";
const DEFAULT_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
const DEFAULT_TTS_MODEL = "gpt-4o-mini-tts";
const DEFAULT_TTS_VOICE = "coral";
const OPENAI_VOICES = new Set([
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar"
]);

const languageNames: Record<LanguageCode, string> = {
  auto: "auto-detected language",
  en: "English",
  mn: "Mongolian",
  ru: "Russian",
  kk: "Kazakh",
  sah: "Sakha",
  tyv: "Tuvan",
  bua: "Buryat",
  ky: "Kyrgyz",
  uz: "Uzbek",
  tr: "Turkish",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  ar: "Arabic",
  es: "Spanish",
  fr: "French",
  de: "German"
};

function getOpenAiKey() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new BackendError("OPENAI_API_KEY is not configured", 500);
  return key;
}

export function hasOpenAiKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

async function openAiFetch(path: string, init: RequestInit) {
  const response = await fetch(`${OPENAI_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getOpenAiKey()}`,
      ...init.headers
    }
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json") ? await response.json().catch(() => null) : await response.text();
    const message =
      typeof body === "string"
        ? body
        : body?.error?.message ?? body?.message ?? `OpenAI request failed with ${response.status}`;
    throw new BackendError(message, response.status >= 500 ? 502 : response.status);
  }

  return response;
}

function firstOutputText(raw: Record<string, unknown>) {
  if (typeof raw.output_text === "string" && raw.output_text.trim()) return raw.output_text.trim();
  const output = Array.isArray(raw.output) ? raw.output : [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown }).content) ? (item as { content: unknown[] }).content : [];
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string" && text.trim()) return text.trim();
    }
  }

  return "";
}

export async function translateWithOpenAi({
  text,
  source,
  target
}: {
  text: string;
  source: LanguageCode;
  target: LanguageCode;
}) {
  const sourceName = languageNames[source] ?? source;
  const targetName = languageNames[target] ?? target;
  const response = await openAiFetch("/responses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_TRANSLATION_MODEL?.trim() || DEFAULT_TRANSLATION_MODEL,
      instructions:
        "You are a precise translation engine. Return only the translated text, without quotes, labels, explanations, or extra commentary. Preserve paragraph breaks and punctuation.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Source language: ${sourceName}\nTarget language: ${targetName}\n\nText:\n${text}`
            }
          ]
        }
      ],
      max_output_tokens: 4096
    })
  });

  const raw = (await response.json()) as Record<string, unknown>;
  const translation = firstOutputText(raw);
  if (!translation) throw new BackendError("Translation response did not include text", 502);
  return { translation, raw };
}

function getMachineTranslationLanguage(language: LanguageCode) {
  return language === "auto" ? "auto" : language;
}

function parseGoogleTranslateResponse(raw: unknown) {
  if (!Array.isArray(raw) || !Array.isArray(raw[0])) return "";

  return raw[0]
    .map((part) => (Array.isArray(part) && typeof part[0] === "string" ? part[0] : ""))
    .join("")
    .trim();
}

async function fetchTranslationJson(url: URL, provider: string) {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        accept: "application/json"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "network error";
    throw new BackendError(`${provider} translation fallback is unreachable: ${message}`, 502);
  }

  if (!response.ok) {
    throw new BackendError(`${provider} translation fallback failed with ${response.status}`, response.status >= 500 ? 502 : response.status);
  }

  return response.json();
}

export async function translateWithGoogle({
  text,
  source,
  target
}: {
  text: string;
  source: LanguageCode;
  target: LanguageCode;
}) {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", getMachineTranslationLanguage(source));
  url.searchParams.set("tl", getMachineTranslationLanguage(target));
  url.searchParams.append("dt", "t");
  url.searchParams.set("q", text);

  const raw = await fetchTranslationJson(url, "Google");
  const translation = parseGoogleTranslateResponse(raw);
  if (!translation) throw new BackendError("Google translation fallback did not include text", 502);
  return { translation, raw };
}

export async function translateWithLingva({
  text,
  source,
  target
}: {
  text: string;
  source: LanguageCode;
  target: LanguageCode;
}) {
  const sourceLanguage = getMachineTranslationLanguage(source);
  const targetLanguage = getMachineTranslationLanguage(target);
  const url = new URL(
    `https://lingva.ml/api/v1/${encodeURIComponent(sourceLanguage)}/${encodeURIComponent(targetLanguage)}/${encodeURIComponent(text)}`
  );

  const raw = (await fetchTranslationJson(url, "Lingva")) as Record<string, unknown>;
  const translation = typeof raw.translation === "string" ? raw.translation.trim() : "";
  if (!translation) throw new BackendError("Lingva translation fallback did not include text", 502);
  return { translation, raw };
}

export async function translateWithMyMemory({
  text,
  source,
  target
}: {
  text: string;
  source: LanguageCode;
  target: LanguageCode;
}) {
  if (source === "auto") throw new BackendError("MyMemory translation fallback does not support auto source detection", 400);

  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", `${getMachineTranslationLanguage(source)}|${getMachineTranslationLanguage(target)}`);

  const raw = (await fetchTranslationJson(url, "MyMemory")) as Record<string, unknown>;
  const responseData = raw.responseData && typeof raw.responseData === "object" ? (raw.responseData as Record<string, unknown>) : {};
  const translation = typeof responseData.translatedText === "string" ? responseData.translatedText.trim() : "";
  if (!translation) throw new BackendError("MyMemory translation fallback did not include text", 502);
  return { translation, raw };
}

export async function translateWithNoKeyFallback(input: { text: string; source: LanguageCode; target: LanguageCode }) {
  const providers = [translateWithLingva, translateWithMyMemory, translateWithGoogle];
  const errors: string[] = [];

  for (const provider of providers) {
    try {
      return await provider(input);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new BackendError(`No no-key translation fallback succeeded: ${errors.join("; ")}`, 502);
}

export async function translateTextServer(input: { text: string; source: LanguageCode; target: LanguageCode }) {
  return hasOpenAiKey() ? translateWithOpenAi(input) : translateWithNoKeyFallback(input);
}

function getOpenAiLanguageHint(language: LanguageCode) {
  return language !== "auto" && language.length === 2 ? language : undefined;
}

export async function transcribeWithOpenAi({
  audio,
  source
}: {
  audio: File;
  source: LanguageCode;
}) {
  const body = new FormData();
  body.append("file", audio, audio.name || "speech.webm");
  body.append("model", process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() || DEFAULT_TRANSCRIPTION_MODEL);
  body.append("response_format", "json");
  const language = getOpenAiLanguageHint(source);
  if (language) body.append("language", language);

  const response = await openAiFetch("/audio/transcriptions", {
    method: "POST",
    body
  });

  const raw = (await response.json()) as Record<string, unknown>;
  const text = typeof raw.text === "string" ? raw.text.trim() : "";
  if (!text) throw new BackendError("Transcription response did not include text", 502);
  return { text, raw };
}

function normalizeVoice(voiceId: string | undefined) {
  const configured = process.env.OPENAI_TTS_VOICE?.trim();
  if (configured?.startsWith("voice_")) return { id: configured };
  if (configured && OPENAI_VOICES.has(configured)) return configured;
  if (voiceId?.startsWith("voice_")) return { id: voiceId };
  if (voiceId && OPENAI_VOICES.has(voiceId)) return voiceId;
  return DEFAULT_TTS_VOICE;
}

export async function speechWithOpenAi({
  text,
  voiceId,
  language
}: {
  text: string;
  voiceId?: string;
  language: LanguageCode;
}) {
  const response = await openAiFetch("/audio/speech", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL?.trim() || DEFAULT_TTS_MODEL,
      voice: normalizeVoice(voiceId),
      input: text,
      response_format: "mp3",
      instructions: `Speak naturally and clearly in ${languageNames[language] ?? language}.`
    })
  });

  return response;
}
