"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Copy,
  ExternalLink,
  Navigation,
  Radio,
  Send,
  Trash2,
} from "lucide-react";
import { rakforestRepo } from "@/lib/supabase/repository";
import { OUTCOME_LABELS_TH } from "@/lib/utils/risk";
import AudioWaveformPlayer from "@/components/reports/AudioWaveformPlayer";
import AIClassificationCard from "@/components/reports/AIClassificationCard";
import {
  FieldOutcomeBadge,
  ReportStatusBadge,
  RiskBadge,
} from "@/components/reports/RiskBadge";
import { getClassNameTh } from "@/lib/utils/risk";
import type { FieldOutcome, ReportRecord } from "@/types/database.types";

const RiskZoneMap = dynamic(() => import("@/components/map/RiskZoneMap"), {
  ssr: false,
});

export default function FieldReportTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [report, setReport] = useState<ReportRecord | null>(null);
  const [outcome, setOutcome] = useState<FieldOutcome>("found");
  const [fieldNotes, setFieldNotes] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidencePreviews, setEvidencePreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [copiedGps, setCopiedGps] = useState(false);

  const loadDetail = useCallback(async () => {
    const rep = await rakforestRepo.getReportById(id);
    setReport(rep);
    if (rep?.field_outcome) setOutcome(rep.field_outcome);
    if (rep?.field_notes) setFieldNotes(rep.field_notes);
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    const urls = evidenceFiles.map((f) => URL.createObjectURL(f));
    setEvidencePreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [evidenceFiles]);

  if (!report) {
    return (
      <div className="rounded-lg border border-[#D4DCD5] bg-white p-8 text-center text-sm text-[#526358]">
        กำลังโหลดรายละเอียดภารกิจภาคสนาม…
      </div>
    );
  }

  const audio = report.report_audio?.[0];
  const ai = audio?.ai_classifications?.[0];

  async function handleAcknowledge() {
    if (!report) return;
    setBusy(true);
    try {
      const updated = await rakforestRepo.acknowledgeFieldTask(report.id);
      setReport(updated);
      setFeedback("รับทราบภารกิจแล้ว คุณสามารถลงพื้นที่และกรอกผลตรวจสอบด้านล่างได้ทันที");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitInspection(e: React.FormEvent) {
    e.preventDefault();
    if (!report) return;
    setBusy(true);
    setFeedback("");
    try {
      const updated = await rakforestRepo.submitFieldInspection({
        reportId: report.id,
        outcome,
        fieldNotes:
          fieldNotes.trim() ||
          `ตรวจสอบรัศมีรอบจุดเกิดเหตุเรียบร้อยแล้ว (${OUTCOME_LABELS_TH[outcome]})`,
        evidenceFiles,
      });
      setReport(updated);
      setEvidenceFiles([]);
      setFeedback("ส่งผลการตรวจสอบพื้นที่และหลักฐานไปยังศูนย์สั่งการส่วนกลางสำเร็จแล้ว");
    } finally {
      setBusy(false);
    }
  }

  function copyGps() {
    if (!report) return;
    navigator.clipboard
      ?.writeText(`${report.lat.toFixed(6)}, ${report.lng.toFixed(6)}`)
      .then(() => {
        setCopiedGps(true);
        setTimeout(() => setCopiedGps(false), 2000);
      });
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/field-reports"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B4332] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับหน้ารายการภารกิจภาคสนาม
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2.5">
          <h1 className="font-mono-code text-xl sm:text-2xl font-bold text-[#14241B]">
            {report.report_code}
          </h1>
          <RiskBadge level={report.risk_level} size="md" />
          <ReportStatusBadge status={report.status} />
          {ai && (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold border ${
                report.risk_level === "red"
                  ? "bg-red-50 text-[#D62828] border-red-200"
                  : report.risk_level === "yellow"
                    ? "bg-amber-50 text-[#B45309] border-amber-300"
                    : "bg-emerald-50 text-[#2D8A3E] border-emerald-200"
              }`}
            >
              <span>{getClassNameTh(ai.predicted_label)}</span>
              <span className="font-mono-code font-extrabold text-sm">
                {Math.round(ai.confidence * 100)}%
              </span>
            </span>
          )}
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Responsive 2-Column Layout on Tablet/Desktop (>=1024px) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 6 Cols: Navigation Map, GPS & Audio Evidence */}
        <div className="lg:col-span-6 space-y-5">
          {/* GPS & Navigation Action Card */}
          <section className="rounded-lg border border-[#D4DCD5] bg-white p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-[#526358] block">
                  จุดหมายการตรวจสอบภาคสนาม
                </span>
                <h2 className="text-base font-bold text-[#14241B]">
                  {report.sensor_stations
                    ? `📡 ${report.sensor_stations.station_code} · ${report.sensor_stations.name}`
                    : "พิกัดแจ้งเหตุลาดตระเวน"}
                </h2>
              </div>
              {report.sensor_stations && (
                <span className="rounded bg-[#EBF2ED] px-2.5 py-1 font-mono-code text-xs font-bold text-[#1B4332]">
                  รัศมีตรวจ {report.sensor_stations.radius_meters} ม.
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={copyGps}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#B8C7BC] bg-[#F8FAF8] px-3.5 py-2 font-mono-code text-xs sm:text-sm font-semibold text-[#14241B] hover:bg-[#EBF2ED]"
              >
                <Copy className="h-4 w-4 text-[#1B4332]" />
                <span>
                  {copiedGps
                    ? "คัดลอกพิกัดแล้ว!"
                    : `${report.lat.toFixed(5)}, ${report.lng.toFixed(5)}`}
                </span>
              </button>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${report.lat},${report.lng}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#1B4332] px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#2D6A4F]"
              >
                <Navigation className="h-4 w-4" />
                <span>เปิดแผนที่นำทาง (Google Maps)</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <RiskZoneMap
              zones={report.forest_zones ? [report.forest_zones] : []}
              stations={report.sensor_stations ? [report.sensor_stations] : []}
              reports={[report]}
              selectedStationId={report.station_id}
              selectedReportId={report.id}
              heightClass="h-[300px]"
              showLayerControls={false}
            />
          </section>

          {/* Audio Evidence Player */}
          <section className="rounded-lg border border-[#D4DCD5] bg-white p-4 sm:p-5 space-y-3">
            <h2 className="text-base font-bold text-[#14241B]">
              ฟังเสียงที่ตรวจพบตามช่วงเวลา
            </h2>
            <AudioWaveformPlayer
              fileUrl={audio?.file_url}
              fileName={audio?.file_name}
              durationSeconds={audio?.duration_seconds}
              predictedLabel={ai?.predicted_label ?? "chainsaw"}
              segments={ai?.raw_response?.segments}
            />
          </section>

          {ai && (
            <AIClassificationCard
              predictedLabel={ai.predicted_label}
              confidence={ai.confidence}
              riskLevel={report.risk_level}
              modelVersion={ai.model_version}
              rawResponse={ai.raw_response}
            />
          )}
        </div>

        {/* Right 6 Cols: Acknowledge & Field Inspection Result Form */}
        <div className="lg:col-span-6 space-y-5">
          <section className="rounded-lg border border-[#D4DCD5] bg-white p-5 space-y-4">
            <div className="border-b border-[#E4ECE6] pb-3">
              <h2 className="text-base font-bold text-[#14241B]">
                บันทึกผลการลงพื้นที่ตรวจสอบ (Field Inspection Report)
              </h2>
              <p className="text-xs text-[#526358]">
                คำสั่งการจากส่วนกลาง:{" "}
                <strong className="text-[#14241B]">
                  {report.dispatch_note || report.description}
                </strong>
              </p>
            </div>

            {(report.status === "dispatched" || report.status === "pending") && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-2.5">
                <p className="text-xs font-semibold text-amber-950">
                  ภารกิจนี้รอการกดรับทราบงานก่อนเริ่มบันทึกผลการตรวจสอบพื้นที่
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleAcknowledge}
                  className="w-full min-h-12 flex items-center justify-center gap-2 rounded-lg bg-[#1B4332] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#2D6A4F]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>กดรับทราบงานและเริ่มตรวจพื้นที่</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSubmitInspection} className="space-y-4">
              <fieldset className="space-y-2">
                <legend className="text-xs font-bold text-[#14241B] mb-1.5">
                  เลือกผลการตรวจสอบพื้นที่จริง *
                </legend>
                {(
                  Object.entries(OUTCOME_LABELS_TH) as [FieldOutcome, string][]
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={`flex items-center gap-3 rounded-lg border-2 p-3.5 text-xs sm:text-sm font-semibold cursor-pointer transition ${
                      outcome === value
                        ? "border-[#1B4332] bg-[#EBF2ED] text-[#14241B]"
                        : "border-[#D4DCD5] bg-white text-[#526358]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="outcome"
                      value={value}
                      checked={outcome === value}
                      onChange={() => setOutcome(value)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </fieldset>

              <div>
                <label className="block text-xs font-bold text-[#14241B] mb-1.5">
                  รายละเอียดสิ่งที่พบจากการตรวจพื้นที่รอบเสาไมค์
                </label>
                <textarea
                  rows={4}
                  value={fieldNotes}
                  onChange={(e) => setFieldNotes(e.target.value)}
                  placeholder="ระบุสิ่งที่พบหน้างาน เช่น พบร่องรอยการตัดไม้จำนวน 2 ต้น หรือไม่พบสิ่งผิดปกติในรัศมี 350 เมตร..."
                  className="w-full rounded-lg border border-[#B8C7BC] p-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#14241B] mb-1.5">
                  แนบภาพถ่ายยืนยันการลงพื้นที่ (สูงสุด 3 ภาพ)
                </label>
                <label className="flex min-h-13 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#8FA394] bg-[#F8FAF8] p-3.5 text-xs font-semibold text-[#1B4332] hover:bg-[#EBF2ED]">
                  <Camera className="h-4 w-4" />
                  <span>เลือกรูปถ่ายหน้างาน</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) =>
                      setEvidenceFiles(
                        Array.from(e.target.files ?? []).slice(0, 3)
                      )
                    }
                  />
                </label>

                {evidencePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2.5">
                    {evidencePreviews.map((url, idx) => (
                      <div
                        key={url}
                        className="relative rounded overflow-hidden border border-[#C6D1C8]"
                      >
                        <img
                          src={url}
                          alt="ภาพประกอบ"
                          className="h-20 w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setEvidenceFiles((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          aria-label={`ลบรูปภาพที่ ${idx + 1}`}
                          className="absolute top-1.5 right-1.5 flex h-10 w-10 items-center justify-center rounded-lg bg-black/80 text-white shadow-xs hover:bg-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full min-h-13 flex items-center justify-center gap-2 rounded-lg bg-[#1B4332] px-5 py-3 text-sm font-bold text-white hover:bg-[#2D6A4F] disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>
                  {busy
                    ? "กำลังบันทึกผลตรวจสอบ…"
                    : "ส่งผลการตรวจสอบพื้นที่ให้ศูนย์สั่งการ"}
                </span>
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
