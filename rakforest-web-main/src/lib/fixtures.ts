import type { Snapshot, Station, Status, Prediction } from "./types";
export const FIELD_USER = "ranger-01";
export const FIELD_NAME = "สมชาย ใจดี";
export const stations: Station[] = [
  { id: "ST-01", name: "เสา A", coordinates: [98.7654,18.1234], radius: 300, active: true },
  { id: "ST-02", name: "เสา B", coordinates: [98.7772,18.1275], radius: 300, active: true },
  { id: "ST-03", name: "เสา C", coordinates: [98.7615,18.1119], radius: 300, active: true }
];
export const statusNames: Record<Status, string> = { pending: "รอตรวจ", dispatched: "ส่งงานแล้ว", acknowledged: "รับทราบแล้ว", submitted: "ส่งผลแล้ว", closed: "ปิดงาน" };
export const soundNames: Record<string,string> = { chainsaw: "เสียงเลื่อยยนต์", vehicle: "เสียงยานพาหนะ", fire: "เสียงไฟ", natural_ambient: "เสียงธรรมชาติ" };
export const outcomeNames = { found: "พบเหตุ", not_found: "ไม่พบเหตุ", unable_to_inspect: "ตรวจสอบไม่ได้" };
export function fixturePrediction(stationId: string, audioId?: string): Prediction {
  const label = stationId === "ST-02" ? "vehicle" : stationId === "ST-03" ? "fire" : "chainsaw";
  const score = label === "vehicle" ? 0.78 : label === "fire" ? 0.82 : 0.9;
  return { id: crypto.randomUUID(), stationId, audioId, label, source: "mock", scores: { [label]: score, natural_ambient: 0.07, [label === "vehicle" ? "chainsaw" : "vehicle"]: Number((0.93-score).toFixed(2)) }, modelVersion: "mock-cnn-v0.1", recordedAt: new Date().toISOString() };
}
export function seed(empty = false): Snapshot {
  return { version: 2, stations: structuredClone(stations), telegramConnected: false, attachments: [], jobs: [], notifications: [], incidents: empty ? [] : stations.map((s,i) => ({
    id: "RF-00"+(i+1), prediction: { ...fixturePrediction(s.id), stationSnapshot: structuredClone(s), recordedAt: "2026-10-17T02:"+["42","15","00"][i]+":00.000Z" },
    status: (["pending","dispatched","submitted"] as Status[])[i],
    assigneeId: i ? FIELD_USER : undefined,
    note: i ? "โปรดตรวจสอบบริเวณ"+s.name : undefined,
    result: i===2 ? { outcome: "not_found", notes: "ตรวจสอบพื้นที่แล้ว ไม่พบเหตุผิดปกติ", imageIds: [] } : undefined,
    history: [{at: "2026-10-17T02:42:00.000Z", text: "ข้อมูลเริ่มต้นสำหรับสาธิต"}]
  })) };
}
