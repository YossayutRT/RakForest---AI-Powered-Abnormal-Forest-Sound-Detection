import { update } from "./browser-store";
import type { Job } from "./types";
import type { AnalysisResult, AnalysisSource } from "./ml-contract";

const running = (job: Job) => job.status === "queued" || job.status === "processing";
export const analysisStore = {
  recover: () => update(state => {
    for (const job of state.jobs.filter(running)) {
      job.status = "failed"; job.interrupted = true;
      job.error = "งานถูกขัดจังหวะ ไฟล์ยังอยู่ กรุณากดลองวิเคราะห์ใหม่";
    }
  }, true),
  begin: (source: AnalysisSource, stationId?: string, audio?: File, retryId?: string) => update(state => {
    if (state.jobs.some(running)) throw new Error("มีงานวิเคราะห์อยู่แล้ว กรุณารอให้เสร็จก่อน");
    let job: Job;
    if (retryId) {
      const existing = state.jobs.find(j => j.id === retryId);
      if (!existing || existing.status !== "failed") throw new Error("งานนี้ไม่อยู่ในสถานะลองใหม่");
      job = existing;
    } else {
      const station = state.stations.find(s => s.id === stationId && s.active);
      if (!station || !audio) throw new Error("ไม่พบเสาที่เลือก");
      const audioId = crypto.randomUUID();
      state.attachments.push({ id: audioId, name: audio.name, blob: audio });
      job = { id: crypto.randomUUID(), stationId: station.id, stationSnapshot: structuredClone(station), audioId, createdAt: new Date().toISOString(), source, status: "queued" };
      state.jobs.unshift(job);
    }
    const attachment = state.attachments.find(a => a.id === job.audioId);
    if (!attachment) throw new Error("ไม่พบไฟล์เสียงเดิม กรุณาอัปโหลดใหม่");
    Object.assign(job, { status: "processing", source, attemptId: crypto.randomUUID(), error: undefined, interrupted: false });
    return { job: structuredClone(job), audio: new File([attachment.blob], attachment.name, { type: attachment.blob.type }) };
  }),
  complete: (job: Job, result: AnalysisResult) => update(state => {
    const current = state.jobs.find(j => j.id === job.id);
    // Ignore stale responses after a reset, interruption, or a newer attempt.
    if (!current || !running(current) || current.attemptId !== job.attemptId) return;
    const id = "RF-" + String(Math.max(0, ...state.incidents.map(i => Number(i.id.slice(3)) || 0)) + 1).padStart(3, "0");
    state.incidents.unshift({ id, status: "pending", prediction: {
      id: result.requestId, stationId: job.stationId, stationSnapshot: structuredClone(job.stationSnapshot), audioId: job.audioId,
      recordedAt: job.createdAt, modelVersion: result.modelVersion, source: result.source, label: result.label,
      scores: Object.fromEntries(result.scores.map(s => [s.classId, s.score])),
      classLabels: Object.fromEntries(result.scores.filter(s => s.label).map(s => [s.classId, s.label!])),
      decisionThreshold: result.decisionThreshold,
      segments: result.segments?.map(segment => ({
        segmentIndex: segment.segmentIndex,
        startSeconds: segment.startSeconds,
        endSeconds: segment.endSeconds,
        scores: Object.fromEntries(segment.scores.map(score => [score.classId, score.score]))
      }))
    }, history: [{ at: new Date().toISOString(), text: result.source === "mock" ? "ประมวลผลจำลองสำเร็จ • ยังไม่ได้วิเคราะห์เสียงจริง" : "ได้รับผลจากบริการโมเดล • รอส่วนกลางตรวจสอบ" }] });
    current.status = "succeeded"; current.incidentId = id;
  }),
  fail: (job: Job, message: string) => update(state => {
    const current = state.jobs.find(j => j.id === job.id);
    if (current && running(current) && current.attemptId === job.attemptId) { current.status = "failed"; current.error = message; }
  })
};
