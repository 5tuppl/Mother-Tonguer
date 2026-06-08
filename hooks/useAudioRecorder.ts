"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppError } from "@/lib/errors";

type RecorderStatus = "idle" | "recording" | "stopping" | "error";

interface StartRecorderOptions {
  onChunk?: (chunk: Blob) => void;
  onSilence?: () => void;
  silenceMs?: number;
  silenceThreshold?: number;
}

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.AudioContext ?? (window as typeof window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
}

function getSupportedMimeType() {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
}

export function useAudioRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [levels, setLevels] = useState<number[]>(Array.from({ length: 28 }, () => 0.08));
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const optionsRef = useRef<StartRecorderOptions>({});
  const silenceStartRef = useRef<number | null>(null);
  const heardVoiceRef = useRef(false);
  const silenceTriggeredRef = useRef(false);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    analyserRef.current = null;
    recorderRef.current = null;
    silenceStartRef.current = null;
    heardVoiceRef.current = false;
    silenceTriggeredRef.current = false;
  }, []);

  const analyse = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const samples = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(samples);
    let sum = 0;
    for (const sample of samples) {
      const centered = (sample - 128) / 128;
      sum += centered * centered;
    }
    const rms = Math.sqrt(sum / samples.length);
    const level = Math.max(0.04, Math.min(1, rms * 3.8));
    const now = performance.now();
    const threshold = optionsRef.current.silenceThreshold ?? 0.07;
    const requiredSilence = optionsRef.current.silenceMs ?? 1500;

    if (level > threshold * 1.8) {
      heardVoiceRef.current = true;
      silenceStartRef.current = null;
    } else if (heardVoiceRef.current && !silenceTriggeredRef.current) {
      silenceStartRef.current ??= now;
      if (now - silenceStartRef.current > requiredSilence) {
        silenceTriggeredRef.current = true;
        optionsRef.current.onSilence?.();
      }
    }

    setElapsedMs(Date.now() - startedAtRef.current);
    setLevels((previous) => [...previous.slice(1), level]);
    animationFrameRef.current = requestAnimationFrame(analyse);
  }, []);

  const start = useCallback(
    async (options: StartRecorderOptions = {}) => {
      if (status === "recording") return;
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        const appError = new AppError("MediaRecorder is not available", "recording");
        setError(appError);
        setStatus("error");
        throw appError;
      }

      setError(null);
      optionsRef.current = options;
      chunksRef.current = [];
      silenceStartRef.current = null;
      silenceTriggeredRef.current = false;
      heardVoiceRef.current = false;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1
          }
        });
        const AudioContextClass = getAudioContextCtor();
        if (!AudioContextClass) throw new AppError("AudioContext is not available", "recording");

        const audioContext = new AudioContextClass();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.74;
        audioContext.createMediaStreamSource(stream).connect(analyser);

        const mimeType = getSupportedMimeType();
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        recorder.ondataavailable = (event) => {
          if (event.data.size <= 0) return;
          chunksRef.current.push(event.data);
          optionsRef.current.onChunk?.(event.data);
        };
        recorder.onerror = () => {
          const appError = new AppError("Recorder failed", "recording");
          setError(appError);
          setStatus("error");
        };

        streamRef.current = stream;
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        recorderRef.current = recorder;
        startedAtRef.current = Date.now();
        setElapsedMs(0);
        setStatus("recording");
        recorder.start(250);
        animationFrameRef.current = requestAnimationFrame(analyse);
      } catch (caughtError) {
        cleanup();
        const normalized =
          caughtError instanceof DOMException && (caughtError.name === "NotAllowedError" || caughtError.name === "SecurityError")
            ? new AppError(caughtError.message, "micBlocked")
            : caughtError instanceof Error
              ? caughtError
              : new AppError("Recording could not start", "recording");
        setError(normalized);
        setStatus("error");
        throw normalized;
      }
    },
    [analyse, cleanup, status]
  );

  const stop = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      cleanup();
      setStatus("idle");
      return null;
    }

    setStatus("stopping");
    const mimeType = recorder.mimeType || "audio/webm";

    return await new Promise<Blob | null>((resolve) => {
      recorder.onstop = () => {
        const blob = chunksRef.current.length ? new Blob(chunksRef.current, { type: mimeType }) : null;
        cleanup();
        setStatus("idle");
        setElapsedMs(0);
        resolve(blob);
      };
      recorder.requestData();
      recorder.stop();
    });
  }, [cleanup]);

  const cancel = useCallback(() => {
    cleanup();
    chunksRef.current = [];
    setStatus("idle");
    setElapsedMs(0);
  }, [cleanup]);

  useEffect(() => cleanup, [cleanup]);

  return {
    status,
    isRecording: status === "recording",
    levels,
    elapsedMs,
    error,
    start,
    stop,
    cancel
  };
}
