import type { TranslationRecord } from "@/lib/types";

interface SyncRegistration extends ServiceWorkerRegistration {
  sync?: {
    register: (tag: string) => Promise<void>;
  };
}

export async function queueHistorySync(record: TranslationRecord) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  const registration = (await navigator.serviceWorker.ready.catch(() => null)) as SyncRegistration | null;
  if (!registration?.active) return;

  registration.active.postMessage({
    type: "QUEUE_HISTORY_SYNC",
    record,
    syncUrl: "/api/history/sync"
  });

  await registration.sync?.register("sync-translation-history").catch(() => undefined);
}
