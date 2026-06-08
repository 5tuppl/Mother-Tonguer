const CACHE_NAME = "mothertonguer-shell-v1";
const RUNTIME_CACHE = "mothertonguer-runtime-v1";
const QUEUE_DB = "mothertonguer-sync-db";
const QUEUE_STORE = "history-outbox";
const CORE_ASSETS = ["/", "/offline", "/manifest.webmanifest", "/icon.svg", "/maskable-icon.svg"];
let historySyncUrl = "/api/history/sync";

function openQueueDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(QUEUE_DB, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
      }
    };
  });
}

async function queueRecord(record) {
  const db = await openQueueDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function readQueuedRecords() {
  const db = await openQueueDb();
  const records = await new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readonly");
    const request = tx.objectStore(QUEUE_STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return records;
}

async function clearQueuedRecords(ids) {
  const db = await openQueueDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    for (const id of ids) tx.objectStore(QUEUE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function notifyClients(message) {
  const windows = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
  for (const client of windows) client.postMessage(message);
}

async function drainHistoryQueue() {
  const records = await readQueuedRecords();
  if (!records.length) return;

  const response = await fetch(historySyncUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ records })
  });

  if (!response.ok) throw new Error(`History sync failed: ${response.status}`);
  await clearQueuedRecords(records.map((record) => record.id));
  await notifyClients({ type: "HISTORY_SYNCED", count: records.length });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.all(CORE_ASSETS.map((asset) => cache.add(asset).catch(() => undefined))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => ![CACHE_NAME, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "QUEUE_HISTORY_SYNC" || !event.data.record) return;
  historySyncUrl = event.data.syncUrl || historySyncUrl;
  event.waitUntil(queueRecord(event.data.record));
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-translation-history") {
    event.waitUntil(drainHistoryQueue());
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match("/offline")) || Response.error())
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
