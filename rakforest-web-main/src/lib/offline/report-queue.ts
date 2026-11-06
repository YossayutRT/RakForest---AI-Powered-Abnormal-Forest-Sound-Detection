"use client";

/**
 * Offline Report Queue for Field Rangers operating in areas without cellular connectivity.
 * Stores pending audio/GPS reports in IndexedDB and syncs automatically when back online.
 */

export interface QueuedFieldReport {
  id: string;
  createdAt: string;
  stationId: string | null;
  zoneId: string | null;
  lat: number;
  lng: number;
  description: string;
  audioBlob?: Blob | null;
  audioName?: string | null;
  audioType?: string | null;
  evidenceBlobs?: { name: string; type: string; blob: Blob }[];
}

const DB_NAME = "rakforest-offline-queue-v1";
const STORE_NAME = "pending_reports";

function openQueueDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const offlineReportQueue = {
  async enqueue(item: Omit<QueuedFieldReport, "id" | "createdAt">): Promise<QueuedFieldReport> {
    const db = await openQueueDb();
    const record: QueuedFieldReport = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    window.dispatchEvent(new CustomEvent("rakforest-offline-queue-changed"));
    return record;
  },

  async list(): Promise<QueuedFieldReport[]> {
    if (typeof window === "undefined" || !("indexedDB" in window)) return [];
    const db = await openQueueDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve((req.result as QueuedFieldReport[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  },

  async remove(id: string): Promise<void> {
    const db = await openQueueDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    window.dispatchEvent(new CustomEvent("rakforest-offline-queue-changed"));
  },
};
