"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LanguageCode, StreamEvent } from "@/lib/types";

type SocketStatus = "idle" | "connecting" | "open" | "closed" | "error";

interface UseStreamSocketOptions {
  url?: string;
  onEvent?: (event: StreamEvent) => void;
  reconnect?: boolean;
}

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() ?? "";
}

function audioUrlFromBase64(base64: string, mimeType = "audio/mpeg") {
  const binary = window.atob(base64.includes(",") ? base64.split(",").pop() ?? "" : base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

function normalizeJsonEvent(raw: Record<string, unknown>): StreamEvent {
  const eventType = firstString(raw.type, raw.event, raw.kind).toLowerCase();
  const transcript = firstString(raw.partial_transcript, raw.transcript, raw.text, raw.asr, raw.source_text);
  const translation = firstString(raw.partial_translation, raw.translation, raw.translated_text, raw.target_text);
  const audioUrl = firstString(raw.audio_url, raw.audioUrl, raw.url, raw.stream_url);
  const audioBase64 = firstString(raw.audio_base64, raw.audio, raw.data);
  const message = firstString(raw.message, raw.error, raw.detail);

  if (message && (eventType === "error" || raw.error)) {
    return { type: "error", message, raw };
  }

  if (audioUrl || audioBase64) {
    return {
      type: "audio",
      transcript,
      translation,
      audioUrl: audioUrl || audioUrlFromBase64(audioBase64, firstString(raw.mime_type, raw.content_type) || "audio/mpeg"),
      raw
    };
  }

  if (eventType === "final" || raw.final === true || raw.is_final === true) {
    return { type: "final", transcript, translation, language: firstString(raw.language) as LanguageCode | undefined, raw };
  }

  if (transcript || translation) {
    return { type: "partial", transcript, translation, language: firstString(raw.language) as LanguageCode | undefined, raw };
  }

  return { type: "status", message: message || eventType || "stream-update", raw };
}

export function useStreamSocket({ url, onEvent, reconnect = true }: UseStreamSocketOptions) {
  const [status, setStatus] = useState<SocketStatus>("idle");
  const [lastEvent, setLastEvent] = useState<StreamEvent | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const queueRef = useRef<Array<string | Blob | ArrayBuffer>>([]);
  const retryRef = useRef(0);
  const retryTimerRef = useRef<number | null>(null);
  const intentionalCloseRef = useRef(false);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const emit = useCallback((event: StreamEvent) => {
    setLastEvent(event);
    onEventRef.current?.(event);
  }, []);

  const flushQueue = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const queue = queueRef.current.splice(0, queueRef.current.length);
    for (const item of queue) socket.send(item);
  }, []);

  const connect = useCallback(() => {
    if (!url) return;
    if (typeof WebSocket === "undefined") return;
    const existing = socketRef.current;
    if (existing?.readyState === WebSocket.OPEN || existing?.readyState === WebSocket.CONNECTING) return;

    intentionalCloseRef.current = false;
    setStatus("connecting");
    const socket = new WebSocket(url);
    socket.binaryType = "arraybuffer";
    socketRef.current = socket;

    socket.onopen = () => {
      retryRef.current = 0;
      setStatus("open");
      flushQueue();
      emit({ type: "status", message: "connected" });
    };

    socket.onmessage = (event) => {
      if (typeof event.data === "string") {
        try {
          emit(normalizeJsonEvent(JSON.parse(event.data) as Record<string, unknown>));
        } catch {
          emit({ type: "status", message: event.data });
        }
        return;
      }

      const audioBlob =
        event.data instanceof Blob ? event.data : new Blob([event.data as ArrayBuffer], { type: "audio/mpeg" });
      emit({ type: "audio", audioBlob, audioUrl: URL.createObjectURL(audioBlob) });
    };

    socket.onerror = () => {
      setStatus("error");
      emit({ type: "error", message: "stream-error" });
    };

    socket.onclose = () => {
      socketRef.current = null;
      setStatus(intentionalCloseRef.current ? "closed" : "error");
      if (!intentionalCloseRef.current && reconnect) {
        const delay = Math.min(1000 * 2 ** retryRef.current, 8000);
        retryRef.current += 1;
        retryTimerRef.current = window.setTimeout(connect, delay);
      }
    };
  }, [emit, flushQueue, reconnect, url]);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
    queueRef.current = [];
    socketRef.current?.close(1000, "client-close");
    socketRef.current = null;
    setStatus("closed");
  }, []);

  const send = useCallback(
    (payload: string | Blob | ArrayBuffer | Record<string, unknown>) => {
      if (!url) return false;
      const normalized = typeof payload === "string" || payload instanceof Blob || payload instanceof ArrayBuffer
        ? payload
        : JSON.stringify(payload);
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        queueRef.current.push(normalized);
        if (!socket || socket.readyState === WebSocket.CLOSED) connect();
        return false;
      }
      socket.send(normalized);
      return true;
    },
    [connect, url]
  );

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return {
    status,
    lastEvent,
    enabled: Boolean(url),
    connect,
    disconnect,
    send,
    sendJson: send,
    sendBlob: send
  };
}
