"use client";

import * as React from "react";
import { Mic, Save, Square } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Waveform } from "@/components/voice/Waveform";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { cloneVoiceSample } from "@/lib/api";
import { getDefaultVoiceId, getLanguage } from "@/lib/languages";
import { saveVoice } from "@/lib/indexedDb";
import { playPop, triggerHaptic } from "@/lib/audioFeedback";
import { getFriendlyError } from "@/lib/errors";
import type { LanguageCode, VoiceProfile } from "@/lib/types";

interface VoiceStudioProps {
  language: LanguageCode;
  onCreated: (voice: VoiceProfile) => void;
  onMessage: (title: string, description?: string, variant?: "default" | "success" | "error") => void;
}

export function VoiceStudio({ language, onCreated, onMessage }: VoiceStudioProps) {
  const recorder = useAudioRecorder();
  const [name, setName] = React.useState("");
  const [sampleBlob, setSampleBlob] = React.useState<Blob | null>(null);
  const [sampleUrl, setSampleUrl] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const languageName = getLanguage(language).nativeName;

  React.useEffect(() => {
    return () => {
      if (sampleUrl) URL.revokeObjectURL(sampleUrl);
    };
  }, [sampleUrl]);

  const start = async () => {
    setSampleBlob(null);
    if (sampleUrl) URL.revokeObjectURL(sampleUrl);
    setSampleUrl(null);
    try {
      await recorder.start();
      triggerHaptic(10);
      playPop("start");
    } catch (error) {
      const friendly = getFriendlyError(error);
      onMessage("Microphone blocked", `${friendly.mn} ${friendly.en}`, "error");
      playPop("error");
    }
  };

  const stop = async () => {
    const blob = await recorder.stop();
    if (!blob) {
      onMessage("No audio captured", "Дуу бичигдсэнгүй. Дахин оролдоно уу.");
      return;
    }
    if (sampleUrl) URL.revokeObjectURL(sampleUrl);
    const url = URL.createObjectURL(blob);
    setSampleBlob(blob);
    setSampleUrl(url);
    triggerHaptic([8, 20, 8]);
    playPop("stop");
  };

  const createVoice = async () => {
    if (!sampleBlob || saving) return;
    setSaving(true);
    const voiceName = name.trim() || `${languageName} voice`;

    try {
      const cloned = await cloneVoiceSample(sampleBlob, voiceName, language);
      const stored = await saveVoice({ ...cloned, sampleUrl: sampleUrl ?? undefined });
      onCreated(stored);
      onMessage("Voice ready", "Дуу хоолой бэлэн боллоо.", "success");
      setName("");
      setSampleBlob(null);
      if (sampleUrl) URL.revokeObjectURL(sampleUrl);
      setSampleUrl(null);
    } catch (error) {
      const localVoice: VoiceProfile = {
        id: `voice-${crypto.randomUUID()}`,
        name: voiceName,
        language,
        voiceId: getDefaultVoiceId(language),
        createdAt: Date.now(),
        cloned: false,
        sampleBlob,
        sampleUrl: sampleUrl ?? undefined,
        sampleMimeType: sampleBlob.type
      };
      try {
        const stored = await saveVoice(localVoice);
        onCreated(stored);
        const friendly = getFriendlyError(error);
        onMessage("Sample saved", `${friendly.mn} ${friendly.en}`, "error");
      } catch (storageError) {
        const friendly = getFriendlyError(storageError);
        onMessage("Sample could not be saved", `${friendly.mn} ${friendly.en}`, "error");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voice Studio</CardTitle>
        <span className="break-words text-right text-sm font-semibold text-muted" dir="auto">
          {languageName}
        </span>
      </CardHeader>
      <div className="space-y-4">
        <Waveform levels={recorder.levels} active={recorder.isRecording} compact />
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink">Voice name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={saving}
              maxLength={80}
              className="h-11 w-full rounded-app border border-border bg-canvas px-3 text-base text-ink"
              placeholder="My voice"
            />
          </label>
          <div className="flex items-end gap-2">
            {recorder.isRecording ? (
              <Button type="button" variant="danger" disabled={saving} onClick={stop}>
                <Square aria-hidden className="h-4 w-4 fill-current" />
                Stop
              </Button>
            ) : (
              <Button type="button" variant="secondary" disabled={saving} onClick={start}>
                <Mic aria-hidden className="h-4 w-4" />
                Record
              </Button>
            )}
          </div>
        </div>
        {sampleUrl ? (
          <audio className="w-full" controls src={sampleUrl}>
            <track kind="captions" />
          </audio>
        ) : null}
        <Button type="button" className="w-full" loading={saving} disabled={!sampleBlob || recorder.isRecording} onClick={createVoice}>
          <Save aria-hidden className="h-4 w-4" />
          Create voice
        </Button>
      </div>
    </Card>
  );
}
