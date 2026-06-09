"use client";

import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { motion } from "framer-motion";
import { Headphones, History, Languages, MessageSquareText, Send, Signal, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useToast } from "@/components/ui/ToastProvider";
import { LanguageSelector } from "@/components/language/LanguageSelector";
import { CulturalBackdrop } from "@/components/language/CulturalBackdrop";
import { MicButton } from "@/components/voice/MicButton";
import { Waveform } from "@/components/voice/Waveform";
import { VoiceSelector } from "@/components/voice/VoiceSelector";
import { VoiceStudio } from "@/components/voice/VoiceStudio";
import { TextTranslationPanel } from "@/components/text/TextTranslationPanel";
import { ConversationMode } from "@/components/conversation/ConversationMode";
import { HistoryPanel } from "@/components/history/HistoryPanel";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useStreamSocket } from "@/hooks/useStreamSocket";
import { getApiBaseUrl, getStreamUrl, playAudio, runSpeechFallback, synthesizeSpeech, translateText } from "@/lib/api";
import { playPop, triggerHaptic } from "@/lib/audioFeedback";
import { queueHistorySync } from "@/lib/backgroundSync";
import { getBrowserSpeechRecognitionCtor, languageToSpeechLocale, readSpeechRecognitionResults, type BrowserSpeechRecognition } from "@/lib/browserSpeech";
import { getFriendlyError } from "@/lib/errors";
import { getTranslations, getVoices, deleteVoice, saveTranslation } from "@/lib/indexedDb";
import { detectBrowserLanguage, getDefaultVoiceId, getLanguage } from "@/lib/languages";
import { getMongolianPronunciationHint } from "@/lib/pronunciation";
import { useAppStore } from "@/lib/store";
import type { AppMode, LanguageCode, StreamEvent, TranslationRecord, VoiceProfile } from "@/lib/types";
import { cn } from "@/lib/cn";

type VoiceStatus = "idle" | "listening" | "processing" | "speaking";
const MAX_QUICK_TEXT_LENGTH = 5000;

const tabItems: Array<{ value: AppMode; label: string; icon: typeof Headphones }> = [
  { value: "voice", label: "Voice", icon: Headphones },
  { value: "text", label: "Text", icon: Languages },
  { value: "conversation", label: "Conversation", icon: MessageSquareText },
  { value: "history", label: "History", icon: History }
];

function isTypingTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(element.tagName) || element.isContentEditable;
}

function samplePhrase(language: LanguageCode) {
  const phrases: Partial<Record<LanguageCode, string>> = {
    mn: "Сайн байна уу",
    en: "Hello, how are you?",
    ru: "Здравствуйте",
    kk: "Сәлеметсіз бе",
    sah: "Дорообо",
    tyv: "Экии",
    bua: "Сайн байна",
    ky: "Саламатсызбы",
    uz: "Assalomu alaykum",
    tr: "Merhaba",
    zh: "你好",
    ja: "こんにちは",
    ko: "안녕하세요",
    ar: "مرحبا",
    es: "Hola",
    fr: "Bonjour",
    de: "Guten Tag"
  };
  return phrases[language] ?? phrases.en ?? "Hello";
}

export function TranslatorShell() {
  const sourceLanguage = useAppStore((state) => state.sourceLanguage);
  const targetLanguage = useAppStore((state) => state.targetLanguage);
  const recentLanguages = useAppStore((state) => state.recentLanguages);
  const selectedVoiceId = useAppStore((state) => state.selectedVoiceId);
  const appMode = useAppStore((state) => state.appMode);
  const setLanguages = useAppStore((state) => state.setLanguages);
  const swapLanguages = useAppStore((state) => state.swapLanguages);
  const setSelectedVoiceId = useAppStore((state) => state.setSelectedVoiceId);
  const setAppMode = useAppStore((state) => state.setAppMode);
  const { notify } = useToast();
  const online = useOnlineStatus();
  const recorder = useAudioRecorder();
  const [historyRecords, setHistoryRecords] = React.useState<TranslationRecord[]>([]);
  const [voices, setVoices] = React.useState<VoiceProfile[]>([]);
  const [voiceStatus, setVoiceStatus] = React.useState<VoiceStatus>("idle");
  const [liveTranscript, setLiveTranscriptState] = React.useState("");
  const [liveTranslation, setLiveTranslationState] = React.useState("");
  const [quickText, setQuickText] = React.useState("");
  const [quickLoading, setQuickLoading] = React.useState(false);
  const liveRef = React.useRef({ transcript: "", translation: "" });
  const browserRecognitionRef = React.useRef<BrowserSpeechRecognition | null>(null);
  const browserTranscriptRef = React.useRef("");
  const receivedStreamRef = React.useRef(false);
  const finalSavedRef = React.useRef(false);
  const fallbackTimerRef = React.useRef<number | null>(null);
  const initializedLocaleRef = React.useRef(false);
  const targetVoice = voices.find((voice) => voice.voiceId === selectedVoiceId && voice.language === targetLanguage);
  const effectiveVoiceId = targetVoice?.voiceId ?? (selectedVoiceId === getDefaultVoiceId(targetLanguage) ? selectedVoiceId : getDefaultVoiceId(targetLanguage));
  const apiBaseUrl = getApiBaseUrl();
  const streamUrl = getStreamUrl();
  const trimmedQuickText = quickText.trim();
  const canTranslateQuickText = trimmedQuickText.length > 0 && quickText.length <= MAX_QUICK_TEXT_LENGTH;

  const message = React.useCallback(
    (title: string, description?: string, variant: "default" | "success" | "error" = "default") => {
      notify({ title, description, variant });
    },
    [notify]
  );

  const refreshVoices = React.useCallback(async () => {
    setVoices(await getVoices());
  }, []);

  React.useEffect(() => {
    void getTranslations().then(setHistoryRecords);
    void refreshVoices();
  }, [refreshVoices]);

  React.useEffect(() => {
    if (initializedLocaleRef.current) return;
    initializedLocaleRef.current = true;
    const browserLanguage = detectBrowserLanguage();
    if (sourceLanguage === "en" && targetLanguage === "mn" && browserLanguage !== "en") {
      setLanguages(browserLanguage, browserLanguage === "mn" ? "en" : "mn");
    }
  }, [setLanguages, sourceLanguage, targetLanguage]);

  const setLiveTranscript = React.useCallback((value: string) => {
    liveRef.current.transcript = value;
    setLiveTranscriptState(value);
  }, []);

  const setLiveTranslation = React.useCallback((value: string) => {
    liveRef.current.translation = value;
    setLiveTranslationState(value);
  }, []);

  const addHistoryRecord = React.useCallback((record: TranslationRecord) => {
    setHistoryRecords((current) => [record, ...current.filter((item) => item.id !== record.id)]);
  }, []);

  const persistRecord = React.useCallback(
    async (
      sourceText: string,
      translatedText: string,
      mode: AppMode,
      source: LanguageCode = sourceLanguage,
      target: LanguageCode = targetLanguage,
      voiceId: string = effectiveVoiceId
    ) => {
      const pronunciation = target === "mn" ? getMongolianPronunciationHint(translatedText) : "";
      const record: TranslationRecord = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        sourceLanguage: source,
        targetLanguage: target,
        sourceText,
        translatedText,
        pronunciation,
        favorite: false,
        mode,
        voiceId
      };
      await saveTranslation(record);
      await queueHistorySync(record);
      addHistoryRecord(record);
      return record;
    },
    [addHistoryRecord, effectiveVoiceId, sourceLanguage, targetLanguage]
  );

  const handleStreamEvent = React.useCallback(
    async (event: StreamEvent) => {
      if (event.type === "status") return;
      if (event.type === "error") {
        message("Live stream failed", "Шууд холболт тасарлаа. REST fallback ашиглана.", "error");
        return;
      }

      receivedStreamRef.current = true;
      if (event.transcript) setLiveTranscript(event.transcript);
      if (event.translation) setLiveTranslation(event.translation);

      if (event.type === "audio") {
        setVoiceStatus("speaking");
        await playAudio({ audioUrl: event.audioUrl, audioBlob: event.audioBlob }).catch(() => undefined);
        setVoiceStatus("idle");
      }

      if (event.type === "final" && !finalSavedRef.current) {
        const transcript = event.transcript || liveRef.current.transcript;
        const translation = event.translation || liveRef.current.translation;
        if (transcript && translation) {
          finalSavedRef.current = true;
          await persistRecord(transcript, translation, "voice", event.language ?? sourceLanguage, targetLanguage);
        }
        setVoiceStatus("idle");
        playPop("success");
      }
    },
    [message, persistRecord, setLiveTranscript, setLiveTranslation, sourceLanguage, targetLanguage]
  );

  const stream = useStreamSocket({
    url: streamUrl || undefined,
    onEvent: handleStreamEvent
  });

  const startBrowserRecognition = React.useCallback(
    (language: LanguageCode) => {
      const SpeechRecognitionCtor = getBrowserSpeechRecognitionCtor();
      if (!SpeechRecognitionCtor) return false;

      const recognition = new SpeechRecognitionCtor();
      recognition.lang = languageToSpeechLocale(language);
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const result = readSpeechRecognitionResults(event);
        const transcript = result.transcript || result.finalTranscript;
        browserTranscriptRef.current = transcript;
        if (transcript) setLiveTranscript(transcript);
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
    },
    [setLiveTranscript]
  );

  const stopBrowserRecognition = React.useCallback(async () => {
    const recognition = browserRecognitionRef.current;
    if (!recognition) return browserTranscriptRef.current.trim();

    browserRecognitionRef.current = null;
    recognition.stop();
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    return browserTranscriptRef.current.trim();
  }, []);

  const translateRecognizedSpeech = React.useCallback(
    async (transcript: string) => {
      setVoiceStatus("processing");
      try {
        const translation = await translateText({
          text: transcript,
          source: sourceLanguage,
          target: targetLanguage
        });
        setLiveTranscript(transcript);
        setLiveTranslation(translation.text);
        await persistRecord(transcript, translation.text, "voice", translation.detectedSource ?? sourceLanguage, targetLanguage);
        setVoiceStatus("speaking");
        await playAudio(await synthesizeSpeech(translation.text, effectiveVoiceId, targetLanguage));
        playPop("success");
      } catch (error) {
        const friendly = getFriendlyError(error);
        message("Voice translation failed", `${friendly.mn} ${friendly.en}`, "error");
        playPop("error");
      } finally {
        setVoiceStatus("idle");
      }
    },
    [effectiveVoiceId, message, persistRecord, setLiveTranscript, setLiveTranslation, sourceLanguage, targetLanguage]
  );

  const runRestFallback = React.useCallback(
    async (blob: Blob) => {
      setVoiceStatus("processing");
      try {
        const output = await runSpeechFallback(blob, sourceLanguage, targetLanguage);
        setLiveTranscript(output.asr.text);
        setLiveTranslation(output.translation.text);
        await persistRecord(output.asr.text, output.translation.text, "voice", output.asr.language ?? sourceLanguage, targetLanguage);
        setVoiceStatus("speaking");
        await playAudio(await synthesizeSpeech(output.translation.text, effectiveVoiceId, targetLanguage));
        playPop("success");
      } catch (error) {
        const friendly = getFriendlyError(error);
        message("Voice translation failed", `${friendly.mn} ${friendly.en}`, "error");
        playPop("error");
      } finally {
        setVoiceStatus("idle");
      }
    },
    [effectiveVoiceId, message, persistRecord, setLiveTranscript, setLiveTranslation, sourceLanguage, targetLanguage]
  );

  const startListening = React.useCallback(async () => {
    if (recorder.isRecording || voiceStatus === "processing") return;
    receivedStreamRef.current = false;
    finalSavedRef.current = false;
    browserTranscriptRef.current = "";
    setLiveTranscript("");
    setLiveTranslation("");
    setVoiceStatus("listening");
    const usingBrowserRecognition = !stream.enabled && startBrowserRecognition(sourceLanguage);
    if (stream.enabled) {
      stream.connect();
      stream.sendJson({
        type: "start",
        source: sourceLanguage,
        source_language: sourceLanguage,
        target: targetLanguage,
        target_language: targetLanguage,
        voice_id: effectiveVoiceId
      });
    }
    try {
      await recorder.start({
        onChunk: stream.enabled ? (chunk) => stream.sendBlob(chunk) : undefined
      });
      if (usingBrowserRecognition) {
        message("Listening", "Browser speech recognition is active.");
      }
      triggerHaptic(10);
      playPop("start");
    } catch (error) {
      setVoiceStatus("idle");
      stream.disconnect();
      browserRecognitionRef.current?.abort();
      browserRecognitionRef.current = null;
      const friendly = getFriendlyError(error);
      message("Microphone blocked", `${friendly.mn} ${friendly.en}`, "error");
    }
  }, [effectiveVoiceId, message, recorder, setLiveTranscript, setLiveTranslation, sourceLanguage, startBrowserRecognition, stream, targetLanguage, voiceStatus]);

  const stopListening = React.useCallback(async () => {
    if (!recorder.isRecording) return;
    const blob = await recorder.stop();
    setVoiceStatus("processing");
    triggerHaptic([8, 18, 8]);
    playPop("stop");
    if (stream.enabled) {
      stream.sendJson({ type: "stop" });
    }
    const browserTranscript = await stopBrowserRecognition();
    if (browserTranscript) {
      await translateRecognizedSpeech(browserTranscript);
      return;
    }
    if (!blob) {
      setVoiceStatus("idle");
      stream.disconnect();
      message("No speech captured", "Дуу бичигдсэнгүй. Дахин оролдоно уу.");
      return;
    }
    if (!stream.enabled) {
      await runRestFallback(blob);
      return;
    }
    if (fallbackTimerRef.current) window.clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = window.setTimeout(() => {
      if (!receivedStreamRef.current) void runRestFallback(blob);
    }, 1100);
  }, [message, recorder, runRestFallback, stopBrowserRecognition, stream, translateRecognizedSpeech]);

  React.useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (appMode !== "voice" || event.key !== " " || event.repeat || isTypingTarget(event.target)) return;
      event.preventDefault();
      void startListening();
    };
    const keyUp = (event: KeyboardEvent) => {
      if (appMode !== "voice" || event.key !== " " || isTypingTarget(event.target)) return;
      event.preventDefault();
      void stopListening();
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
    };
  }, [appMode, startListening, stopListening]);

  React.useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) window.clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  const translateQuickText = async () => {
    if (!canTranslateQuickText || quickLoading) return;
    setQuickLoading(true);
    try {
      const output = await translateText({ text: trimmedQuickText, source: sourceLanguage, target: targetLanguage });
      setLiveTranscript(trimmedQuickText);
      setLiveTranslation(output.text);
      await persistRecord(trimmedQuickText, output.text, "text", output.detectedSource ?? sourceLanguage, targetLanguage);
      message("Translated", "Орчуулга хадгалагдлаа.", "success");
      try {
        setVoiceStatus("speaking");
        await playAudio(await synthesizeSpeech(output.text, effectiveVoiceId, targetLanguage));
      } catch (speechError) {
        const friendly = getFriendlyError(speechError);
        message("Speech failed", `${friendly.mn} ${friendly.en}`, "error");
      } finally {
        setVoiceStatus("idle");
      }
    } catch (error) {
      const friendly = getFriendlyError(error);
      message("Text translation failed", `${friendly.mn} ${friendly.en}`, "error");
    } finally {
      setQuickLoading(false);
    }
  };

  const replayRecord = async (record: TranslationRecord) => {
    try {
      await playAudio(await synthesizeSpeech(record.translatedText, record.voiceId ?? getDefaultVoiceId(record.targetLanguage), record.targetLanguage));
    } catch (error) {
      const friendly = getFriendlyError(error);
      message("Replay failed", `${friendly.mn} ${friendly.en}`, "error");
    }
  };

  const playVoiceSample = async (voice: VoiceProfile) => {
    if (voice.sampleUrl) {
      await new Audio(voice.sampleUrl).play().catch(() => undefined);
      return;
    }
    await playAudio(await synthesizeSpeech(samplePhrase(voice.language), voice.voiceId, voice.language));
  };

  const removeVoice = async (voiceProfileId: string) => {
    const voice = voices.find((item) => item.id === voiceProfileId);
    await deleteVoice(voiceProfileId);
    if (selectedVoiceId === voice?.voiceId) setSelectedVoiceId(undefined);
    await refreshVoices();
    message("Voice deleted", "Дуу хоолой устгагдлаа.");
  };

  const onVoiceCreated = (voice: VoiceProfile) => {
    setVoices((current) => [voice, ...current.filter((item) => item.id !== voice.id)]);
    setSelectedVoiceId(voice.voiceId);
  };

  const statusText = voiceStatus === "listening" ? "Listening" : voiceStatus === "processing" ? "Processing" : voiceStatus === "speaking" ? "Speaking" : "Ready";

  return (
    <main className="min-h-dvh bg-canvas text-ink safe-bottom">
      <header className="sticky top-0 z-40 border-b border-border bg-canvas/86 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-app bg-accent text-white shadow-glow">
              <Languages aria-hidden className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold text-ink">MotherTonguer</p>
              <p className="max-w-[min(58vw,28rem)] truncate text-xs text-muted" title={apiBaseUrl}>
                {apiBaseUrl}
              </p>
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
            <Badge className={cn("gap-2", online ? "border-success/30 text-success" : "border-danger/30 text-danger")}>
              {online ? <Signal aria-hidden className="h-3.5 w-3.5" /> : <WifiOff aria-hidden className="h-3.5 w-3.5" />}
              {online ? "Online" : "Offline"}
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
        <div className="relative overflow-hidden rounded-app border border-border bg-panel/90 p-4 shadow-soft sm:p-6">
          <CulturalBackdrop languageCode={targetLanguage} />
          <div className="relative z-10 space-y-5">
            <LanguageSelector
              source={sourceLanguage}
              target={targetLanguage}
              recentLanguages={recentLanguages}
              onChange={setLanguages}
              onSwap={swapLanguages}
            />

            <Tabs.Root value={appMode} onValueChange={(value) => setAppMode(value as AppMode)}>
              <Tabs.List className="scrollbar-none flex gap-2 overflow-x-auto rounded-app border border-border bg-panel p-1" aria-label="Translator modes">
                {tabItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Tabs.Trigger
                      key={item.value}
                      value={item.value}
                      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-app px-3 text-sm font-semibold text-muted transition data-[state=active]:bg-accent data-[state=active]:text-white"
                    >
                      <Icon aria-hidden className="h-4 w-4" />
                      {item.label}
                    </Tabs.Trigger>
                  );
                })}
              </Tabs.List>

              <Tabs.Content value="voice" className="mt-5">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
                  <Card className="glass-panel">
                    <CardHeader>
                      <CardTitle>Live Translate</CardTitle>
                      <Badge>{statusText}</Badge>
                    </CardHeader>
                    <div className="grid gap-5 lg:grid-cols-[auto_1fr] lg:items-center">
                      <div className="flex justify-center">
                        <MicButton
                          isRecording={recorder.isRecording}
                          disabled={voiceStatus === "processing" || voiceStatus === "speaking"}
                          onStart={() => void startListening()}
                          onStop={() => void stopListening()}
                        />
                      </div>
                      <div className="space-y-4">
                        <Waveform levels={recorder.levels} active={recorder.isRecording} />
                        <div className="grid gap-3 md:grid-cols-2" aria-live="polite">
                          <div className="min-h-32 rounded-app border border-border bg-canvas p-4">
                            <p className="text-xs font-semibold uppercase text-muted">Transcript</p>
                            <p className="mt-2 whitespace-pre-wrap break-words text-base leading-7 text-ink">{liveTranscript || "..."}</p>
                          </div>
                          <div className="min-h-32 rounded-app border border-border bg-canvas p-4">
                            <p className="text-xs font-semibold uppercase text-muted">Translation</p>
                            <p className="mt-2 whitespace-pre-wrap break-words text-lg leading-8 text-ink">{liveTranslation || "..."}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
                      <Textarea
                        label="Quick text"
                        value={quickText}
                        onChange={(event) => setQuickText(event.target.value)}
                        className="min-h-24"
                        placeholder="Type text"
                        maxLength={MAX_QUICK_TEXT_LENGTH}
                      />
                      <div className="flex items-end">
                        <Button
                          type="button"
                          className="w-full md:w-auto"
                          loading={quickLoading}
                          disabled={!canTranslateQuickText}
                          onClick={translateQuickText}
                        >
                          <Send aria-hidden className="h-4 w-4" />
                          Translate
                        </Button>
                      </div>
                    </div>
                  </Card>

                  <motion.aside
                    className="space-y-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28 }}
                  >
                    <Card className="glass-panel">
                      <VoiceSelector
                        language={targetLanguage}
                        voices={voices}
                        selectedVoiceId={effectiveVoiceId}
                        onSelect={setSelectedVoiceId}
                        onPlaySample={(voice) => void playVoiceSample(voice)}
                        onDelete={removeVoice}
                      />
                    </Card>
                    <VoiceStudio language={targetLanguage} onCreated={onVoiceCreated} onMessage={message} />
                  </motion.aside>
                </div>
              </Tabs.Content>

              <Tabs.Content value="text" className="mt-5">
                <TextTranslationPanel
                  source={sourceLanguage}
                  target={targetLanguage}
                  voiceId={effectiveVoiceId}
                  onHistoryAdded={addHistoryRecord}
                  onMessage={message}
                />
              </Tabs.Content>

              <Tabs.Content value="conversation" className="mt-5">
                <ConversationMode
                  source={sourceLanguage}
                  target={targetLanguage}
                  voiceId={effectiveVoiceId}
                  onHistoryAdded={addHistoryRecord}
                  onMessage={message}
                />
              </Tabs.Content>

              <Tabs.Content value="history" className="mt-5">
                <HistoryPanel
                  records={historyRecords}
                  onRecordsChange={setHistoryRecords}
                  onReplay={(record) => void replayRecord(record)}
                  onMessage={message}
                />
              </Tabs.Content>
            </Tabs.Root>
          </div>
        </div>
      </section>
    </main>
  );
}
