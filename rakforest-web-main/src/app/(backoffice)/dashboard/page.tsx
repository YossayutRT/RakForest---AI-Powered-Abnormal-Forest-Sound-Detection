"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileAudio,
  Radio,
  Send,
  ShieldAlert,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { rakforestRepo } from "@/lib/supabase/repository";
import { getClassNameTh } from "@/lib/utils/risk";
import {
  ReportStatusBadge,
  RiskBadge,
} from "@/components/reports/RiskBadge";
import type {
  ForestZone,
  ReportRecord,
  SensorStation,
} from "@/types/database.types";

const RiskZoneMap = dynamic(() => import("@/components/map/RiskZoneMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full rounded-lg border border-[#D4DCD5] bg-[#E5ECE6] flex items-center justify-center text-sm text-[#526358]">
      กำลังโหลดแผนที่ปฏิบัติการ GIS…
    </div>
  ),
});

export default function BackofficeDashboardPage() {
  const [zones, setZones] = useState<ForestZone[]>([]);
  const [stations, setStations] = useState<SensorStation[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    null
  );

  const loadAll = useCallback(async () => {
    const [z, st, rep] = await Promise.all([
      rakforestRepo.getZones(),
      rakforestRepo.getStations(),
      rakforestRepo.getReports(),
    ]);
    setZones(z);
    setStations(st);
    setReports(rep);
  }, []);

  useEffect(() => {
    loadAll();
    const supabase = createClient();
    const channel = supabase
      .channel("rakforest-dashboard-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        () => loadAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "forest_zones" },
        () => loadAll()
      )
      .subscribe();

    const onLocalUpdate = () => loadAll();
    window.addEventListener("rakforest-data-updated", onLocalUpdate);

    return () => {
      window.removeEventListener("rakforest-data-updated", onLocalUpdate);
      supabase.removeChannel(channel);
    };
  }, [loadAll]);

  const kpis = useMemo(() => {
    const highRiskZones = zones.filter(
      (z) => z.current_risk_level === "red"
    ).length;
    const onlineStations = stations.filter((s) => s.status === "online").length;
    const activeFieldOps = reports.filter((r) =>
      ["pending", "under_review", "dispatched", "acknowledged", "submitted"].includes(
        r.status
      )
    ).length;
    const criticalAlerts = reports.filter(
      (r) => r.risk_level === "red" && r.status !== "closed"
    ).length;
    return {
      totalReports: reports.length,
      highRiskZones,
      onlineStations,
      totalStations: stations.length,
      activeFieldOps,
      criticalAlerts,
    };
  }, [zones, stations, reports]);

  const riskDistribution = useMemo(() => {
    const red = reports.filter((r) => r.risk_level === "red").length;
    const yellow = reports.filter((r) => r.risk_level === "yellow").length;
    const green = reports.filter((r) => r.risk_level === "green").length;
    const total = Math.max(1, red + yellow + green);
    return {
      red,
      yellow,
      green,
      redPct: Math.round((red / total) * 100),
      yellowPct: Math.round((yellow / total) * 100),
      greenPct: Math.round((green / total) * 100),
    };
  }, [reports]);

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#14241B]">
            ศูนย์ปฏิบัติการเฝ้าระวังเสียงป่าไม้ (Operational Overview)
          </h1>
          <p className="text-xs sm:text-sm text-[#526358]">
            ติดตามสถานะโซนป่าอนุรักษ์ เสาไมโครโฟนตรวจจับเสียง และคิวงานตรวจสอบภาคสนามแบบเรียลไทม์
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/reports?upload=1"
            className="inline-flex items-center gap-2 rounded-lg bg-[#1B4332] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-[#2D6A4F] transition"
          >
            <Upload className="h-4 w-4" />
            <span>ส่งไฟล์เสียงจากเสาไมค์วิเคราะห์ AI</span>
          </Link>
          <Link
            href="/zones"
            className="inline-flex items-center gap-2 rounded-lg border border-[#B8C7BC] bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#1B4332] hover:bg-[#EBF2ED] transition"
          >
            <Radio className="h-4 w-4" />
            <span>จัดการโซน & เสาไมค์</span>
          </Link>
        </div>
      </div>

      {/* 4 Operational KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-lg border border-[#D4DCD5] bg-white p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-[#526358]">
            <span>เหตุการณ์ความเสี่ยงสูง (สีแดง)</span>
            <ShieldAlert className="h-4 w-4 text-[#D62828]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <strong className="font-mono-code text-2xl font-bold text-[#D62828]">
              {kpis.criticalAlerts}
            </strong>
            <span className="text-xs text-[#526358]">
              จากทั้งหมด {kpis.totalReports} รายงาน
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-[#D4DCD5] bg-white p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-[#526358]">
            <span>โซนป่าเสี่ยงวิกฤต / โซนทั้งหมด</span>
            <AlertTriangle className="h-4 w-4 text-[#D97706]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <strong className="font-mono-code text-2xl font-bold text-[#14241B]">
              {kpis.highRiskZones} / {zones.length}
            </strong>
            <Link
              href="/zones"
              className="text-xs font-semibold text-[#1B4332] hover:underline"
            >
              ดูขอบเขตโซน →
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-[#D4DCD5] bg-white p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-[#526358]">
            <span>โครงข่ายเสาไมค์ออนไลน์</span>
            <Radio className="h-4 w-4 text-[#1B4332]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <strong className="font-mono-code text-2xl font-bold text-[#1B4332]">
              {kpis.onlineStations} / {kpis.totalStations}
            </strong>
            <Link
              href="/map"
              className="text-xs font-semibold text-[#1B4332] hover:underline"
            >
              ดูแผนที่เสาไมค์ →
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-[#D4DCD5] bg-white p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-[#526358]">
            <span>งานปฏิบัติการที่กำลังดำเนินการ</span>
            <CheckCircle2 className="h-4 w-4 text-[#2D6A4F]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <strong className="font-mono-code text-2xl font-bold text-[#14241B]">
              {kpis.activeFieldOps}
            </strong>
            <Link
              href="/reports"
              className="text-xs font-semibold text-[#1B4332] hover:underline"
            >
              เปิดคิวตรวจสอบ →
            </Link>
          </div>
        </div>
      </div>

      {/* Main Split Grid: GIS Map (7 cols) + Analytics & Station Status (5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left: Live GIS Map */}
        <section className="xl:col-span-7 rounded-lg border border-[#D4DCD5] bg-white p-4 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-base font-bold text-[#14241B]">
                แผนที่ภูมิสารสนเทศแสดงโซนป่าไม้และเสาไมค์ตรวจจับเสียง
              </h2>
              <p className="text-xs text-[#526358]">
                คลิกที่เสาไมค์ (ST-XX) หรือขอบเขตโซนเพื่อดูสถานะและวงรัศมีรับเสียง
              </p>
            </div>
            <Link
              href="/map"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#1B4332] hover:underline"
            >
              <span>ขยายแผนที่เต็มจอ</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <RiskZoneMap
            zones={zones}
            stations={stations}
            reports={reports}
            selectedZoneId={selectedZoneId}
            selectedStationId={selectedStationId}
            onSelectZone={setSelectedZoneId}
            onSelectStation={setSelectedStationId}
            heightClass="h-[420px]"
          />
        </section>

        {/* Right: Risk Breakdown + Active Sensor Stations List */}
        <div className="xl:col-span-5 flex flex-col gap-5">
          {/* Risk Ratio & Class Summary */}
          <section className="rounded-lg border border-[#D4DCD5] bg-white p-4">
            <h2 className="text-base font-bold text-[#14241B] mb-1">
              สัดส่วนระดับความเสี่ยงจากการจำแนกเสียง AI
            </h2>
            <p className="text-xs text-[#526358] mb-3">
              คำนวณตามเกณฑ์ Threat-Priority จากโมเดล AudioCNN 9 คลาส
            </p>

            {/* Stacked Progress Bar */}
            <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100 flex">
              <div
                style={{ width: `${riskDistribution.redPct}%` }}
                className="bg-[#D62828] h-full"
                title={`เสี่ยงสูง ${riskDistribution.redPct}%`}
              />
              <div
                style={{ width: `${riskDistribution.yellowPct}%` }}
                className="bg-[#F4A300] h-full"
                title={`เฝ้าระวัง ${riskDistribution.yellowPct}%`}
              />
              <div
                style={{ width: `${riskDistribution.greenPct}%` }}
                className="bg-[#2D8A3E] h-full"
                title={`ปกติ ${riskDistribution.greenPct}%`}
              />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded border border-red-200 bg-red-50/60 p-2.5">
                <span className="text-red-800 font-semibold block">
                  สีแดง (วิกฤต)
                </span>
                <strong className="font-mono-code text-lg text-red-900">
                  {riskDistribution.red} รายการ ({riskDistribution.redPct}%)
                </strong>
              </div>
              <div className="rounded border border-amber-200 bg-amber-50/60 p-2.5">
                <span className="text-amber-800 font-semibold block">
                  สีเหลือง (เฝ้าระวัง)
                </span>
                <strong className="font-mono-code text-lg text-amber-900">
                  {riskDistribution.yellow} รายการ ({riskDistribution.yellowPct}%)
                </strong>
              </div>
              <div className="rounded border border-emerald-200 bg-emerald-50/60 p-2.5">
                <span className="text-emerald-800 font-semibold block">
                  สีเขียว (ปกติ)
                </span>
                <strong className="font-mono-code text-lg text-emerald-900">
                  {riskDistribution.green} รายการ ({riskDistribution.greenPct}%)
                </strong>
              </div>
            </div>
          </section>

          {/* Sensor Stations Status Strip */}
          <section className="rounded-lg border border-[#D4DCD5] bg-white p-4 flex-1">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-[#14241B]">
                สถานะเสาไมค์ตรวจจับเสียงในพื้นที่ป่า
              </h2>
              <Link
                href="/zones"
                className="text-xs font-semibold text-[#1B4332] hover:underline"
              >
                + เพิ่ม/แก้ไขเสาไมค์
              </Link>
            </div>

            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {stations.map((st) => {
                const activeIncident = reports.find(
                  (r) =>
                    r.station_id === st.id &&
                    !["closed", "rejected"].includes(r.status)
                );
                return (
                  <div
                    key={st.id}
                    onClick={() => setSelectedStationId(st.id)}
                    className={`flex items-center justify-between gap-2 rounded-lg border p-2.5 cursor-pointer transition ${
                      selectedStationId === st.id
                        ? "border-[#1B4332] bg-[#EBF2ED]"
                        : "border-[#E2E8E3] hover:bg-[#F8FAF8]"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-code text-xs font-bold text-[#1B4332]">
                          {st.station_code}
                        </span>
                        <span className="text-xs font-semibold text-[#14241B] truncate">
                          {st.name}
                        </span>
                      </div>
                      <p className="font-mono-code text-[11px] text-[#526358]">
                        พิกัด {st.lat.toFixed(4)}, {st.lng.toFixed(4)} • รัศมี{" "}
                        {st.radius_meters} ม. • แบต {st.battery_percent}%
                      </p>
                    </div>
                    <div className="shrink-0">
                      {activeIncident ? (
                        <RiskBadge level={activeIncident.risk_level} size="xs" />
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                          ปกติ
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* Real-time Reports Table / Responsive Cards */}
      <section className="rounded-lg border border-[#D4DCD5] bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-[#14241B]">
              สัญญาณแจ้งเหตุและรายงานล่าสุด (Real-time Activity Queue)
            </h2>
            <p className="text-xs text-[#526358]">
              รวมสัญญาณจากเสาไมโครโฟนตรวจจับเสียงในป่าและรายงานสดจากชุดลาดตระเวนภาคสนาม
            </p>
          </div>
          <Link
            href="/reports"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#1B4332] hover:underline"
          >
            <span>ดูรายการทั้งหมด ({reports.length})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Desktop Table (>= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#D4DCD5] bg-[#F4F7F4] text-[#435449]">
                <th className="py-2.5 px-3 font-semibold">รหัส / เวลา</th>
                <th className="py-2.5 px-3 font-semibold">แหล่งที่มา / เสาไมค์</th>
                <th className="py-2.5 px-3 font-semibold">โซนป่าไม้</th>
                <th className="py-2.5 px-3 font-semibold">เสียงที่ AI ตรวจพบ</th>
                <th className="py-2.5 px-3 font-semibold">ระดับความเสี่ยง</th>
                <th className="py-2.5 px-3 font-semibold">สถานะปฏิบัติการ</th>
                <th className="py-2.5 px-3 font-semibold text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5ECE6]">
              {reports.slice(0, 8).map((rep) => {
                const ai = rep.report_audio?.[0]?.ai_classifications?.[0];
                return (
                  <tr key={rep.id} className="hover:bg-[#F8FAF8]">
                    <td className="py-3 px-3">
                      <span className="font-mono-code font-bold text-[#14241B] block">
                        {rep.report_code}
                      </span>
                      <span className="text-[11px] text-[#526358]">
                        {new Date(rep.created_at).toLocaleString("th-TH", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {rep.source_type === "station_sensor" ? (
                        <span className="inline-flex items-center gap-1 font-medium text-[#1B4332]">
                          <Radio className="h-3.5 w-3.5" />
                          <span>
                            {rep.sensor_stations?.station_code ?? "ST-01"} ·{" "}
                            {rep.sensor_stations?.name ?? "เสาไมค์"}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-medium text-blue-800">
                          <Send className="h-3.5 w-3.5" />
                          <span>ลาดตระเวนภาคสนาม (GPS)</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[#14241B]">
                      {rep.forest_zones?.name ?? "เขตอนุรักษ์ป่าแม่ริม"}
                    </td>
                    <td className="py-3 px-3">
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
                        <span className="text-[#526358]">ไม่มีไฟล์เสียง</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <RiskBadge level={rep.risk_level} />
                    </td>
                    <td className="py-3 px-3">
                      <ReportStatusBadge status={rep.status} />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/reports/${rep.id}`}
                        className="inline-flex items-center gap-1 rounded border border-[#8FA394] bg-white px-2.5 py-1 text-xs font-semibold text-[#1B4332] hover:bg-[#EBF2ED]"
                      >
                        <FileAudio className="h-3.5 w-3.5" />
                        <span>ฟังเสียง & สั่งการ</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards (< 768px) */}
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {reports.slice(0, 6).map((rep) => {
            const ai = rep.report_audio?.[0]?.ai_classifications?.[0];
            return (
              <div
                key={rep.id}
                className="rounded-lg border border-[#D4DCD5] bg-[#F9FBF9] p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
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
                    ตรวจพบ: <strong>{getClassNameTh(ai.predicted_label)}</strong>{" "}
                    ({Math.round(ai.confidence * 100)}%)
                  </p>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-[#E4ECE6]">
                  <ReportStatusBadge status={rep.status} />
                  <Link
                    href={`/reports/${rep.id}`}
                    className="inline-flex items-center gap-1 rounded bg-[#1B4332] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    <span>ตรวจสอบ</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-[11px] text-[#526358]">
          * หมายเหตุความโปร่งใสข้อมูล: ระดับความเสี่ยงประมวลผลจากสัญญาณเสียงที่บันทึกได้จริงผ่านโมเดล AI AudioCNN ร่วมกับพิกัดเสาไมค์และโซนป่าไม้ ไม่ใช่การพยากรณ์ล่วงหน้า
        </p>
      </section>
    </div>
  );
}
