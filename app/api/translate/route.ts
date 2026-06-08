import { jsonError } from "@/lib/server/backendErrors";
import { translateTextServer } from "@/lib/server/openaiBackend";
import type { LanguageCode } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

function getString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() ?? "";
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const text = getString(payload?.text);
    const source = (getString(payload?.source, payload?.source_language) || "auto") as LanguageCode;
    const target = getString(payload?.target, payload?.target_language) as LanguageCode;

    if (!text) return Response.json({ message: "No text to translate" }, { status: 400 });
    if (!target || target === "auto") return Response.json({ message: "Target language is required" }, { status: 400 });

    const output = await translateTextServer({ text, source, target });
    return Response.json({
      translation: output.translation,
      text: output.translation,
      detected_source: source === "auto" ? undefined : source,
      raw: output.raw
    });
  } catch (error) {
    return jsonError(error);
  }
}
