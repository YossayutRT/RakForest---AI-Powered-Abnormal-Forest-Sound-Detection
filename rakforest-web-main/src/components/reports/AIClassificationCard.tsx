"use client";

import { useMemo } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle,
  Cpu,
  ShieldAlert,
} from "lucide-react";
import {
  getClassNameTh,
  getClassSeverity,
  THREAT_CLASSES_CRITICAL,
  THREAT_CLASSES_WARNING,
} from "@/lib/utils/risk";
import { RiskBadge } from "./RiskBadge";
import type { AIRawResponse, RiskLevel } from "@/types/database.types";

interface Props {
  predictedLabel: string;
  confidence: number;
  riskLevel: RiskLevel;
  modelVersion?: string | null;
  rawResponse?: AIRawResponse | null;
}

const GREEN_CLASSES = [
  "natural_ambient",
  "weather",
  "silence",
  "other",
] as const;

export default function AIClassificationCard({
  predictedLabel,
  confidence,
  riskLevel,
  modelVersion = "rakforest-audiocnn-multilabel-v1",
  rawResponse,
}: Props) {
  const scoresMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of rawResponse?.scores ?? []) {
      map.set(item.classId, item.score);
    }
    return map;
  }, [rawResponse?.scores]);

  const threshold = rawResponse?.decisionThreshold ?? 0.5;

  // Determine color styling for the top sound based on risk severity
  const topSeverity = getClassSeverity(predictedLabel);
  const topColorClasses =
    topSeverity === "red"
      ? {
          text: "text-[#D62828]",
          border: "border-red-300",
          bg: "bg-red-50",
          badgeBg: "bg-red-100 text-red-900 border-red-300",
        }
      : topSeverity === "yellow"
        ? {
            text: "text-[#B45309]",
            border: "border-amber-300",
            bg: "bg-amber-50",
            badgeBg: "bg-amber-100 text-amber-950 border-amber-300",
          }
        : {
            text: "text-[#2D8A3E]",
            border: "border-emerald-300",
            bg: "bg-emerald-50",
            badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-300",
          };

  // Build the 3 distinct risk groups
  const groups = useMemo(() => {
    const makeGroupItems = (classIds: readonly string[]) => {
      return classIds
        .map((classId) => ({
          classId,
          label: getClassNameTh(classId),
          score: scoresMap.get(classId) ?? 0,
        }))
        .sort((a, b) => b.score - a.score);
    };

    return [
      {
        id: "red" as RiskLevel,
        title: "หมวดสีแดง — ภัยคุกคามวิกฤต (Critical Threats)",
        subtitle: "เสียงที่ต้องเฝ้าระวังสูงสุด เข้าข่ายบุกรุก ทำลายป่า หรือไฟไหม้",
        icon: AlertOctagon,
        items: makeGroupItems(THREAT_CLASSES_CRITICAL),
        containerBorder: "border-red-200",
        headerBg: "bg-red-50/80 text-red-900",
        iconColor: "text-[#D62828]",
        barColor: "bg-[#D62828]",
        highlightBorder: "border-red-300 bg-red-50/50",
        scoreText: "text-[#D62828]",
      },
      {
        id: "yellow" as RiskLevel,
        title: "หมวดสีเหลือง — เฝ้าระวัง (Warnings)",
        subtitle: "เสียงกิจกรรมมนุษย์หรือยานพาหนะ ต้องตรวจสอบว่าได้รับอนุญาตหรือไม่",
        icon: AlertTriangle,
        items: makeGroupItems(THREAT_CLASSES_WARNING),
        containerBorder: "border-amber-200",
        headerBg: "bg-amber-50/80 text-amber-950",
        iconColor: "text-[#B45309]",
        barColor: "bg-[#D97706]",
        highlightBorder: "border-amber-300 bg-amber-50/50",
        scoreText: "text-[#B45309]",
      },
      {
        id: "green" as RiskLevel,
        title: "หมวดสีเขียว — ปกติและสภาพแวดล้อม (Safe / Ambient)",
        subtitle: "เสียงธรรมชาติ ลม ฝน สัตว์ป่า หรือความเงียบตามสภาพแวดล้อม",
        icon: CheckCircle,
        items: makeGroupItems(GREEN_CLASSES),
        containerBorder: "border-emerald-200",
        headerBg: "bg-emerald-50/80 text-emerald-900",
        iconColor: "text-[#2D8A3E]",
        barColor: "bg-[#2D8A3E]",
        highlightBorder: "border-emerald-300 bg-emerald-50/50",
        scoreText: "text-[#2D8A3E]",
      },
    ];
  }, [scoresMap]);

  return (
    <div className="rounded-lg border border-[#D4DCD5] bg-white p-4 sm:p-5 shadow-xs space-y-4">
      {/* Top Header with prominent font color matching risk */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-lg border ${topColorClasses.border} ${topColorClasses.bg}`}
      >
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#526358]">
            <Cpu className="h-4 w-4 text-[#1B4332]" />
            <span>เสียงที่ตรวจพบชัดเจนที่สุดและมีความเสี่ยงสูงสุด</span>
          </div>
          <h3
            className={`mt-1 text-xl sm:text-2xl font-extrabold tracking-tight ${topColorClasses.text}`}
          >
            {getClassNameTh(predictedLabel)}
          </h3>
        </div>

        <div className="flex flex-col items-end gap-1">
          <RiskBadge level={riskLevel} size="md" />
          <span
            className={`font-mono-code text-2xl sm:text-3xl font-extrabold tracking-tight ${topColorClasses.text}`}
          >
            {Math.round(confidence * 100)}%
          </span>
        </div>
      </div>

      {/* Multi-label explanation note */}
      <div className="flex items-start gap-2.5 rounded-lg border border-[#D4DCD5] bg-[#F7F9F7] px-3.5 py-2.5 text-xs text-[#435449]">
        <ShieldAlert className="h-4 w-4 shrink-0 text-[#1B4332] mt-0.5" />
        <span>
          ระบบ AI <strong>AudioCNN</strong> แยกแยะเสียงหลายประเภทพร้อมกัน โดยจัดลำดับเสียงที่เป็นอันตรายต่อป่าไม้ขึ้นมาแสดงก่อนเสมอ แม้จะมีเสียงธรรมชาติปะปนอยู่ในไฟล์เสียง
        </span>
      </div>

      {/* Grouping Sections (Red -> Yellow -> Green) stacked vertically */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between text-xs font-semibold text-[#526358] px-1">
          <span>การจัดกลุ่มความเสี่ยงของเสียง (เกณฑ์ตัดสินผ่าน ≥{Math.round(threshold * 100)}%)</span>
          <span className="font-mono-code">{modelVersion}</span>
        </div>

        {groups.map((group) => {
          const GroupIcon = group.icon;
          return (
            <div
              key={group.id}
              className={`rounded-lg border overflow-hidden ${group.containerBorder}`}
            >
              {/* Group Header */}
              <div
                className={`flex items-center justify-between px-3.5 py-2.5 border-b ${group.containerBorder} ${group.headerBg}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <GroupIcon className={`h-4 w-4 shrink-0 ${group.iconColor}`} />
                  <span className="font-bold text-xs sm:text-sm truncate">
                    {group.title}
                  </span>
                </div>
                <span className="hidden sm:inline text-[11px] font-medium opacity-80">
                  {group.subtitle}
                </span>
              </div>

              {/* Group Sound Items */}
              <div className="p-3 sm:p-4 bg-white space-y-3">
                {group.items.map((item) => {
                  const pct = Math.round(item.score * 100);
                  const isTopPredicted = item.classId === predictedLabel;
                  const passed = item.score >= threshold;

                  return (
                    <div
                      key={item.classId}
                      className={`rounded-md p-2 transition-colors ${
                        isTopPredicted
                          ? `border ${group.highlightBorder} ring-1 ring-offset-1 ring-current`
                          : "hover:bg-[#F9FAF9]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold ${
                              isTopPredicted
                                ? `${group.scoreText} font-bold text-sm`
                                : passed
                                  ? "text-[#14241B]"
                                  : "text-[#526358]"
                            }`}
                          >
                            {item.label}
                          </span>
                          {isTopPredicted && (
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${topColorClasses.badgeBg}`}
                            >
                              ★ ค่าสูงสุด
                            </span>
                          )}
                          {passed && !isTopPredicted && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-[#1B4332]">
                              ผ่านเกณฑ์
                            </span>
                          )}
                        </div>

                        <span
                          className={`font-mono-code font-bold ${
                            isTopPredicted
                              ? `${group.scoreText} text-base`
                              : passed
                                ? "text-[#14241B]"
                                : "text-[#526358]"
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#EAEFEA]">
                        <div
                          className={`h-full rounded-full transition-all ${group.barColor}`}
                          style={{ width: `${Math.max(2, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

