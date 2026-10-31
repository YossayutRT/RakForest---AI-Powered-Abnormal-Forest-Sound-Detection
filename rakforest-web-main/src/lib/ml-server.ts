import { audioLimits, parseModelResult, validateAudio, type AnalysisConfig, type AnalysisResult } from "./ml-contract";
import { fixturePrediction, soundNames } from "./fixtures";

export class ModelError extends Error {
  constructor(public code: string, message: string, public status = 502) { super(message); }
}
export function modelConfig(): AnalysisConfig {
  const mode = process.env.ML_PROVIDER ?? "mock";
  if (mode !== "mock" && mode !== "http") throw new ModelError("CONFIGURATION_ERROR", "ML_PROVIDER ต้องเป็น mock หรือ http", 503);
  const timeoutMs = Number(process.env.ML_TIMEOUT_MS ?? 60000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 300000) throw new ModelError("CONFIGURATION_ERROR", "ML_TIMEOUT_MS ต้องอยู่ระหว่าง 100–300000", 503);
  let configured = mode === "mock";
  if (mode === "http" && process.env.AI_CLASSIFICATION_ENDPOINT) {
    try { configured = ["http:", "https:"].includes(new URL(process.env.AI_CLASSIFICATION_ENDPOINT).protocol); } catch { configured = false; }
  }
  return { mode, configured, limits: audioLimits, timeoutMs, provisional: true };
}

export async function analyzeAudio(audio: File, requestId: string, stationId: string, fail: boolean, signal?: AbortSignal): Promise<AnalysisResult> {
  const config = modelConfig();
  validateAudio(audio, config.limits);
  if (!config.configured) throw new ModelError("NOT_CONFIGURED", "ยังไม่ได้ตั้งค่า API โมเดลบนเซิร์ฟเวอร์", 503);
  if (config.mode === "mock") {
    await new Promise(resolve => setTimeout(resolve, 700));
    if (fail) throw new ModelError("MOCK_FAILURE", "จำลองบริการวิเคราะห์ไม่พร้อม กรุณาลองใหม่", 503);
    const prediction = fixturePrediction(stationId);
    return parseModelResult({ requestId, modelVersion: prediction.modelVersion, label: prediction.label, scores: Object.entries(prediction.scores).map(([classId, score]) => ({ classId, label: soundNames[classId] ?? classId, score })) }, requestId, "mock");
  }
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), config.timeoutMs);
  try {
    const body = new FormData();
    body.set("audio", audio); body.set("requestId", requestId); body.set("stationId", stationId);
    const response = await fetch(process.env.AI_CLASSIFICATION_ENDPOINT!, {
      method: "POST", body, cache: "no-store", redirect: "error",
      headers: process.env.AI_CLASSIFICATION_API_KEY ? { Authorization: `Bearer ${process.env.AI_CLASSIFICATION_API_KEY}` } : {},
      signal: signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal
    });
    if (!response.ok) throw new ModelError("UPSTREAM_ERROR", `บริการโมเดลตอบกลับไม่สำเร็จ (HTTP ${response.status})`);
    if (!response.headers.get("content-type")?.includes("application/json")) throw new ModelError("INVALID_RESULT", "บริการโมเดลต้องตอบกลับเป็น JSON");
    let result: unknown;
    try { result = await response.json(); } catch { throw new ModelError("INVALID_RESULT", "อ่านผล JSON จากโมเดลไม่ได้"); }
    try { return parseModelResult(result, requestId, "http"); } catch (e) { throw new ModelError("INVALID_RESULT", (e as Error).message); }
  } catch (e) {
    if (timeout.signal.aborted) throw new ModelError("TIMEOUT", "บริการโมเดลใช้เวลานานเกินกำหนด กรุณาลองใหม่", 504);
    if (e instanceof ModelError) throw e;
    throw new ModelError("UNAVAILABLE", "ติดต่อบริการโมเดลไม่ได้ กรุณาตรวจสอบการเชื่อมต่อ");
  } finally { clearTimeout(timer); }
}
