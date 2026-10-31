export type AnalysisSource = "mock" | "http";
export type ModelScore = { classId: string; label?: string; score: number };
export type AnalysisSegment = { segmentIndex: number; startSeconds: number; endSeconds: number; scores: ModelScore[] };
export type AnalysisResult = { requestId: string; modelVersion: string; label: string; scores: ModelScore[]; source: AnalysisSource; decisionThreshold?: number; segments?: AnalysisSegment[] };
export type AnalysisConfig = { mode: AnalysisSource; configured: boolean; limits: { extensions: string[]; maxBytes: number }; timeoutMs: number; provisional: true };

export const audioLimits = { extensions: ["wav", "mp3", "m4a", "ogg", "webm"], maxBytes: 20 * 1024 * 1024 };
export function validateAudio(file: { name: string; size: number; type: string }, limits = audioLimits) {
  if (!file.size) throw new Error("ไฟล์เสียงว่าง");
  const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "";
  if (!limits.extensions.includes(extension) || (file.type && !/^(audio\/|video\/webm)/.test(file.type))) throw new Error("โปรดเลือกไฟล์เสียง " + limits.extensions.join(", ").toUpperCase());
  if (file.size > limits.maxBytes) throw new Error(`รองรับไฟล์เสียงไม่เกิน ${limits.maxBytes / 1024 / 1024} MB`);
}

// The HTTP adapter is the single place to translate a team's different wire format.
// Never infer score scales, class order, or preprocessing from arbitrary output.
export function parseModelResult(value: unknown, requestId: string, source: AnalysisSource): AnalysisResult {
  if (!value || typeof value !== "object") throw new Error("รูปแบบผลโมเดลไม่ถูกต้อง");
  const data = value as Record<string, unknown>;
  const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= 200;
  if (data.requestId !== requestId || !text(data.modelVersion) || !text(data.label) || !Array.isArray(data.scores) || !data.scores.length || data.scores.length > 1000) throw new Error("รูปแบบผลโมเดลไม่ถูกต้อง");
  const parseScores = (entries: unknown): ModelScore[] => {
    if (!Array.isArray(entries) || !entries.length || entries.length > 1000) throw new Error("รูปแบบคะแนนโมเดลไม่ถูกต้อง");
    const seen = new Set<string>();
    return entries.map((entry: unknown) => {
      if (!entry || typeof entry !== "object") throw new Error("รูปแบบคะแนนโมเดลไม่ถูกต้อง");
      const s = entry as Record<string, unknown>;
      if (!text(s.classId) || seen.has(s.classId) || typeof s.score !== "number" || !Number.isFinite(s.score) || s.score < 0 || s.score > 1 || (s.label !== undefined && !text(s.label))) throw new Error("คะแนนโมเดลต้องเป็นตัวเลข 0–1 และรหัสคลาสไม่ซ้ำ");
      seen.add(s.classId);
      return { classId: s.classId, label: s.label as string | undefined, score: s.score };
    });
  };
  const scores = parseScores(data.scores);
  const selected = scores.find(s => s.classId === data.label);
  if (!selected || scores.some(s => s.score > selected.score)) throw new Error("คลาสผลลัพธ์ต้องเป็นคลาสที่ได้คะแนนสูงสุด");
  let decisionThreshold: number | undefined;
  if (data.decisionThreshold !== undefined) {
    if (typeof data.decisionThreshold !== "number" || !Number.isFinite(data.decisionThreshold) || data.decisionThreshold < 0 || data.decisionThreshold > 1) throw new Error("decisionThreshold ต้องอยู่ระหว่าง 0–1");
    decisionThreshold = data.decisionThreshold;
  }
  let segments: AnalysisSegment[] | undefined;
  if (data.segments !== undefined) {
    if (!Array.isArray(data.segments) || data.segments.length > 10000) throw new Error("รูปแบบผลรายช่วงไม่ถูกต้อง");
    const classIds = new Set(scores.map(score => score.classId));
    let previousStart = -1;
    segments = data.segments.map((entry: unknown) => {
      if (!entry || typeof entry !== "object") throw new Error("รูปแบบผลรายช่วงไม่ถูกต้อง");
      const segment = entry as Record<string, unknown>;
      if (!Number.isInteger(segment.segmentIndex) || (segment.segmentIndex as number) < 0 || typeof segment.startSeconds !== "number" || !Number.isFinite(segment.startSeconds) || segment.startSeconds < 0 || typeof segment.endSeconds !== "number" || !Number.isFinite(segment.endSeconds) || segment.endSeconds <= segment.startSeconds || segment.startSeconds < previousStart) throw new Error("เวลาของช่วงเสียงไม่ถูกต้อง");
      previousStart = segment.startSeconds;
      const segmentScores = parseScores(segment.scores);
      if (segmentScores.length !== classIds.size || segmentScores.some(score => !classIds.has(score.classId))) throw new Error("คลาสในผลรายช่วงไม่ตรงกับคลาสรวม");
      return { segmentIndex: segment.segmentIndex as number, startSeconds: segment.startSeconds, endSeconds: segment.endSeconds, scores: segmentScores };
    });
    if (!segments.length) throw new Error("ไม่พบช่วงเสียงสำหรับผลวิเคราะห์");
    for (const score of scores) {
      const maxSegmentScore = Math.max(...segments.map(segment => segment.scores.find(value => value.classId === score.classId)!.score));
      if (Math.abs(maxSegmentScore - score.score) > 1e-5) throw new Error("คะแนนรวมไม่ตรงกับคะแนนรายช่วง");
    }
  }
  return { requestId, modelVersion: data.modelVersion, label: data.label, scores, source, decisionThreshold, segments };
}
