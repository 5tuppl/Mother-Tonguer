import type { FriendlyMessage } from "@/lib/types";

export const friendlyErrors = {
  micBlocked: {
    en: "Microphone access is blocked. Allow the microphone in your browser settings and try again.",
    mn: "Микрофоны зөвшөөрөл хаалттай байна. Хөтчийн тохиргооноос микрофоныг зөвшөөрнө үү."
  },
  network: {
    en: "The translation service is unreachable. Saved phrases still work offline.",
    mn: "Орчуулгын үйлчилгээтэй холбогдож чадсангүй. Хадгалсан хэллэгүүд офлайнаар нээгдэнэ."
  },
  backend: {
    en: "The translator returned an unexpected response. Please try once more.",
    mn: "Орчуулагч санаандгүй хариу өглөө. Дахин оролдоно уу."
  },
  recording: {
    en: "Recording could not start on this device.",
    mn: "Энэ төхөөрөмж дээр бичлэг эхлүүлэх боломжгүй байна."
  },
  emptyText: {
    en: "Enter text before translating.",
    mn: "Орчуулах текстээ оруулна уу."
  }
} satisfies Record<string, FriendlyMessage>;

export type FriendlyErrorKey = keyof typeof friendlyErrors;

export class AppError extends Error {
  friendlyKey: FriendlyErrorKey;
  status?: number;

  constructor(message: string, friendlyKey: FriendlyErrorKey = "backend", status?: number) {
    super(message);
    this.name = "AppError";
    this.friendlyKey = friendlyKey;
    this.status = status;
  }
}

export function getFriendlyError(error: unknown): FriendlyMessage {
  if (error instanceof AppError) {
    const friendly = friendlyErrors[error.friendlyKey];
    return error.message ? { ...friendly, en: `${friendly.en} (${error.message})` } : friendly;
  }
  if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError")) {
    return friendlyErrors.micBlocked;
  }
  if (error instanceof TypeError) return friendlyErrors.network;
  return friendlyErrors.backend;
}
