"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Radio,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { rakforestRepo } from "@/lib/supabase/repository";
import AudioWaveformPlayer from "@/components/reports/AudioWaveformPlayer";
import AIClassificationCard from "@/components/reports/AIClassificationCard";
import {
  FieldOutcomeBadge,
  ReportStatusBadge,
  RiskBadge,
} from "@/components/reports/RiskBadge";
import { getClassNameTh } from "@/lib/utils/risk";
import type { Profile, ReportRecord } from "@/types/database.types";

const RiskZoneMap = dynamic(() => import("@/components/map/RiskZoneMap"), {
  ssr: false,
});

export default function BackofficeReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [report, setReport] = useState<ReportRecord | null>(null);
  const [rangers, setRangers] = useState<Profile[]>([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [dispatchNote, setDispatchNote] = useState(
    "โปรดนำชุดเคลื่อนที่เร็วเข้าตรวจสอบพื้นที่ในรัศมีเสาไมค์และส่งภาพถ่ายยืนยัน"
  );
  const [sendTelegram, setSendTelegram] = useState(true);
  const [reviewNotes, setReviewNotes] = useState("");
  const [pendingDecision, setPendingDecision] = useState<
    "confirmed" | "rejected" | "closed" | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  const loadDetail = useCallback(async () => {
    const [rep, profiles] = await Promise.all([
      rakforestRepo.getReportById(id),
      rakforestRepo.getProfiles(),
    ]);
    setReport(rep);
    const fieldRangers = profiles.filter((p) => p.role === "field_ranger");
    setRangers(fieldRangers);
    if (rep?.assigned_to) {
      setAssigneeId(rep.assigned_to);
    } else if (fieldRangers[0]) {
      setAssigneeId(fieldRangers[0].id);
    }
    if (rep?.dispatch_note) {
      setDispatchNote(rep.dispatch_note);
    }
    if (rep?.review_notes) {
      setReviewNotes(rep.review_notes);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  if (!report) {
    return (
      <div className="rounded-lg border border-[#D4DCD5] bg-white p-8 text-center">
        <p className="text-sm text-[#526358]">กำลังโหลดข้อมูลรายงาน…</p>
      </div>
    );
  }

  const audio = report.report_audio?.[0];
  const ai = audio?.ai_classifications?.[0];

  async function handleDispatch() {
    if (!report || !assigneeId) return;
    setBusy(true);
    setFeedback("");
    try {
      const updated = await rakforestRepo.dispatchToFieldRanger({
        reportId: report.id,
        assigneeId,
        dispatchNote,
        sendTelegram,
      });
      setReport(updated);
      setFeedback(
        "บันทึกการมอบหมายงานภาคสนามและส่งแจ้งเตือนเข้า Telegram เรียบร้อยแล้ว"
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleReview(
    newStatus: "confirmed" | "rejected" | "closed"
  ) {
    if (!report) return;
    setBusy(true);
    setFeedback("");
    try {
      const updated = await rakforestRepo.reviewReportStatus({
        reportId: report.id,
        status: newStatus,
        reviewNotes:
          reviewNotes.trim() ||
          (newStatus === "confirmed"
            ? "ยืนยันเหตุผิดปกติจริงจากหลักฐานเสียงและผลตรวจภาคสนาม"
            : newStatus === "rejected"
              ? "สัญญาณรบกวนหรือเสียงธรรมชาติ ไม่พบการกระทำผิด"
              : "ตรวจสอบและดำเนินการเสร็จสิ้น ปิดงาน"),
      });
      setReport(updated);
      setPendingDecision(null);
      const labelTh =
        newStatus === "confirmed"
          ? "ยืนยันเหตุจริง"
          : newStatus === "rejected"
            ? "ปฏิเสธ (เสียงรบกวน)"
            : "ตรวจแล้ว & ปิดงาน";
      setFeedback(`บันทึกผลการพิจารณา "${labelTh}" เรียบร้อยแล้ว`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B4332] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>กลับหน้ารายการรายงาน</span>
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
          <p className="mt-1 text-xs text-[#526358]">
            ตรวจพบเมื่อ{" "}
            {new Date(report.created_at).toLocaleString("th-TH", {
              dateStyle: "long",
              timeStyle: "medium",
            })}{" "}
            •{" "}
            {report.source_type === "station_sensor"
              ? `สัญญาณจากเสาไมค์ ${
                  report.sensor_stations?.station_code ?? "ST-01"
                } (${report.sensor_stations?.name ?? ""})`
              : "รายงานสดจากชุดลาดตระเวนภาคสนาม"}
          </p>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Main 12-Col Grid: Left (Audio Waveform + AI 9-Class Breakdown + Map), Right (Dispatch + Field Result + Verification) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Interactive Audio Waveform & Segment Time Jump */}
          <section className="rounded-lg border border-[#D4DCD5] bg-white p-4 sm:p-5 space-y-3">
            <h2 className="text-base font-bold text-[#14241B]">
              1. ตรวจสอบหลักฐานเสียงและช่วงเวลาที่ตรวจพบ (Interactive Audio Timeline)
            </h2>
            <AudioWaveformPlayer
              fileUrl={audio?.file_url}
              fileName={audio?.file_name}
              durationSeconds={audio?.duration_seconds}
              predictedLabel={ai?.predicted_label ?? "chainsaw"}
              segments={ai?.raw_response?.segments}
            />
          </section>

          {/* AI 9-Class Multi-Label Card */}
          {ai && (
            <AIClassificationCard
              predictedLabel={ai.predicted_label}
              confidence={ai.confidence}
              riskLevel={report.risk_level}
              modelVersion={ai.model_version}
              rawResponse={ai.raw_response}
            />
          )}

          {/* GIS Location & Station Listening Radius Map */}
          <section className="rounded-lg border border-[#D4DCD5] bg-white p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#14241B]">
                  ตำแหน่งพิกัดเกิดเหตุและวงรัศมีรับเสียงเสาไมค์
                </h2>
                <p className="font-mono-code text-xs text-[#526358]">
                  GPS: {report.lat.toFixed(5)}, {report.lng.toFixed(5)} • โซน:{" "}
                  {report.forest_zones?.name ?? "เขตอนุรักษ์ป่าแม่ริม"}
                </p>
              </div>
              {report.sensor_stations && (
                <span className="inline-flex items-center gap-1 rounded bg-[#EBF2ED] px-2.5 py-1 font-mono-code text-xs font-bold text-[#1B4332]">
                  <Radio className="h-3.5 w-3.5" />
                  {report.sensor_stations.station_code} (รัศมี{" "}
                  {report.sensor_stations.radius_meters} ม.)
                </span>
              )}
            </div>

            <RiskZoneMap
              zones={report.forest_zones ? [report.forest_zones] : []}
              stations={report.sensor_stations ? [report.sensor_stations] : []}
              reports={[report]}
              selectedStationId={report.station_id}
              selectedReportId={report.id}
              heightClass="h-[320px]"
              showLayerControls={false}
            />
          </section>
        </div>

        {/* Right Column (5 cols): Field Dispatch, Field Outcome & Official Verification */}
        <div className="lg:col-span-5 space-y-5">
          {/* Panel A: Dispatch to Field Ranger + Telegram Notification */}
          <section className="rounded-lg border border-[#D4DCD5] bg-white p-4 sm:p-5 space-y-4">
            <div className="border-b border-[#E4ECE6] pb-3">
              <h2 className="text-base font-bold text-[#14241B]">
                2. มอบหมายชุดปฏิบัติการภาคสนาม (Field Dispatch)
              </h2>
              <p className="text-xs text-[#526358]">
                สั่งการให้เจ้าหน้าที่พิทักษ์ป่าลงพื้นที่ตรวจสอบรอบเสาไมค์ พร้อมส่งแจ้งเตือนผ่าน Telegram
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#14241B] mb-1">
                เจ้าหน้าที่ภาคสนามผู้รับผิดชอบ
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full rounded-lg border border-[#B8C7BC] bg-white px-3 py-2 text-xs sm:text-sm"
              >
                {rangers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.employee_code} · {r.full_name} ({r.department})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#14241B] mb-1">
                คำสั่งการ / จุดเน้นในการตรวจสอบพื้นที่
              </label>
              <textarea
                rows={3}
                value={dispatchNote}
                onChange={(e) => setDispatchNote(e.target.value)}
                className="w-full rounded-lg border border-[#B8C7BC] bg-white p-3 text-xs sm:text-sm"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-[#14241B] cursor-pointer">
              <input
                type="checkbox"
                checked={sendTelegram}
                onChange={(e) => setSendTelegram(e.target.checked)}
              />
              <span>
                ส่งข้อความแจ้งเตือนด่วนเข้า Telegram ของชุดปฏิบัติการทันที
              </span>
            </label>

            <button
              type="button"
              disabled={busy}
              onClick={handleDispatch}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#1B4332] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-[#2D6A4F] disabled:opacity-50 transition"
            >
              <Send className="h-4 w-4" />
              <span>
                {report.status === "pending"
                  ? "มอบหมายงานภาคสนาม & แจ้งเตือน Telegram"
                  : "อัปเดตคำสั่งการ & ส่งแจ้งเตือนซ้ำ"}
              </span>
            </button>
          </section>

          {/* Panel B: Field Ranger Inspection Result & Evidence Gallery */}
          <section className="rounded-lg border border-[#D4DCD5] bg-white p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#E4ECE6] pb-3">
              <h2 className="text-base font-bold text-[#14241B]">
                3. ผลการลงพื้นที่ตรวจสอบของเจ้าหน้าที่ภาคสนาม
              </h2>
              {report.field_outcome && (
                <FieldOutcomeBadge outcome={report.field_outcome} />
              )}
            </div>

            {report.field_outcome ? (
              <div className="space-y-3 text-xs">
                <p className="rounded-lg border border-[#D4DCD5] bg-[#F8FAF8] p-3 text-[#14241B] leading-relaxed">
                  {report.field_notes || "ไม่มีบันทึกเพิ่มเติม"}
                </p>
                {report.submitted_at && (
                  <p className="text-[#526358]">
                    ส่งผลเมื่อ:{" "}
                    {new Date(report.submitted_at).toLocaleString("th-TH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[#C6D1C8] bg-[#F8FAF8] p-4 text-xs text-[#526358]">
                {report.status === "acknowledged"
                  ? "เจ้าหน้าที่ภาคสนามรับทราบงานแล้ว กำลังเดินทางเข้าตรวจสอบพื้นที่รอบเสาไมค์"
                  : report.status === "dispatched"
                    ? "ส่งใบงานแล้ว รอเจ้าหน้าที่ภาคสนามกดรับทราบงานและลงพื้นที่"
                    : "ยังไม่มีผลตรวจภาคสนาม (คุณสามารถสลับไปโหมดภาคสนามเพื่อจำลองการรับงานและส่งผลได้ทันที)"}
                <div className="mt-2">
                  <Link
                    href={`/reports/${report.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.href = `/home`;
                    }}
                    className="font-semibold text-[#1B4332] hover:underline"
                  >
                    เปิดหน้าจอเจ้าหน้าที่ภาคสนามเพื่อรับงานนี้ →
                  </Link>
                </div>
              </div>
            )}

            {/* Evidence Photos */}
            {report.report_evidence && report.report_evidence.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-semibold text-[#526358] mb-2">
                  ภาพถ่าย/วิดีโอหลักฐานจากจุดเกิดเหตุ ({report.report_evidence.length}):
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {report.report_evidence.map((ev) => (
                    <a
                      key={ev.id}
                      href={ev.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded border border-[#D4DCD5] bg-slate-100"
                    >
                      <img
                        src={ev.file_url}
                        alt={ev.file_name ?? "ภาพหลักฐาน"}
                        className="h-24 w-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Panel C: Backoffice Official Verification & Audit Decision */}
          <section className="rounded-lg border border-[#D4DCD5] bg-white p-4 sm:p-5 space-y-4">
            <div className="border-b border-[#E4ECE6] pb-3">
              <h2 className="text-base font-bold text-[#14241B]">
                4. การยืนยันผลและปิดงานโดยศูนย์สั่งการ
              </h2>
              <p className="text-xs text-[#526358]">
                บันทึกผลการพิจารณาขั้นสุดท้ายเพื่อเก็บในประวัติปฏิบัติการและใช้พัฒนาความแม่นยำของระบบ AI
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#14241B] mb-1">
                บันทึกสรุปผลการตรวจสอบของเจ้าหน้าที่ส่วนกลาง
              </label>
              <textarea
                rows={2}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="ระบุสรุปผลการตรวจสอบหรือเหตุผลในการปิดงาน..."
                className="w-full rounded-lg border border-[#B8C7BC] bg-white p-2.5 text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => setPendingDecision("confirmed")}
                className="min-h-11 flex items-center justify-center gap-1.5 rounded-lg bg-[#D62828] px-3 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>ยืนยันเหตุจริง</span>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => setPendingDecision("rejected")}
                className="min-h-11 flex items-center justify-center gap-1.5 rounded-lg border border-[#C6D1C8] bg-white px-3 py-2.5 text-xs sm:text-sm font-semibold text-[#526358] hover:bg-slate-100 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4 shrink-0" />
                <span>ปฏิเสธ (เสียงรบกวน)</span>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => setPendingDecision("closed")}
                className="min-h-11 flex items-center justify-center gap-1.5 rounded-lg bg-[#2D8A3E] px-3 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>ตรวจแล้ว & ปิดงาน</span>
              </button>
            </div>

            {/* Confirmation Dialog Box to prevent accidental clicks */}
            {pendingDecision && (
              <div
                role="alertdialog"
                aria-labelledby="confirm-decision-title"
                className="rounded-lg border-2 border-[#1B4332] bg-[#F4F8F5] p-4 space-y-3"
              >
                <div>
                  <p
                    id="confirm-decision-title"
                    className="text-sm font-bold text-[#14241B]"
                  >
                    ยืนยันการเปลี่ยนสถานะรายงานเป็น:{" "}
                    <span
                      className={
                        pendingDecision === "confirmed"
                          ? "text-[#D62828]"
                          : pendingDecision === "closed"
                            ? "text-[#2D8A3E]"
                            : "text-[#B45309]"
                      }
                    >
                      {pendingDecision === "confirmed"
                        ? "“ยืนยันเหตุผิดปกติจริง”"
                        : pendingDecision === "rejected"
                          ? "“ปฏิเสธรายงาน (เสียงรบกวน/ธรรมชาติ)”"
                          : "“ตรวจสอบเสร็จสิ้น & ปิดงาน”"}
                    </span>{" "}
                    ใช่หรือไม่?
                  </p>
                  <p className="mt-1 text-xs text-[#526358]">
                    โปรดตรวจสอบความถูกต้องก่อนกดยืนยัน ระบบจะบันทึกประวัติการตัดสินใจลงฐานข้อมูลทันที
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleReview(pendingDecision)}
                    className="min-h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-[#1B4332] px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-[#2D6A4F] disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {busy
                        ? "กำลังบันทึกผล…"
                        : "ใช่, ยืนยันการบันทึกผลนี้"}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPendingDecision(null)}
                    className="min-h-11 inline-flex items-center justify-center rounded-lg border border-[#B8C7BC] bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-[#14241B] hover:bg-slate-100"
                  >
                    ยกเลิก (ย้อนกลับ)
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
