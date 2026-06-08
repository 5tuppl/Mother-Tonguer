import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { TranslationRecord, VoiceProfile } from "@/lib/types";

interface MotherTonguerDb extends DBSchema {
  history: {
    key: string;
    value: TranslationRecord;
    indexes: {
      "by-createdAt": number;
    };
  };
  voices: {
    key: string;
    value: Omit<VoiceProfile, "sampleUrl">;
    indexes: {
      "by-createdAt": number;
      "by-language": string;
    };
  };
}

const DB_NAME = "mothertonguer-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<MotherTonguerDb>> | null = null;
let memoryHistory: TranslationRecord[] = [];
let memoryVoices: Array<Omit<VoiceProfile, "sampleUrl">> = [];

function hasIndexedDb() {
  return typeof indexedDB !== "undefined";
}

async function getDb() {
  if (!hasIndexedDb()) return null;
  dbPromise ??= openDB<MotherTonguerDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("history")) {
        const store = db.createObjectStore("history", { keyPath: "id" });
        store.createIndex("by-createdAt", "createdAt");
      }
      if (!db.objectStoreNames.contains("voices")) {
        const store = db.createObjectStore("voices", { keyPath: "id" });
        store.createIndex("by-createdAt", "createdAt");
        store.createIndex("by-language", "language");
      }
    }
  });
  return dbPromise;
}

export async function saveTranslation(record: TranslationRecord) {
  const db = await getDb();
  if (!db) {
    memoryHistory = [record, ...memoryHistory.filter((item) => item.id !== record.id)].slice(0, 500);
    return record;
  }
  await db.put("history", record);
  return record;
}

export async function getTranslations() {
  const db = await getDb();
  if (!db) return [...memoryHistory].sort((a, b) => b.createdAt - a.createdAt);
  const records = await db.getAllFromIndex("history", "by-createdAt");
  return records.reverse();
}

export async function toggleFavorite(id: string) {
  const db = await getDb();
  if (!db) {
    memoryHistory = memoryHistory.map((record) => (record.id === id ? { ...record, favorite: !record.favorite } : record));
    return memoryHistory.find((record) => record.id === id);
  }

  const record = await db.get("history", id);
  if (!record) return undefined;
  const updated = { ...record, favorite: !record.favorite };
  await db.put("history", updated);
  return updated;
}

export async function deleteTranslation(id: string) {
  const db = await getDb();
  if (!db) {
    memoryHistory = memoryHistory.filter((record) => record.id !== id);
    return;
  }
  await db.delete("history", id);
}

export async function saveVoice(profile: VoiceProfile) {
  const { sampleUrl, ...stored } = profile;
  const db = await getDb();
  if (!db) {
    memoryVoices = [stored, ...memoryVoices.filter((voice) => voice.id !== stored.id)];
    return { ...stored, sampleUrl };
  }
  await db.put("voices", stored);
  return { ...stored, sampleUrl };
}

export async function getVoices() {
  const db = await getDb();
  const voices = db ? await db.getAllFromIndex("voices", "by-createdAt") : memoryVoices;
  return voices
    .slice()
    .reverse()
    .map((voice) => ({
      ...voice,
      sampleUrl: voice.sampleBlob ? URL.createObjectURL(voice.sampleBlob) : undefined
    }));
}

export async function deleteVoice(id: string) {
  const db = await getDb();
  if (!db) {
    memoryVoices = memoryVoices.filter((voice) => voice.id !== id);
    return;
  }
  await db.delete("voices", id);
}
