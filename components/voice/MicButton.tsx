"use client";

import * as React from "react";
import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/cn";

interface MicButtonProps {
  isRecording: boolean;
  disabled?: boolean;
  onStart: () => void;
  onStop: () => void;
  label?: string;
}

export function MicButton({ isRecording, disabled, onStart, onStop, label = "Record speech" }: MicButtonProps) {
  const pointerDownRef = React.useRef(false);

  const start = React.useCallback(() => {
    if (disabled || isRecording) return;
    pointerDownRef.current = true;
    onStart();
  }, [disabled, isRecording, onStart]);

  const stop = React.useCallback(() => {
    if (disabled || !pointerDownRef.current) return;
    pointerDownRef.current = false;
    onStop();
  }, [disabled, onStop]);

  return (
    <button
      type="button"
      aria-label={isRecording ? "Stop recording" : label}
      aria-pressed={isRecording}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-28 w-28 select-none items-center justify-center rounded-full text-white shadow-glow transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:h-32 sm:w-32",
        isRecording ? "bg-danger" : "bg-accent"
      )}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        start();
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onKeyDown={(event) => {
        if ((event.key === " " || event.key === "Enter") && !event.repeat) {
          event.preventDefault();
          start();
        }
      }}
      onKeyUp={(event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          stop();
        }
      }}
    >
      <span
        className={cn(
          "absolute inset-0 rounded-full border border-white/35",
          isRecording && "animate-ping opacity-75"
        )}
      />
      {isRecording ? <Square aria-hidden className="h-10 w-10 fill-current" /> : <Mic aria-hidden className="h-12 w-12" />}
    </button>
  );
}
