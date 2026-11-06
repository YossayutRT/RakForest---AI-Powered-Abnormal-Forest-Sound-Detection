"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Navigation,
  Radio,
  ShieldAlert,
  Trees,
} from "lucide-react";
import { rakforestRepo } from "@/lib/supabase/repository";
import { getClassNameTh } from "@/lib/utils/risk";
import {
  ReportStatusBadge,
  RiskBadge,
} from "@/components/reports/RiskBadge";
import type {
  ForestZone,
  Profile,
  ReportRecord,
  SensorStation,
} from "@/types/database.types";

const RiskZoneMap = dynamic(() => import("@/components/map/RiskZoneMap"), {
  ssr: false,
});

export default function FieldRangerHomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [zones, setZones] = useState<ForestZone[]>([]);
  const [stations, setStations] = useState<SensorStation[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const [p, z, st, rep] = await Promise.all([
      rakforestRepo.getCurrentProfile(),
      rakforestRepo.getZones(),
      rakforestRepo.getStations(),
      rakforestRepo.getReports(),
    ]);
    setProfile(p);
    setZones(z);
    setStations(st);
    setReports(rep);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleAcknowledge(reportId: string) {
    setBusyId(reportId);
    try {
      await rakforestRepo.acknowledgeFieldTask(reportId);
      await loadAll();
    } finally {
      setBusyId(null);
    }
  }

  const urgentStationTasks = reports.filter((r) =>
    ["pending", "dispatched", "acknowledged"].includes(r.status)
  );
  const onlineStationCount = stations.filter((s) => s.status === "online").length;
  const alertZoneCount = zones.filter((z) => z.current_risk_level !== "green").length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Compact Ranger Greeting & 3-Stat Operational Strip */}
      <section className="rounded-2xl border border-[#234937] bg-gradient-to-br from-[#163628] to-[#112A1F] p-4 sm:p-5 text-white shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2D6A4F]/90 px-2.5 py-0.5 text-[11px] font-semibold text-[#B7E4C7]">
              ● ชุดปฏิบัติการลาดตระเวนและตรวจสอบเสาไมค์
            </span>
            <h1 className="mt-1 text-lg sm:text-xl font-bold tracking-tight">
              สวัสดี {profile?.full_name ?? "สมชาย ใจดี"}
            </h1>
            <p className="text-xs text-[#B7E4C7]/90">
              {profile?.department ?? "หน่วยพิทักษ์ป่าแม่ริม–สะเมิง"} • รหัส{" "}
              <span className="font-mono-code font-semibold text-white">
                {profile?.employee_code ?? "RF-RNG-108"}
              </span>
            </p>
          </div>
        </div>

        {/* 3 Quick Summary KPI Pills (Easy to read at a glance on mobile!) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl border border-red-400/30 bg-red-950/50 px-3 py-2.5">
            <div className="flex items-center gap-1 text-[11px] font-medium text-red-200">
              <ShieldAlert className="h-3.5 w-3.5 text-red-400 shrink-0" />
              <span className="truncate">งานด่วนรอตรวจ</span>
            </div>
            <p className="mt-0.5 font-mono-code text-xl sm:text-2xl font-extrabold text-white">
              {urgentStationTasks.length}{" "}
              <span className="text-xs font-normal text-red-200">งาน</span>
            </p>
          </div>

          <div className="rounded-xl border border-emerald-400/30 bg-emerald-950/40 px-3 py-2.5">
            <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-200">
              <Radio className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">เสาไมค์ออนไลน์</span>
            </div>
            <p className="mt-0.5 font-mono-code text-xl sm:text-2xl font-extrabold text-white">
              {onlineStationCount}/{stations.length}
            </p>
          </div>

          <div className="rounded-xl border border-amber-400/30 bg-amber-950/40 px-3 py-2.5">
            <div className="flex items-center gap-1 text-[11px] font-medium text-amber-200">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="truncate">โซนเฝ้าระวัง</span>
            </div>
            <p className="mt-0.5 font-mono-code text-xl sm:text-2xl font-extrabold text-white">
              {alertZoneCount}{" "}
              <span className="text-xs font-normal text-amber-200">โซน</span>
            </p>
          </div>
        </div>
      </section>

      {/* Main Responsive Grid: Urgent Tasks first on Mobile, 2 Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 7 Cols on Desktop: Assigned Sensor Station Inspection Queue */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="flex items-center justify-between px-0.5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#14241B]">
                ภารกิจด่วนจากเสาไมค์ ({urgentStationTasks.length})
              </h2>
              <p className="text-xs text-[#526358]">
                กดรับงานหรือกดนำทางไปยังเสาไมโครโฟนเพื่อตรวจสอบพื้นที่ทันที
              </p>
            </div>
            <Link
              href="/field-reports"
              className="text-xs font-bold text-[#1B4332] hover:underline whitespace-nowrap"
            >
              ดูทั้งหมด →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
            {urgentStationTasks.map((task) => {
              const ai = task.report_audio?.[0]?.ai_classifications?.[0];
              const isRed = task.risk_level === "red";
              const isYellow = task.risk_level === "yellow";
              const leftAccent = isRed
                ? "border-l-4 border-l-[#D62828]"
                : isYellow
                  ? "border-l-4 border-l-[#D97706]"
                  : "border-l-4 border-l-[#2D8A3E]";

              return (
                <article
                  key={task.id}
                  className={`rounded-xl border border-[#D4DCD5] bg-white p-4 space-y-3 shadow-2xs ${leftAccent}`}
                >
                  {/* Top Row: Code + Status + Risk */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono-code text-xs font-bold text-[#14241B]">
                        {task.report_code}
                      </span>
                      <ReportStatusBadge status={task.status} />
                    </div>
                    <RiskBadge level={task.risk_level} />
                  </div>

                  {/* Prominent AI Sound Highlight + Station */}
                  <div className="rounded-lg bg-[#F6F9F6] border border-[#E2EBE4] p-3 space-y-1.5">
                    {ai && (
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-sm sm:text-base font-extrabold ${
                            isRed
                              ? "text-[#D62828]"
                              : isYellow
                                ? "text-[#B45309]"
                                : "text-[#2D8A3E]"
                          }`}
                        >
                          {getClassNameTh(ai.predicted_label)}
                        </span>
                        <span
                          className={`font-mono-code text-sm sm:text-base font-extrabold ${
                            isRed
                              ? "text-[#D62828]"
                              : isYellow
                                ? "text-[#B45309]"
                                : "text-[#2D8A3E]"
                          }`}
                        >
                          {Math.round(ai.confidence * 100)}%
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#1B4332] font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        <Radio className="h-3.5 w-3.5 shrink-0" />
                        {task.sensor_stations
                          ? `${task.sensor_stations.station_code} · ${task.sensor_stations.name}`
                          : "พิกัดแจ้งเหตุลาดตระเวน"}
                      </span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${task.lat},${task.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono-code text-[11px] text-[#1B4332] underline"
                      >
                        <Navigation className="h-3 w-3" />
                        <span>นำทาง GPS</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  </div>

                  {/* Dispatch Instruction */}
                  <p className="text-xs text-[#435449] leading-relaxed">
                    <strong className="text-[#14241B]">คำสั่งการ:</strong>{" "}
                    {task.dispatch_note ||
                      task.description ||
                      "โปรดเข้าตรวจสอบพื้นที่ในรัศมีเสาไมค์"}
                  </p>

                  {/* 1-Tap Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                    {(task.status === "dispatched" ||
                      task.status === "pending") && (
                      <button
                        type="button"
                        disabled={busyId === task.id}
                        onClick={() => handleAcknowledge(task.id)}
                        className="min-h-11 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1B4332] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#2D6A4F] active:scale-[0.99] transition"
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>รับทราบงานทันที</span>
                      </button>
                    )}

                    <Link
                      href={`/field-reports/${task.id}`}
                      className={`min-h-11 inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-bold transition ${
                        task.status === "acknowledged"
                          ? "col-span-full bg-[#1B4332] text-white border-[#1B4332] hover:bg-[#2D6A4F]"
                          : "border-[#1B4332] bg-white text-[#1B4332] hover:bg-[#EBF2ED]"
                      }`}
                    >
                      <span>
                        {task.status === "acknowledged"
                          ? "ส่งผลการตรวจสอบพื้นที่ & แนบรูปถ่าย"
                          : "ฟังเสียง & ดูรายละเอียดงาน"}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols on Desktop: Interactive Patrol Map & Zone Status */}
        <div className="lg:col-span-5 space-y-4">
          <section className="rounded-xl border border-[#D4DCD5] bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#14241B]">
                  แผนที่เขตรับผิดชอบและเสาไมโครโฟน
                </h2>
                <p className="text-xs text-[#526358]">
                  แสดงขอบเขตโซนป่าไม้และรัศมีรับเสียงเสาไมค์
                </p>
              </div>
              <Link
                href="/field-map"
                className="text-xs font-bold text-[#1B4332] hover:underline whitespace-nowrap"
              >
                ขยายเต็มจอ →
              </Link>
            </div>

            <RiskZoneMap
              zones={zones}
              stations={stations}
              reports={reports}
              heightClass="h-[320px] sm:h-[360px]"
              showLayerControls={false}
            />
          </section>

          {/* Assigned Zones Quick Status */}
          <section className="rounded-xl border border-[#D4DCD5] bg-white p-4 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <Trees className="h-4 w-4 text-[#1B4332]" />
              <h3 className="text-sm font-bold text-[#14241B]">
                สถานะโซนป่าไม้ในเขตรับผิดชอบ
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              {zones.map((z) => (
                <div
                  key={z.id}
                  className="flex items-center justify-between rounded-lg border border-[#E2E8E3] bg-[#F8FAF8] px-3 py-2.5 text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-mono-code font-bold text-[#1B4332] block">
                      {z.zone_code}
                    </span>
                    <span className="font-semibold text-[#14241B] truncate block">
                      {z.name}
                    </span>
                  </div>
                  <RiskBadge level={z.current_risk_level} size="xs" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
