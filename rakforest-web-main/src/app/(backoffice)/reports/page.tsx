"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  FileAudio,
  Filter,
  Plus,
  Radio,
  Search,
  Send,
  X,
} from "lucide-react";
import { rakforestRepo } from "@/lib/supabase/repository";
import {
  CLASS_LABELS_TH,
  getClassNameTh,
  STATUS_LABELS_TH,
} from "@/lib/utils/risk";
import AudioRecorder from "@/components/reports/AudioRecorder";
import {
  ReportStatusBadge,
  RiskBadge,
} from "@/components/reports/RiskBadge";
import type {
  ForestZone,
  ReportRecord,
  SensorStation,
} from "@/types/database.types";

export default function BackofficeReportsListPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [zones, setZones] = useState<ForestZone[]>([]);
  const [stations, setStations] = useState<SensorStation[]>([]);

  // Filters
  const [query, setQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [stationFilter, setStationFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");

  // Station Audio Upload Drawer
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploadNote, setUploadNote] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const loadData = useCallback(async () => {
    const [rep, z, st] = await Promise.all([
      rakforestRepo.getReports(),
      rakforestRepo.getZones(),
      rakforestRepo.getStations(),
    ]);
    setReports(rep);
    setZones(z);
    setStations(st);
    if (!selectedStationId && st[0]) {
      setSelectedStationId(st[0].id);
    }
  }, [selectedStationId]);

  useEffect(() => {
    loadData();
    if (
      typeof window !== "undefined" &&
      window.location.search.includes("upload=1")
    ) {
      setShowUploadPanel(true);
    }
  }, [loadData]);

  const filteredReports = useMemo(() => {
    return reports.filter((rep) => {
      const ai = rep.report_audio?.[0]?.ai_classifications?.[0];
      const textBlob = `${rep.report_code} ${rep.description ?? ""} ${
        rep.sensor_stations?.station_code ?? ""
      } ${rep.sensor_stations?.name ?? ""} ${
        ai ? getClassNameTh(ai.predicted_label) : ""
      }`.toLowerCase();

      if (query && !textBlob.includes(query.toLowerCase())) return false;
      if (zoneFilter && rep.zone_id !== zoneFilter) return false;
      if (stationFilter && rep.station_id !== stationFilter) return false;
      if (riskFilter && rep.risk_level !== riskFilter) return false;
      if (statusFilter && rep.status !== statusFilter) return false;
      if (classFilter && ai?.predicted_label !== classFilter) return false;
      return true;
    });
  }, [
    reports,
    query,
    zoneFilter,
    stationFilter,
    riskFilter,
    statusFilter,
    classFilter,
  ]);

  async function handleStationAudioSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!audioFile || !selectedStationId) {
      setUploadError("กรุณาเลือกเสาไมค์และไฟล์เสียงก่อนส่งวิเคราะห์");
      return;
    }
    setAnalyzing(true);
    setUploadError("");
    try {
      const station = stations.find((s) => s.id === selectedStationId);
      const { report } = await rakforestRepo.createReportWithAudio({
        sourceType: "station_sensor",
        stationId: selectedStationId,
        zoneId: station?.zone_id ?? zones[0]?.id,
        lat: station?.lat ?? 18.1234,
        lng: station?.lng ?? 98.7654,
        description:
          uploadNote.trim() ||
          `ส่งตรวจวิเคราะห์สัญญาณเสียงจากเสาไมค์ ${
            station?.station_code ?? "ST-01"
          } (${station?.name ?? ""})`,
        audioFile,
      });
      setAudioFile(null);
      setUploadNote("");
      setShowUploadPanel(false);
      await loadData();
      router.push(`/reports/${report.id}`);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "วิเคราะห์เสียงไม่สำเร็จ"
      );
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#14241B]">
            รายการรายงานเหตุการณ์และผลวิเคราะห์เสียง AI
          </h1>
          <p className="text-xs text-[#526358]">
            ตรวจสอบสัญญาณเสียงจากโครงข่ายเสาไมค์ (ST-XX) และรายงานสดจากเจ้าหน้าที่ภาคสนาม
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowUploadPanel((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1B4332] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-[#2D6A4F] transition"
        >
          {showUploadPanel ? (
            <>
              <X className="h-4 w-4" />
              <span>ปิดหน้าต่างอัปโหลด</span>
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              <span>ส่งไฟล์เสียงจากเสาไมค์วิเคราะห์ AI</span>
            </>
          )}
        </button>
      </div>

      {/* Collapsible Station Audio Upload & AI Analysis Panel */}
      {showUploadPanel && (
        <section className="rounded-lg border-2 border-[#1B4332] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E4ECE6] pb-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-[#14241B]">
                ส่งสัญญาณเสียงจากเสาไมค์เข้าวิเคราะห์ด้วยโมเดล AudioCNN
              </h2>
              <p className="text-xs text-[#526358]">
                เลือกเสาไมโครโฟนต้นทางและไฟล์เสียง ระบบจะส่งไปยังบริการ FastAPI AudioCNN คำนวณระดับความเสี่ยง และแจ้งเตือน Telegram อัตโนมัติ
              </p>
            </div>
          </div>

          <form onSubmit={handleStationAudioSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#14241B] mb-1.5">
                  เลือกเสาไมค์ต้นทาง (Sensor Station)
                </label>
                <select
                  value={selectedStationId}
                  onChange={(e) => setSelectedStationId(e.target.value)}
                  className="w-full rounded-lg border border-[#B8C7BC] bg-white px-3 py-2.5 text-sm"
                >
                  {stations.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.station_code} · {st.name} (รัศมี {st.radius_meters} ม.)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#14241B] mb-1.5">
                  หมายเหตุประกอบสัญญาณเสียง (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={uploadNote}
                  onChange={(e) => setUploadNote(e.target.value)}
                  placeholder="เช่น สัญญาณเตือนช่วงเช้ามืดจากเสาไมค์สันเขาตะวันตก"
                  className="w-full rounded-lg border border-[#B8C7BC] bg-white px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>

            <AudioRecorder
              file={audioFile}
              onChange={setAudioFile}
              disabled={analyzing}
            />

            {uploadError && (
              <p role="alert" className="text-xs font-semibold text-[#D62828]">
                {uploadError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUploadPanel(false)}
                className="rounded-lg border border-[#C6D1C8] bg-white px-4 py-2.5 text-xs font-semibold text-[#526358]"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={analyzing || !audioFile}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1B4332] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-[#2D6A4F] disabled:opacity-50"
              >
                <Activity className="h-4 w-4" />
                <span>
                  {analyzing
                    ? "กำลังวิเคราะห์เสียงด้วย AI AudioCNN…"
                    : "เริ่มวิเคราะห์เสียงและสร้างรายงาน"}
                </span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Filter Bar */}
      <section className="rounded-lg border border-[#D4DCD5] bg-white p-4">
        <div className="flex items-center gap-2 text-xs font-bold text-[#14241B] mb-3">
          <Filter className="h-3.5 w-3.5 text-[#1B4332]" />
          <span>ตัวกรองข้อมูลปฏิบัติการ</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative">
            <Search className="h-4 w-4 text-[#526358] absolute left-3 top-2.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหารหัส RF- / ชื่อเสา..."
              className="w-full rounded-lg border border-[#C6D1C8] bg-white pl-9 pr-3 py-2 text-xs"
            />
          </div>

          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="rounded-lg border border-[#C6D1C8] bg-white px-2.5 py-2 text-xs"
          >
            <option value="">ทุกโซนป่าไม้</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.zone_code} · {z.name}
              </option>
            ))}
          </select>

          <select
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value)}
            className="rounded-lg border border-[#C6D1C8] bg-white px-2.5 py-2 text-xs"
          >
            <option value="">ทุกเสาไมค์ (ST-XX)</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.station_code} · {s.name}
              </option>
            ))}
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="rounded-lg border border-[#C6D1C8] bg-white px-2.5 py-2 text-xs"
          >
            <option value="">ทุกระดับความเสี่ยง</option>
            <option value="red">สีแดง (เสี่ยงสูง/วิกฤต)</option>
            <option value="yellow">สีเหลือง (เฝ้าระวัง)</option>
            <option value="green">สีเขียว (ปกติ)</option>
          </select>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="rounded-lg border border-[#C6D1C8] bg-white px-2.5 py-2 text-xs"
          >
            <option value="">ทุกประเภทเสียง AI</option>
            {Object.entries(CLASS_LABELS_TH).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[#C6D1C8] bg-white px-2.5 py-2 text-xs"
          >
            <option value="">ทุกสถานะงาน</option>
            {Object.entries(STATUS_LABELS_TH).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-[#526358]">
          <span>พบ {filteredReports.length} รายการ</span>
          {(query ||
            zoneFilter ||
            stationFilter ||
            riskFilter ||
            statusFilter ||
            classFilter) && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setZoneFilter("");
                setStationFilter("");
                setRiskFilter("");
                setStatusFilter("");
                setClassFilter("");
              }}
              className="font-semibold text-[#1B4332] hover:underline"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
      </section>

      {/* Reports Data Table (Desktop) & Action Cards (Mobile) */}
      <section className="rounded-lg border border-[#D4DCD5] bg-white overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#D4DCD5] bg-[#F4F7F4] text-[#435449]">
                <th className="py-3 px-4 font-semibold">รหัสรายงาน / เวลา</th>
                <th className="py-3 px-4 font-semibold">แหล่งกำเนิดสัญญาณ</th>
                <th className="py-3 px-4 font-semibold">โซนป่าไม้</th>
                <th className="py-3 px-4 font-semibold">คลาสเสียงหลัก (AudioCNN)</th>
                <th className="py-3 px-4 font-semibold">ระดับความเสี่ยง</th>
                <th className="py-3 px-4 font-semibold">สถานะปฏิบัติการ</th>
                <th className="py-3 px-4 font-semibold text-right">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5ECE6]">
              {filteredReports.map((rep) => {
                const ai = rep.report_audio?.[0]?.ai_classifications?.[0];
                return (
                  <tr key={rep.id} className="hover:bg-[#F8FAF8]">
                    <td className="py-3.5 px-4">
                      <span className="font-mono-code font-bold text-[#14241B] block">
                        {rep.report_code}
                      </span>
                      <span className="text-[11px] text-[#526358]">
                        {new Date(rep.created_at).toLocaleString("th-TH", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {rep.source_type === "station_sensor" ? (
                        <div>
                          <span className="inline-flex items-center gap-1 font-semibold text-[#1B4332]">
                            <Radio className="h-3.5 w-3.5" />
                            <span>
                              {rep.sensor_stations?.station_code ?? "ST-01"} ·{" "}
                              {rep.sensor_stations?.name ?? "เสาไมค์"}
                            </span>
                          </span>
                          <span className="block font-mono-code text-[11px] text-[#526358]">
                            {rep.lat.toFixed(4)}, {rep.lng.toFixed(4)}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 font-semibold text-blue-800">
                            <Send className="h-3.5 w-3.5" />
                            <span>เจ้าหน้าที่ภาคสนามแจ้งเหตุสด</span>
                          </span>
                          <span className="block font-mono-code text-[11px] text-[#526358]">
                            {rep.lat.toFixed(4)}, {rep.lng.toFixed(4)}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[#14241B]">
                      {rep.forest_zones?.name ?? "เขตอนุรักษ์ป่าแม่ริม"}
                    </td>
                    <td className="py-3.5 px-4">
                      {ai ? (
                        <div>
                          <span className="font-semibold text-[#14241B]">
                            {getClassNameTh(ai.predicted_label)}
                          </span>
                          <span className="ml-1.5 font-mono-code font-bold text-[#1B4332]">
                            {Math.round(ai.confidence * 100)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#526358]">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <RiskBadge level={rep.risk_level} />
                    </td>
                    <td className="py-3.5 px-4">
                      <ReportStatusBadge status={rep.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/reports/${rep.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#8FA394] bg-white px-3 py-1.5 text-xs font-semibold text-[#1B4332] hover:bg-[#EBF2ED]"
                      >
                        <FileAudio className="h-3.5 w-3.5" />
                        <span>ตรวจสอบ & สั่งการ</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Action Cards (< 768px) */}
        <div className="divide-y divide-[#E5ECE6] md:hidden">
          {filteredReports.map((rep) => {
            const ai = rep.report_audio?.[0]?.ai_classifications?.[0];
            return (
              <div key={rep.id} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono-code text-xs font-bold text-[#14241B]">
                    {rep.report_code}
                  </span>
                  <RiskBadge level={rep.risk_level} size="xs" />
                </div>
                <p className="text-xs font-semibold text-[#14241B]">
                  {rep.sensor_stations
                    ? `📡 ${rep.sensor_stations.station_code} · ${rep.sensor_stations.name}`
                    : "🥾 รายงานลาดตระเวนภาคสนาม"}
                </p>
                {ai && (
                  <p className="text-xs text-[#435449]">
                    เสียงที่ตรวจพบ:{" "}
                    <strong>{getClassNameTh(ai.predicted_label)}</strong> (
                    {Math.round(ai.confidence * 100)}%)
                  </p>
                )}
                <p className="text-xs text-[#526358]">{rep.description}</p>
                <div className="flex items-center justify-between pt-2">
                  <ReportStatusBadge status={rep.status} />
                  <Link
                    href={`/reports/${rep.id}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#1B4332] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    <span>เปิดดู & สั่งการ</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
