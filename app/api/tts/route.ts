import { jsonError } from "@/lib/server/backendErrors";
import { hasOpenAiKey } from "@/lib/server/openaiBackend";
import { speechWithOpenAi } from "@/lib/server/openaiBackend";
import type { LanguageCode } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function getString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() ?? "";
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const text = getString(payload?.text);
    const voiceId = getString(payload?.voice_id, payload?.voiceId);
    const language = (getString(payload?.language, payload?.target_language) || "en") as LanguageCode;

    if (!text) return Response.json({ message: "No text to speak" }, { status: 400 });

    if (!hasOpenAiKey()) {
      return Response.json({
        provider: "browser-speech",
        speech_text: text,
        text,
        language
      });
    }

    const audio = await speechWithOpenAi({ text, voiceId, language });
    return new Response(audio.body, {
      status: 200,
      headers: {
        "content-type": audio.headers.get("content-type") || "audio/mpeg",
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
