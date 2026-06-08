type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.AudioContext ?? (window as typeof window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
}

export function triggerHaptic(pattern: number | number[] = 12) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

export function playPop(tone: "start" | "stop" | "success" | "error" = "success") {
  const AudioContextClass = getAudioContextCtor();
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;

  const frequencies = {
    start: 420,
    stop: 280,
    success: 640,
    error: 160
  };

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequencies[tone], now);
  oscillator.frequency.exponentialRampToValueAtTime(frequencies[tone] * 1.35, now + 0.08);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(tone === "error" ? 0.035 : 0.025, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.14);
  oscillator.addEventListener("ended", () => void context.close());
}
