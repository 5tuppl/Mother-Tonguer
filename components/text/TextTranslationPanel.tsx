"use client";

import * as React from "react";
import useSWRMutation from "swr/mutation";
import { Languages, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { getLanguage } from "@/lib/languages";
import { playAudio, synthesizeSpeech, translateText } from "@/lib/api";
import { getMongolianPronunciationHint } from "@/lib/pronunciation";
import { saveTranslation } from "@/lib/indexedDb";
import { queueHistorySync } from "@/lib/backgroundSync";
import { getFriendlyError } from "@/lib/errors";
import type { LanguageCode, TranslateInput, TranslationRecord } from "@/lib/types";

interface TextTranslationPanelProps {
  source: LanguageCode;
  target: LanguageCode;
  voiceId: string;
  onHistoryAdded: (record: TranslationRecord) => void;
  onMessage: (title: string, description?: string, variant?: "default" | "success" | "error") => void;
}

async function translateFetcher(_: string, { arg }: { arg: TranslateInput }) {
  return translateText(arg);
}

const MAX_TEXT_LENGTH = 5000;

export function TextTranslationPanel({ source, target, voiceId, onHistoryAdded, onMessage }: TextTranslationPanelProps) {
  const [text, setText] = React.useState("");
  const [translation, setTranslation] = React.useState("");
  const [detectedSource, setDetectedSource] = React.useState<LanguageCode | undefined>();
  const [speaking, setSpeaking] = React.useState(false);
  const { trigger, isMutating } = useSWRMutation("translate-text", translateFetcher);
  const trimmedText = text.trim();
  const canTranslate = trimmedText.length > 0 && text.length <= MAX_TEXT_LENGTH;
  const pronunciation = target === "mn" ? getMongolianPronunciationHint(translation) : "";

  React.useEffect(() => {
    setTranslation("");
    setDetectedSource(undefined);
  }, [source, target, text]);

  const runTranslate = async () => {
    if (!canTranslate || isMutating) return;
    try {
      const output = await trigger({ text: trimmedText, source, target });
      const outputPronunciation = target === "mn" ? getMongolianPronunciationHint(output.text) : "";
      setTranslation(output.text);
      setDetectedSource(output.detectedSource);
      const record: TranslationRecord = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        sourceLanguage: output.detectedSource ?? source,
        targetLanguage: target,
        sourceText: trimmedText,
        translatedText: output.text,
        pronunciation: outputPronunciation,
        favorite: false,
        mode: "text",
        voiceId
      };
      await saveTranslation(record);
      await queueHistorySync(record);
      onHistoryAdded(record);
      onMessage("Translated", "Орчуулга хадгалагдлаа.", "success");
    } catch (error) {
      const friendly = getFriendlyError(error);
      onMessage("Text translation failed", `${friendly.mn} ${friendly.en}`, "error");
    }
  };

  const speak = async () => {
    if (!translation) return;
    setSpeaking(true);
    try {
      await playAudio(await synthesizeSpeech(translation, voiceId, target));
    } catch (error) {
      const friendly = getFriendlyError(error);
      onMessage("Speech failed", `${friendly.mn} ${friendly.en}`, "error");
    } finally {
      setSpeaking(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Text</CardTitle>
          <Badge>
            {getLanguage(source).nativeName} → {getLanguage(target).nativeName}
          </Badge>
        </CardHeader>
        <div className="space-y-4">
          <Textarea
            label="Input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Type or paste text"
            maxLength={MAX_TEXT_LENGTH}
          />
          <div className="flex justify-end text-xs font-semibold text-muted" aria-live="polite">
            {text.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()}
          </div>
          <Button type="button" className="w-full" loading={isMutating} disabled={!canTranslate} onClick={runTranslate}>
            <Languages aria-hidden className="h-4 w-4" />
            Translate
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Output</CardTitle>
          {detectedSource ? <Badge>Detected {getLanguage(detectedSource).nativeName}</Badge> : null}
        </CardHeader>
        <div className="min-h-36 rounded-app border border-border bg-canvas p-4" aria-live="polite">
          {translation ? (
            <p className="whitespace-pre-wrap break-words text-lg leading-8 text-ink">{translation}</p>
          ) : (
            <div className="flex min-h-28 items-center justify-center text-sm text-muted">
              <Sparkles aria-hidden className="mr-2 h-4 w-4" />
              Translation
            </div>
          )}
        </div>
        {pronunciation ? (
          <div className="mt-3 rounded-app border border-accent/25 bg-accent/8 p-3">
            <p className="text-xs font-semibold uppercase text-muted">Pronunciation</p>
            <p className="mt-1 break-words text-sm leading-6 text-ink">{pronunciation}</p>
          </div>
        ) : null}
        <Button type="button" variant="secondary" className="mt-4 w-full" loading={speaking} disabled={!translation} onClick={speak}>
          <Play aria-hidden className="h-4 w-4" />
          Speak
        </Button>
      </Card>
    </div>
  );
}
