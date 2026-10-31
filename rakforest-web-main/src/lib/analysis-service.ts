"use client";
import { analysisStore } from "./analysis-store";
import { parseModelResult, validateAudio, type AnalysisConfig } from "./ml-contract";
import type { AnalysisService } from "./types";

const LOCK = "rakforest-analysis";
async function exclusive<T>(action: () => Promise<T>, recovery = false): Promise<T | undefined> {
  if (!navigator.locks) throw new Error("เบราว์เซอร์นี้ไม่รองรับการจัดการงานวิเคราะห์ กรุณาใช้ Edge หรือ Chrome รุ่นปัจจุบัน");
  return navigator.locks.request(LOCK, { ifAvailable: true }, async lock => {
    if (!lock) { if (recovery) return; throw new Error("มีงานวิเคราะห์อยู่แล้ว กรุณารอให้เสร็จก่อน"); }
    return action();
  });
}
async function getConfig(): Promise<AnalysisConfig> {
  const response = await fetch("/api/ml/config", { cache: "no-store", signal: AbortSignal.timeout(10000) });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error?.message ?? "โหลดการตั้งค่าโมเดลไม่ได้");
  return value;
}
async function processAudio(stationId?: string, audio?: File, fail = false, retryId?: string): Promise<string> {
  await analysis.recover();
  const id = await exclusive(async () => {
    const config = await getConfig();
    if (!config.configured) throw new Error("ยังไม่ได้ตั้งค่า API โมเดลบนเซิร์ฟเวอร์");
    if (audio) validateAudio(audio, config.limits);
    const task = await analysisStore.begin(config.mode, stationId, audio, retryId);
    try {
      validateAudio(task.audio, config.limits);
      const body = new FormData();
      body.set("audio", task.audio); body.set("stationId", task.job.stationId); body.set("requestId", task.job.attemptId!);
      if (config.mode === "mock") body.set("simulateFailure", String(fail));
      const response = await fetch("/api/ml/analyze", { method: "POST", body, signal: AbortSignal.timeout(config.timeoutMs + 10000) });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error?.message ?? "วิเคราะห์เสียงไม่สำเร็จ");
      if (value.source !== config.mode) throw new Error("โหมดบริการเปลี่ยนระหว่างวิเคราะห์ กรุณาลองใหม่");
      const result = parseModelResult(value, task.job.attemptId!, config.mode);
      await analysisStore.complete(task.job, result);
    } catch (e) {
      const message = e instanceof Error && e.name === "TimeoutError" ? "บริการวิเคราะห์ใช้เวลานานเกินกำหนด กรุณาลองใหม่" : e instanceof Error ? e.message : "วิเคราะห์เสียงไม่สำเร็จ";
      await analysisStore.fail(task.job, message);
    }
    return task.job.id;
  });
  return id!;
}
export const analysis: AnalysisService = {
  getConfig,
  recover: () => exclusive(() => analysisStore.recover(), true).then(() => undefined),
  submit: (stationId, audio, fail = false) => processAudio(stationId, audio, fail),
  retry: async id => { await processAudio(undefined, undefined, false, id); }
};
