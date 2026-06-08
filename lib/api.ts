import { AppError } from "@/lib/errors";
import { languageToSpeechLocale } from "@/lib/browserSpeech";
import type { AsrOutput, LanguageCode, TranslateInput, TranslateOutput, TtsOutput, VoiceProfile } from "@/lib/types";

const REQUEST_TIMEOUT_MS = 30_000;
const PLACEHOLDER_HOSTS = new Set(["your-api-domain.com", "your-translation-api.example"]);

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() ?? "";
}

function cleanConfiguredUrl(value: string | undefined, protocols: string[]) {
  const raw = value?.trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (!protocols.includes(url.protocol)) return "";
    if (PLACEHOLDER_HOSTS.has(url.hostname)) return "";
    return raw.replace(/\/$/, "");
  } catch {
    return "";
  }
}

function getConfiguredApiBaseUrl() {
  return cleanConfiguredUrl(process.env.NEXT_PUBLIC_API_BASE_URL, ["http:", "https:"]);
}

function getApiUrl(path: string) {
  const configured = getConfiguredApiBaseUrl();
  return configured ? `${configured}${path}` : `/api${path}`;
}

export function getApiBaseUrl() {
  const configured = getConfiguredApiBaseUrl();
  if (configured) return configured;
  return "Same-origin API";
}

export function getStreamUrl() {
  const configured = cleanConfiguredUrl(process.env.NEXT_PUBLIC_WS_URL, ["ws:", "wss:"]);
  if (configured) return configured;

  const apiBaseUrl = getConfiguredApiBaseUrl();
  if (!apiBaseUrl) return "";

  try {
    const url = new URL(apiBaseUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/stream";
    url.search = "";
    return url.toString();
  } catch {
    return "";
  }
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: init.signal ?? controller.signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AppError("Request timed out", "network");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function requestJson<T>(path: string, init: RequestInit) {
  const response = await fetchWithTimeout(getApiUrl(path), {
    ...init,
    headers: {
      accept: "application/json",
      ...(init.body instanceof FormData ? {} : { "content-type": "application/json" }),
      ...init.headers
    }
  });

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    throw new AppError(
      typeof body === "string" ? body : firstString(body?.message, body?.error, body?.detail) || `Request failed with ${response.status}`,
      response.status >= 500 ? "backend" : "network",
      response.status
    );
  }

  return body as T;
}

export async function transcribeAudio(audio: Blob, source: LanguageCode): Promise<AsrOutput> {
  const formData = new FormData();
  formData.append("audio", audio, `speech-${Date.now()}.${audio.type.includes("mp4") ? "mp4" : "webm"}`);
  if (source !== "auto") {
    formData.append("source", source);
    formData.append("source_language", source);
  }

  const raw = await requestJson<Record<string, unknown>>("/asr", {
    method: "POST",
    body: formData
  });

  const text = firstString(raw.text, raw.transcription, raw.transcript, raw.result);
  if (!text) throw new AppError("ASR response did not include text", "backend");

  return {
    text,
    language: firstString(raw.language, raw.detected_language, raw.source) as LanguageCode | undefined,
    raw
  };
}

export async function translateText(input: TranslateInput): Promise<TranslateOutput> {
  if (!input.text.trim()) throw new AppError("No text to translate", "emptyText");

  const raw = await requestJson<Record<string, unknown>>("/translate", {
    method: "POST",
    body: JSON.stringify({
      text: input.text,
      source: input.source,
      target: input.target,
      source_language: input.source,
      target_language: input.target
    })
  });

  const text = firstString(raw.translation, raw.translated_text, raw.text, raw.result);
  if (!text) throw new AppError("Translation response did not include text", "backend");

  return {
    text,
    detectedSource: firstString(raw.detected_source, raw.detected_language, raw.source_language) as LanguageCode | undefined,
    confidence: typeof raw.confidence === "number" ? raw.confidence : undefined,
    raw
  };
}

function audioUrlFromBase64(base64: string, mimeType = "audio/mpeg") {
  const binary = window.atob(base64.includes(",") ? base64.split(",").pop() ?? "" : base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

export async function synthesizeSpeech(text: string, voiceId: string, language: LanguageCode): Promise<TtsOutput> {
  if (!text.trim()) throw new AppError("No text to speak", "emptyText");

  const response = await fetchWithTimeout(getApiUrl("/tts"), {
    method: "POST",
    headers: {
      accept: "application/json, audio/*",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      text,
      voice_id: voiceId,
      voiceId,
      language,
      target_language: language
    })
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json") ? await response.json().catch(() => null) : await response.text();
    const message =
      typeof body === "string" ? body : firstString(body?.message, body?.error, body?.detail) || `TTS failed with ${response.status}`;
    throw new AppError(message, response.status >= 500 ? "backend" : "network", response.status);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.startsWith("audio/") || contentType.includes("octet-stream")) {
    const audioBlob = await response.blob();
    return { audioBlob, audioUrl: URL.createObjectURL(audioBlob) };
  }

  const raw = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!raw) throw new AppError("TTS response was empty", "backend");

  const audioUrl = firstString(raw.audio_url, raw.audioUrl, raw.url, raw.file, raw.stream_url);
  const audioBase64 = firstString(raw.audio_base64, raw.audio, raw.data);
  const speechText = firstString(raw.speech_text, raw.speechText);

  if (audioUrl) return { audioUrl, durationMs: typeof raw.duration_ms === "number" ? raw.duration_ms : undefined, raw };
  if (audioBase64) return { audioUrl: audioUrlFromBase64(audioBase64, firstString(raw.mime_type, raw.content_type) || "audio/mpeg"), raw };
  if (speechText) return { speechText, language, raw };

  throw new AppError("TTS response did not include audio", "backend");
}

export async function cloneVoiceSample(sample: Blob, name: string, language: LanguageCode): Promise<VoiceProfile> {
  const formData = new FormData();
  formData.append("sample", sample, `voice-${Date.now()}.${sample.type.includes("mp4") ? "mp4" : "webm"}`);
  formData.append("name", name);
  formData.append("language", language);
  formData.append("target_language", language);

  const raw = await requestJson<Record<string, unknown>>("/voices/clone", {
    method: "POST",
    body: formData
  });

  const voiceId = firstString(raw.voice_id, raw.voiceId, raw.id);
  if (!voiceId) throw new AppError("Clone response did not include a voice id", "backend");

  return {
    id: `voice-${crypto.randomUUID()}`,
    name,
    language,
    voiceId,
    createdAt: Date.now(),
    cloned: true,
    sampleBlob: sample,
    sampleMimeType: sample.type
  };
}

export async function runSpeechFallback(audio: Blob, source: LanguageCode, target: LanguageCode) {
  const asr = await transcribeAudio(audio, source);
  const translation = await translateText({
    text: asr.text,
    source: asr.language ?? source,
    target
  });
  return { asr, translation };
}

export async function playAudio(output: TtsOutput) {
  if (output.speechText) {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      throw new AppError("Browser speech synthesis is not available", "recording");
    }

    await new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(output.speechText);
      utterance.lang = languageToSpeechLocale(output.language ?? "en");
      utterance.onend = () => resolve();
      utterance.onerror = () => reject(new AppError("Browser speech synthesis failed", "backend"));
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
    return;
  }

  const url = output.audioUrl ?? (output.audioBlob ? URL.createObjectURL(output.audioBlob) : undefined);
  if (!url) return;
  const audio = new Audio(url);
  audio.preload = "auto";
  await audio.play();
}
