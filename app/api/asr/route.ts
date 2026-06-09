import { jsonError } from "@/lib/server/backendErrors";
import { transcribeWithOpenAi } from "@/lib/server/openaiBackend";
import type { LanguageCode } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function getString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() ?? "";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    const source = (getString(formData.get("source"), formData.get("source_language")) || "auto") as LanguageCode;

    if (!(audio instanceof File) || audio.size === 0) {
      return Response.json({ message: "Audio file is required" }, { status: 400 });
    }

    const output = await transcribeWithOpenAi({ audio, source });
    return Response.json({
      text: output.text,
      transcript: output.text,
      language: source === "auto" ? undefined : source,
      raw: output.raw
    });
  } catch (error) {
    return jsonError(error);
  }
}
