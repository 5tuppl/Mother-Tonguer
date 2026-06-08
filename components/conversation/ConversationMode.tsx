"use client";

import * as React from "react";
import { Mic, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Waveform } from "@/components/voice/Waveform";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { getDefaultVoiceId, getLanguage } from "@/lib/languages";
import { playAudio, runSpeechFallback, synthesizeSpeech, translateText } from "@/lib/api";
import { saveTranslation } from "@/lib/indexedDb";
import { queueHistorySync } from "@/lib/backgroundSync";
import { getBrowserSpeechRecognitionCtor, languageToSpeechLocale, readSpeechRecognitionResults, type BrowserSpeechRecognition } from "@/lib/browserSpeech";
import { getMongolianPronunciationHint } from "@/lib/pronunciation";
import { getFriendlyError } from "@/lib/errors";
import { playPop, triggerHaptic } from "@/lib/audioFeedback";
import type { LanguageCode, TranslationRecord } from "@/lib/types";
import { cn } from "@/lib/cn";

type Side = "left" | "right";

interface ConversationMessage {
  id: string;
  side: Side;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  transcript: string;
  translation: string;
  createdAt: number;
  voiceId: string;
}

interface ConversationModeProps {
  source: LanguageCode;
  target: LanguageCode;
  voiceId: string;
  onHistoryAdded: (record: TranslationRecord) => void;
  onMessage: (title: string, description?: string, variant?: "default" | "success" | "error") => void;
}

function languagesForSide(side: Side, source: LanguageCode, target: LanguageCode) {
  return side === "left"
    ? { from: source === "auto" ? "en" : source, to: target }
    : { from: target, to: source === "auto" ? "en" : source };
}

export function ConversationMode({ source, target, voiceId, onHistoryAdded, onMessage }: ConversationModeProps) {
  const recorder = useAudioRecorder();
  const [activeSide, setActiveSide] = React.useState<Side | null>(null);
  const [processingSide, setProcessingSide] = React.useState<Side | null>(null);
  const [messages, setMessages] = React.useState<ConversationMessage[]>([]);
  const activeSideRef = React.useRef<Side | null>(null);
  const browserRecognitionRef = React.useRef<BrowserSpeechRecognition | null>(null);
  const browserTranscriptRef = React.useRef("");

  const startBrowserRecognition = React.useCallback((language: LanguageCode) => {
    const SpeechRecognitionCtor = getBrowserSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) return false;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = languageToSpeechLocale(language);
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const result = readSpeechRecognitionResults(event);
      browserTranscriptRef.current = result.transcript || result.finalTranscript;
    };
    recognition.onerror = () => undefined;
    recognition.onend = () => {
      if (browserRecognitionRef.current === recognition) browserRecognitionRef.current = null;
    };

    try {
      recognition.start();
      browserRecognitionRef.current = recognition;
      return true;
    } catch {
      browserRecognitionRef.current = null;
      return false;
    }
  }, []);

  const stopBrowserRecognition = React.useCallback(async () => {
    const recognition = browserRecognitionRef.current;
    if (!recognition) return browserTranscriptRef.current.trim();

    browserRecognitionRef.current = null;
    recognition.stop();
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    return browserTranscriptRef.current.trim();
  }, []);

  const finishTurn = React.useCallback(async () => {
    const side = activeSideRef.current;
    if (!side) return;
    activeSideRef.current = null;
    setActiveSide(null);
    setProcessingSide(side);
    const blob = await recorder.stop();
    const browserTranscript = await stopBrowserRecognition();
    if (!blob && !browserTranscript) {
      setProcessingSide(null);
      onMessage("No speech captured", "Дуу бичигдсэнгүй. Дахин оролдоно уу.");
      return;
    }

    const { from, to } = languagesForSide(side, source, target);
    const responseVoiceId = side === "left" ? voiceId : getDefaultVoiceId(to);

    try {
      const output = browserTranscript
        ? {
            asr: { text: browserTranscript, language: from },
            translation: await translateText({ text: browserTranscript, source: from, target: to })
          }
        : await runSpeechFallback(blob as Blob, from, to);
      const pronunciation = to === "mn" ? getMongolianPronunciationHint(output.translation.text) : "";
      const record: TranslationRecord = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        sourceLanguage: output.asr.language ?? from,
        targetLanguage: to,
        sourceText: output.asr.text,
        translatedText: output.translation.text,
        pronunciation,
        favorite: false,
        mode: "conversation",
        voiceId: responseVoiceId
      };
      await saveTranslation(record);
      await queueHistorySync(record);
      onHistoryAdded(record);
      setMessages((current) => [
        ...current,
        {
          id: record.id,
          side,
          sourceLanguage: record.sourceLanguage,
          targetLanguage: to,
          transcript: output.asr.text,
          translation: output.translation.text,
          createdAt: record.createdAt,
          voiceId: responseVoiceId
        }
      ]);
      await playAudio(await synthesizeSpeech(output.translation.text, responseVoiceId, to));
      playPop("success");
    } catch (error) {
      const friendly = getFriendlyError(error);
      onMessage("Conversation failed", `${friendly.mn} ${friendly.en}`, "error");
      playPop("error");
    } finally {
      setProcessingSide(null);
    }
  }, [onHistoryAdded, onMessage, recorder, source, stopBrowserRecognition, target, voiceId]);

  const startTurn = async (side: Side) => {
    if (activeSide || processingSide) return;
    activeSideRef.current = side;
    setActiveSide(side);
    const { from } = languagesForSide(side, source, target);
    browserTranscriptRef.current = "";
    const usingBrowserRecognition = startBrowserRecognition(from);
    try {
      await recorder.start({
        silenceMs: 1350,
        silenceThreshold: 0.06,
        onSilence: finishTurn
      });
      triggerHaptic(10);
      playPop("start");
      onMessage("Listening", usingBrowserRecognition ? `${getLanguage(from).nativeName} · Browser speech recognition` : getLanguage(from).nativeName);
    } catch (error) {
      activeSideRef.current = null;
      setActiveSide(null);
      browserRecognitionRef.current?.abort();
      browserRecognitionRef.current = null;
      const friendly = getFriendlyError(error);
      onMessage("Microphone blocked", `${friendly.mn} ${friendly.en}`, "error");
      playPop("error");
    }
  };

  const replay = async (message: ConversationMessage) => {
    try {
      await playAudio(await synthesizeSpeech(message.translation, message.voiceId, message.targetLanguage));
    } catch (error) {
      const friendly = getFriendlyError(error);
      onMessage("Replay failed", `${friendly.mn} ${friendly.en}`, "error");
    }
  };

  return (
    <section className="rounded-app border border-border bg-panel p-4 shadow-soft sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Conversation</h2>
        <div className="flex gap-2">
          <Badge>{getLanguage(source).nativeName}</Badge>
          <Badge>{getLanguage(target).nativeName}</Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {(["left", "right"] as Side[]).map((side) => {
          const { from, to } = languagesForSide(side, source, target);
          const busy = processingSide === side;
          const active = activeSide === side;
          return (
            <div key={side} className="rounded-app border border-border bg-canvas p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{getLanguage(from).nativeName}</p>
                  <p className="text-xs text-muted">→ {getLanguage(to).nativeName}</p>
                </div>
                {active ? (
                  <Button type="button" variant="danger" loading={busy} onClick={finishTurn}>
                    <Square aria-hidden className="h-4 w-4 fill-current" />
                    Stop
                  </Button>
                ) : (
                  <Button type="button" variant="secondary" loading={busy} disabled={Boolean(activeSide) || Boolean(processingSide)} onClick={() => startTurn(side)}>
                    <Mic aria-hidden className="h-4 w-4" />
                    Speak
                  </Button>
                )}
              </div>
              <div className="mt-4">
                <Waveform levels={active ? recorder.levels : Array.from({ length: 28 }, () => 0.07)} active={active} compact />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 max-h-[460px] space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {messages.map((message) => (
          <article
            key={message.id}
            className={cn(
              "max-w-full rounded-app border border-border bg-canvas p-4 sm:max-w-[88%]",
              message.side === "right" && "sm:ml-auto"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <Badge>
                {getLanguage(message.sourceLanguage).nativeName} → {getLanguage(message.targetLanguage).nativeName}
              </Badge>
              <Button type="button" variant="ghost" size="sm" onClick={() => replay(message)}>
                <Play aria-hidden className="h-4 w-4" />
                Replay
              </Button>
            </div>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-muted">{message.transcript}</p>
            <p className="mt-2 whitespace-pre-wrap break-words text-lg leading-8 text-ink">{message.translation}</p>
          </article>
        ))}
        {!messages.length ? (
          <div className="flex min-h-32 items-center justify-center rounded-app border border-dashed border-border text-sm text-muted">
            Conversation
          </div>
        ) : null}
      </div>
    </section>
  );
}
