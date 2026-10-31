import { seed, stations } from "./fixtures";
import type { Snapshot } from "./types";
const DB_NAME = "rakforest-demo-v1";
let database: Promise<IDBDatabase> | undefined;
function open() {
  if (!database) database = new Promise<IDBDatabase>((resolve,reject) => {
    const request = indexedDB.open(DB_NAME,1);
    request.onupgradeneeded = () => request.result.createObjectStore("state");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = undefined; reject(new Error("เปิดพื้นที่เก็บข้อมูลไม่ได้ กรุณาอนุญาตการจัดเก็บในเบราว์เซอร์")); };
  });
  return database;
}
// One read/write transaction serializes transitions, including concurrent tabs.
export async function update<T>(action: (state: Snapshot) => T, readSnapshot = false): Promise<T> {
  const db = await open();
  return new Promise((resolve,reject) => {
    const tx = db.transaction("state","readwrite"), store = tx.objectStore("state");
    const req = store.get("main");
    let result: T, failure: unknown;
    req.onsuccess = () => {
      try {
        const state: Snapshot = req.result ?? seed();
        const migrated = state.version !== 2 || !state.stations || state.incidents.some(i=>!i.prediction.source) || state.jobs.some(j=>!j.source);
        if (migrated) {
          state.version=2; state.stations ??= structuredClone(stations);
          for (const job of state.jobs) { job.source ??= "mock"; job.stationSnapshot ??= structuredClone(state.stations.find(s=>s.id===job.stationId)); }
          for (const item of state.incidents) { item.prediction.source ??= "mock"; item.prediction.stationSnapshot ??= structuredClone(state.stations.find(s=>s.id===item.prediction.stationId)); }
        }
        const before = readSnapshot ? JSON.stringify(state.jobs) : "";
        result = action(state);
        if (migrated || !readSnapshot || !req.result || before !== JSON.stringify(state.jobs)) store.put(state,"main");
      } catch(error) { failure=error; tx.abort(); }
    };
    tx.oncomplete = () => { window.dispatchEvent(new Event("rakforest-update")); resolve(result); };
    tx.onabort = tx.onerror = () => reject(failure ?? new Error("บันทึกข้อมูลไม่สำเร็จ พื้นที่จัดเก็บอาจเต็ม กรุณาลองใหม่"));
  });
}
