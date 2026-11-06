import type {
  AIScoreItem,
  AISegmentItem,
  FieldOutcome,
  ReportStatus,
  RiskLevel,
  StationStatus,
  UserRole,
} from "@/types/database.types";

export const CLASS_LABELS_TH: Record<string, string> = {
  fire: "เสียงไฟไหม้ป่า",
  chainsaw: "เสียงเลื่อยยนต์",
  threat_tactical: "เสียงปืน / กิจกรรมต้องสงสัย",
  vehicle: "เสียงยานพาหนะ",
  human_activity: "เสียงกิจกรรมมนุษย์",
  weather: "เสียงสภาพอากาศ / ลมฝน",
  natural_ambient: "เสียงธรรมชาติ",
  silence: "ความเงียบ",
  other: "เสียงอื่นๆ",
};

export const THREAT_CLASSES_CRITICAL = ["fire", "chainsaw", "threat_tactical"] as const;
export const THREAT_CLASSES_WARNING = ["vehicle", "human_activity"] as const;

export const RISK_LABELS_TH: Record<RiskLevel, string> = {
  red: "เสี่ยงสูง (วิกฤต)",
  yellow: "เฝ้าระวัง (ปานกลาง)",
  green: "ปกติ (ต่ำ)",
};

export const STATUS_LABELS_TH: Record<ReportStatus, string> = {
  pending: "รอตรวจสอบ",
  under_review: "กำลังตรวจสอบ",
  dispatched: "มอบหมายภาคสนามแล้ว",
  acknowledged: "ภาคสนามรับงานแล้ว",
  submitted: "ส่งผลตรวจพื้นที่แล้ว",
  confirmed: "ยืนยันเหตุจริง",
  rejected: "สัญญาณรบกวน / ไม่พบเหตุ",
  closed: "ปิดงานแล้ว",
};

export const OUTCOME_LABELS_TH: Record<FieldOutcome, string> = {
  found: "พบเหตุผิดปกติจริงในพื้นที่",
  not_found: "ตรวจสอบแล้วไม่พบเหตุผิดปกติ",
  unable_to_inspect: "ไม่สามารถเข้าถึงจุดเกิดเหตุได้",
};

export const ROLE_LABELS_TH: Record<UserRole, string> = {
  super_admin: "ผู้ดูแลระบบสูงสุด (Super Admin)",
  officer_backoffice: "เจ้าหน้าที่ศูนย์สั่งการ (Backoffice)",
  field_ranger: "เจ้าหน้าที่พิทักษ์ป่าภาคสนาม (Field Ranger)",
  pending_verification: "รอยืนยันตัวตน",
  suspended: "ระงับสิทธิ์ชั่วคราว",
};

export const STATION_STATUS_TH: Record<StationStatus, string> = {
  online: "ออนไลน์ปกติ",
  offline: "ขาดการเชื่อมต่อ",
  maintenance: "กำลังซ่อมบำรุง",
};

export function getClassNameTh(classId: string): string {
  return CLASS_LABELS_TH[classId] ?? classId;
}

export function getClassSeverity(classId: string): RiskLevel {
  if ((THREAT_CLASSES_CRITICAL as readonly string[]).includes(classId)) return "red";
  if ((THREAT_CLASSES_WARNING as readonly string[]).includes(classId)) return "yellow";
  return "green";
}

/**
 * Threat-Priority Risk Level Calculation:
 * Prioritizes critical forest threats (fire, chainsaw, threat_tactical) even when
 * natural_ambient has a high background score in multi-label AudioCNN inference.
 */
export function calculateThreatPriorityRisk(scores: AIScoreItem[]): {
  riskLevel: RiskLevel;
  primaryLabel: string;
  primaryConfidence: number;
} {
  if (!scores || scores.length === 0) {
    return { riskLevel: "green", primaryLabel: "natural_ambient", primaryConfidence: 0.5 };
  }

  const byId = new Map<string, number>();
  for (const item of scores) {
    byId.set(item.classId, Math.max(byId.get(item.classId) ?? 0, item.score));
  }

  const criticalCandidates = THREAT_CLASSES_CRITICAL.map((id) => ({
    classId: id,
    score: byId.get(id) ?? 0,
  })).sort((a, b) => b.score - a.score);

  const warningCandidates = THREAT_CLASSES_WARNING.map((id) => ({
    classId: id,
    score: byId.get(id) ?? 0,
  })).sort((a, b) => b.score - a.score);

  const topCritical = criticalCandidates[0];
  const topWarning = warningCandidates[0];

  // Rule 1: Critical threat >= 0.75 -> RED
  if (topCritical && topCritical.score >= 0.75) {
    return {
      riskLevel: "red",
      primaryLabel: topCritical.classId,
      primaryConfidence: topCritical.score,
    };
  }

  // Rule 2: Critical threat >= 0.45 -> YELLOW
  if (topCritical && topCritical.score >= 0.45) {
    return {
      riskLevel: "yellow",
      primaryLabel: topCritical.classId,
      primaryConfidence: topCritical.score,
    };
  }

  // Rule 3: Warning threat (vehicle / human_activity) >= 0.60 -> YELLOW
  if (topWarning && topWarning.score >= 0.6) {
    return {
      riskLevel: "yellow",
      primaryLabel: topWarning.classId,
      primaryConfidence: topWarning.score,
    };
  }

  // Otherwise -> GREEN with highest overall class
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  return {
    riskLevel: "green",
    primaryLabel: sorted[0].classId,
    primaryConfidence: sorted[0].score,
  };
}

export interface MergedSegmentRange {
  classId: string;
  label: string;
  severity: RiskLevel;
  maxScore: number;
  ranges: { startSeconds: number; endSeconds: number; maxScore: number }[];
}

export function summarizeSegmentDetections(
  segments: AISegmentItem[] | undefined,
  threshold = 0.45
): MergedSegmentRange[] {
  if (!segments || segments.length === 0) return [];

  const map = new Map<
    string,
    { maxScore: number; ranges: { startSeconds: number; endSeconds: number; maxScore: number }[] }
  >();

  for (const seg of segments) {
    for (const s of seg.scores) {
      if (s.score < threshold) continue;
      const entry = map.get(s.classId) ?? { maxScore: 0, ranges: [] };
      entry.maxScore = Math.max(entry.maxScore, s.score);
      entry.ranges.push({
        startSeconds: seg.startSeconds,
        endSeconds: seg.endSeconds,
        maxScore: s.score,
      });
      map.set(s.classId, entry);
    }
  }

  const results: MergedSegmentRange[] = [];
  for (const [classId, value] of map.entries()) {
    const ordered = [...value.ranges].sort((a, b) => a.startSeconds - b.startSeconds);
    const merged: { startSeconds: number; endSeconds: number; maxScore: number }[] = [];
    for (const r of ordered) {
      const prev = merged.at(-1);
      if (prev && r.startSeconds <= prev.endSeconds + 0.1) {
        prev.endSeconds = Math.max(prev.endSeconds, r.endSeconds);
        prev.maxScore = Math.max(prev.maxScore, r.maxScore);
      } else {
        merged.push({ ...r });
      }
    }
    results.push({
      classId,
      label: getClassNameTh(classId),
      severity: getClassSeverity(classId),
      maxScore: value.maxScore,
      ranges: merged,
    });
  }

  return results.sort((a, b) => {
    const rank = { red: 3, yellow: 2, green: 1 };
    if (rank[b.severity] !== rank[a.severity]) return rank[b.severity] - rank[a.severity];
    return b.maxScore - a.maxScore;
  });
}

export function formatAudioTimestamp(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}
