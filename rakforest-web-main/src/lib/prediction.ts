import { soundNames } from "./fixtures";
import type { Prediction } from "./types";
export function predictionName(prediction: Prediction, classId = prediction.label) {
  const own = (map?: Record<string, string>) => map && Object.prototype.hasOwnProperty.call(map, classId) ? map[classId] : undefined;
  return own(prediction.classLabels) || own(soundNames) || classId;
}
export function predictionSource(source: "mock" | "http") {
  return source === "http" ? "ผลจากบริการโมเดล" : "ผลจำลอง";
}

export function predictionClassesAtThreshold(prediction: Prediction) {
  const threshold = prediction.decisionThreshold ?? 0.5;
  return Object.entries(prediction.scores)
    .filter(([, score]) => score >= threshold)
    .map(([classId, score]) => ({ classId, label: predictionName(prediction, classId), score }))
    .sort((a, b) => b.score - a.score);
}

export type SegmentDetectionSummary = {
  classId: string;
  label: string;
  maxScore: number;
  ranges: { startSeconds: number; endSeconds: number }[];
};

export function segmentDetectionSummary(prediction: Prediction): SegmentDetectionSummary[] {
  if (!prediction.segments?.length) return [];
  const threshold = prediction.decisionThreshold ?? 0.5;
  const detections = new Map<string, { maxScore: number; ranges: { startSeconds: number; endSeconds: number }[] }>();
  for (const segment of prediction.segments) {
    for (const [classId, score] of Object.entries(segment.scores)) {
      if (score < threshold) continue;
      const current = detections.get(classId) ?? { maxScore: 0, ranges: [] };
      current.maxScore = Math.max(current.maxScore, score);
      current.ranges.push({ startSeconds: segment.startSeconds, endSeconds: segment.endSeconds });
      detections.set(classId, current);
    }
  }
  return Array.from(detections, ([classId, value]) => {
    const ordered = value.ranges.sort((a, b) => a.startSeconds - b.startSeconds);
    const ranges: { startSeconds: number; endSeconds: number }[] = [];
    for (const range of ordered) {
      const previous = ranges.at(-1);
      if (previous && range.startSeconds <= previous.endSeconds + 0.05) previous.endSeconds = Math.max(previous.endSeconds, range.endSeconds);
      else ranges.push({ ...range });
    }
    return {
      classId,
      label: predictionName(prediction, classId),
      maxScore: value.maxScore,
      ranges
    };
  }).sort((a, b) => b.maxScore - a.maxScore);
}

export function formatAudioTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
