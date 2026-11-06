"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  Radio,
  ShieldAlert,
} from "lucide-react";
import { rakforestRepo } from "@/lib/supabase/repository";
import { getClassNameTh } from "@/lib/utils/risk";
import {
  ReportStatusBadge,
  RiskBadge,
  StationStatusBadge,
} from "@/components/reports/RiskBadge";
import type {
  ForestZone,
  ReportRecord,
  SensorStation,
} from "@/types/database.types";

const RiskZoneMap = dynamic(() => import("@/components/map/RiskZoneMap"), {
  ssr: false,
});

export default function BackofficeGisMapPage() {
  const [zones, setZones] = useState<ForestZone[]>([]);
  const [stations, setStations] = useState<SensorStation[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    "22222222-2222-4222-8222-222222222201"
  );
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(true);

  const loadData = useCallback(async () => {
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
    loadData();
  }, [loadData]);

  const activeStation = stations.find((s) => s.id === selectedStationId);
  const activeZone =
    zones.find((z) => z.id === selectedZoneId) ??
    zones.find((z) => z.id === activeStation?.zone_id);
  const stationReports = reports.filter(
    (r) => !selectedStationId || r.station_id === selectedStationId
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#14241B]">
            แผนที่ภูมิสารสนเทศ (GIS) โซนป่าไม้และโครงข่ายเสาไมค์
          </h1>
          <p className="text-xs text-[#526358]">
            แสดงขอบเขตโซนป่าอนุรักษ์ วงรัศมีรับเสียงของเสาไมค์ (ST-01 ถึง ST-06) และจุดเกิดเหตุแบบเรียลไทม์
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/reports?upload=1"
            className="rounded-lg bg-[#1B4332] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#2D6A4F]"
          >
            + อัปโหลดเสียงทดสอบเสาไมค์
          </Link>
          <Link
            href="/zones"
            className="rounded-lg border border-[#B8C7BC] bg-white px-3.5 py-2 text-xs font-semibold text-[#1B4332] hover:bg-[#EBF2ED]"
          >
            ตั้งค่าขอบเขตโซน / เสาไมค์
          </Link>
        </div>
      </div>

      {/* Desktop Split-View (>=1024px) & Mobile/Tablet Collapsible Sheet (<1024px) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Map Canvas (8 cols on desktop) */}
        <div className="lg:col-span-8">
          <RiskZoneMap
            zones={zones}
            stations={stations}
            reports={reports}
            selectedZoneId={selectedZoneId}
            selectedStationId={selectedStationId}
            selectedReportId={selectedReportId}
            onSelectZone={(id) => {
              setSelectedZoneId(id);
              setMobileSheetOpen(true);
            }}
            onSelectStation={(id) => {
              setSelectedStationId(id);
              setMobileSheetOpen(true);
            }}
            onSelectReport={(id) => {
              setSelectedReportId(id);
              setMobileSheetOpen(true);
            }}
            heightClass="h-[460px] lg:h-[640px]"
          />

          {/* Quick Station Selector Strip */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedStationId(null)}
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                !selectedStationId
                  ? "border-[#1B4332] bg-[#1B4332] text-white"
                  : "border-[#C6D1C8] bg-white text-[#14241B]"
              }`}
            >
              ทุกเสาไมค์ ({stations.length})
            </button>
            {stations.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStationId(st.id)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  selectedStationId === st.id
                    ? "border-[#1B4332] bg-[#1B4332] text-white"
                    : "border-[#C6D1C8] bg-white text-[#14241B] hover:bg-[#EBF2ED]"
                }`}
              >
                <Radio className="h-3.5 w-3.5" />
                <span className="font-mono-code">{st.station_code}</span>
                <span>{st.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side Inspector / Collapsible Mobile Drawer (4 cols on desktop) */}
        <aside className="lg:col-span-4 rounded-lg border border-[#D4DCD5] bg-white overflow-hidden">
          {/* Mobile toggle header */}
          <button
            type="button"
            onClick={() => setMobileSheetOpen((v) => !v)}
            className="w-full flex items-center justify-between bg-[#163628] text-white px-4 py-3 text-left text-xs font-semibold lg:cursor-default"
          >
            <span>
              รายละเอียดจุดตรวจและเหตุการณ์ในรัศมีเสาไมค์ (
              {activeStation ? activeStation.station_code : "ทั้งหมด"})
            </span>
            <span className="lg:hidden">
              {mobileSheetOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </span>
          </button>

          <div
            className={`p-4 space-y-4 ${
              mobileSheetOpen ? "block" : "hidden lg:block"
            }`}
          >
            {/* Selected Station Info */}
            {activeStation ? (
              <div className="rounded-lg border border-[#D4DCD5] bg-[#F8FAF8] p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono-code text-sm font-bold text-[#1B4332]">
                    📡 {activeStation.station_code}
                  </span>
                  <StationStatusBadge status={activeStation.status} />
                </div>
                <h2 className="text-sm font-bold text-[#14241B]">
                  {activeStation.name}
                </h2>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-[#526358] block">พิกัด GPS</span>
                    <strong className="font-mono-code text-[#14241B]">
                      {activeStation.lat.toFixed(4)}, {activeStation.lng.toFixed(4)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#526358] block">รัศมีรับเสียง</span>
                    <strong className="font-mono-code text-[#14241B]">
                      {activeStation.radius_meters} เมตร
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#526358] block">ระดับแบตเตอรี่</span>
                    <strong className="font-mono-code text-[#14241B]">
                      {activeStation.battery_percent}%
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#526358] block">โซนป่าไม้</span>
                    <strong className="text-[#14241B] truncate block">
                      {activeZone?.zone_code ?? "ZN-CM-01"}
                    </strong>
                  </div>
                </div>
                {activeStation.notes && (
                  <p className="text-xs text-[#526358] pt-1 border-t border-[#E2E8E3]">
                    {activeStation.notes}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-[#D4DCD5] bg-[#F8FAF8] p-3 text-xs text-[#526358]">
                แสดงข้อมูลรวมทุกเสาไมค์ คลิกที่หมุดเสาบนแผนที่เพื่อเจาะจงรายเสา
              </div>
            )}

            {/* Selected Forest Zone Summary */}
            {activeZone && (
              <div className="rounded-lg border border-[#D4DCD5] p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#526358]">
                    โซนป่าไม้: {activeZone.zone_code}
                  </span>
                  <RiskBadge level={activeZone.current_risk_level} size="xs" />
                </div>
                <p className="text-xs font-bold text-[#14241B]">
                  {activeZone.name}
                </p>
                <p className="text-xs text-[#526358]">
                  อ.{activeZone.district} จ.{activeZone.province} • พื้นที่ประมาณ{" "}
                  <strong className="font-mono-code">
                    {activeZone.area_rai?.toLocaleString()}
                  </strong>{" "}
                  ไร่
                </p>
              </div>
            )}

            {/* Related Reports List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#526358]">
                  สัญญาณและรายงานในจุดนี้ ({stationReports.length})
                </h3>
                {selectedStationId && (
                  <button
                    type="button"
                    onClick={() => setSelectedStationId(null)}
                    className="text-xs font-semibold text-[#1B4332] hover:underline"
                  >
                    ดูทุกเสา
                  </button>
                )}
              </div>

              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {stationReports.length === 0 ? (
                  <p className="text-xs text-[#526358] py-6 text-center">
                    ยังไม่มีรายงานเหตุการณ์ของเสาไมค์นี้
                  </p>
                ) : (
                  stationReports.map((rep) => {
                    const ai = rep.report_audio?.[0]?.ai_classifications?.[0];
                    return (
                      <Link
                        key={rep.id}
                        href={`/reports/${rep.id}`}
                        className="block rounded-lg border border-[#D4DCD5] p-3 hover:border-[#1B4332] hover:bg-[#F6F9F6] transition"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono-code text-xs font-bold text-[#14241B]">
                            {rep.report_code}
                          </span>
                          <RiskBadge level={rep.risk_level} size="xs" />
                        </div>
                        {ai && (
                          <p className="mt-1 text-xs font-semibold text-[#1B4332]">
                            {getClassNameTh(ai.predicted_label)} (
                            {Math.round(ai.confidence * 100)}%)
                          </p>
                        )}
                        <p className="mt-1 text-xs text-[#526358] line-clamp-2">
                          {rep.description}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <ReportStatusBadge status={rep.status} />
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1B4332]">
                            รายละเอียด <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
