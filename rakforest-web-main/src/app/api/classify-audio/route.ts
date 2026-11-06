import { NextResponse } from "next/server";
import {
  calculateThreatPriorityRisk,
  CLASS_LABELS_TH,
} from "@/lib/utils/risk";
import type { AIRawResponse, AIScoreItem, AISegmentItem } from "@/types/database.types";

export const runtime = "nodejs";

function buildFallbackPrediction(
  fileName: string,
  stationId: string,
  requestId: string
): AIRawResponse {
  const lower = (fileName + " " + stationId).toLowerCase();
  const isFire = lower.includes("fire") || lower.includes("st-03");
  const isVehicle = lower.includes("vehicle") || lower.includes("truck") || lower.includes("st-04");
  const isGun = lower.includes("gun") || lower.includes("shot") || lower.includes("st-05");
  const isAmbient = lower.includes("ambient") || lower.includes("bird") || lower.includes("nature");

  let primaryClass = "chainsaw";
  let primaryScore = 0.89;

  if (isFire) {
    primaryClass = "fire";
    primaryScore = 0.86;
  } else if (isGun) {
    primaryClass = "threat_tactical";
    primaryScore = 0.84;
  } else if (isVehicle) {
    primaryClass = "vehicle";
    primaryScore = 0.76;
  } else if (isAmbient) {
    primaryClass = "natural_ambient";
    primaryScore = 0.92;
  }

  const allClasses = [
    "fire",
    "chainsaw",
    "threat_tactical",
    "vehicle",
    "human_activity",
    "weather",
    "natural_ambient",
    "other",
    "silence",
  ];

  const scores: AIScoreItem[] = allClasses.map((classId) => {
    let score = 0.08;
    if (classId === primaryClass) score = primaryScore;
    else if (classId === "natural_ambient") score = 0.58;
    else if (classId === "human_activity" && primaryClass !== "natural_ambient") score = 0.49;
    else if (classId === "weather") score = 0.24;
    return {
      classId,
      label: CLASS_LABELS_TH[classId] ?? classId,
      score,
    };
  });

  const segments: AISegmentItem[] = [
    {
      segmentIndex: 0,
      startSeconds: 0,
      endSeconds: 4,
      scores: scores.map((s) => ({
        ...s,
        score:
          s.classId === primaryClass
            ? Number(Math.max(0.35, primaryScore - 0.18).toFixed(2))
            : s.score,
      })),
    },
    {
      segmentIndex: 1,
      startSeconds: 4,
      endSeconds: 8,
      scores: scores.map((s) => ({
        ...s,
        score: s.classId === primaryClass ? primaryScore : s.score,
      })),
    },
    {
      segmentIndex: 2,
      startSeconds: 8,
      endSeconds: 12,
      scores: scores.map((s) => ({
        ...s,
        score:
          s.classId === primaryClass
            ? Number(Math.max(0.4, primaryScore - 0.06).toFixed(2))
            : s.score,
      })),
    },
  ];

  return {
    requestId,
    modelVersion: "rakforest-audiocnn-multilabel-v1 (fallback)",
    label: primaryClass,
    decisionThreshold: 0.5,
    source: "fallback",
    scores,
    segments,
  };
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const audio = form.get("audio");
    const requestId =
      typeof form.get("requestId") === "string"
        ? (form.get("requestId") as string)
        : `req-${Date.now()}`;
    const stationId =
      typeof form.get("stationId") === "string"
        ? (form.get("stationId") as string)
        : "ST-01";

    if (!(audio instanceof File)) {
      return NextResponse.json(
        { error: "กรุณาแนบไฟล์เสียงเพื่อวิเคราะห์" },
        { status: 400 }
      );
    }

    const endpoint =
      process.env.AI_CLASSIFICATION_ENDPOINT || "http://127.0.0.1:8000/analyze";
    const timeoutMs = Number(process.env.ML_TIMEOUT_MS || 20000);

    let rawResponse: AIRawResponse | null = null;

    // 1. Try local FastAPI AudioCNN service first
    try {
      const upstreamForm = new FormData();
      upstreamForm.set("audio", audio);
      upstreamForm.set("requestId", requestId.replace(/[^a-zA-Z0-9_-]/g, "_"));
      upstreamForm.set("stationId", stationId);

      const res = await fetch(endpoint, {
        method: "POST",
        body: upstreamForm,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (res.ok) {
        const json = (await res.json()) as AIRawResponse;
        rawResponse = {
          ...json,
          source: "http",
        };
      }
    } catch {
      // FastAPI service not running locally -> use seamless fallback
    }

    // 2. Fallback if FastAPI server wasn't reachable
    if (!rawResponse) {
      rawResponse = buildFallbackPrediction(audio.name, stationId, requestId);
    }

    const { riskLevel, primaryLabel, primaryConfidence } =
      calculateThreatPriorityRisk(rawResponse.scores ?? []);

    return NextResponse.json({
      requestId,
      predictedLabel: primaryLabel,
      confidence: primaryConfidence,
      riskLevel,
      modelVersion: rawResponse.modelVersion ?? "rakforest-audiocnn-multilabel-v1",
      rawResponse,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "เกิดข้อผิดพลาดในการวิเคราะห์เสียง",
      },
      { status: 500 }
    );
  }
}
