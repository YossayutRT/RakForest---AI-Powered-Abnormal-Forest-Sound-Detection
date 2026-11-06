"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, Radio } from "lucide-react";
import { rakforestRepo } from "@/lib/supabase/repository";
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

export default function FieldRangerMapPage() {
  const [zones, setZones] = useState<ForestZone[]>([]);
  const [stations, setStations] = useState<SensorStation[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    "22222222-2222-4222-8222-222222222201"
  );

  useEffect(() => {
    Promise.all([
      rakforestRepo.getZones(),
      rakforestRepo.getStations(),
      rakforestRepo.getReports(),
    ]).then(([z, st, rep]) => {
      setZones(z);
      setStations(st);
      setReports(rep);
    });
  }, []);

  const selectedStation = stations.find((s) => s.id === selectedStationId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#14241B]">
          แผนที่เขตรับผิดชอบและตำแหน่งเสาไมโครโฟน
        </h1>
        <p className="text-xs sm:text-sm text-[#526358]">
          แตะที่เสาไมค์ (ST-XX) เพื่อดูพิกัด GPS วงรัศมีรับเสียง และงานตรวจสอบที่เกี่ยวข้อง
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8">
          <RiskZoneMap
            zones={zones}
            stations={stations}
            reports={reports}
            selectedStationId={selectedStationId}
            onSelectStation={setSelectedStationId}
            heightClass="h-[460px] lg:h-[600px]"
          />
        </div>

        <aside className="lg:col-span-4 rounded-lg border border-[#D4DCD5] bg-white p-4 space-y-4">
          {selectedStation ? (
            <div className="rounded-lg border border-[#D4DCD5] bg-[#F8FAF8] p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono-code text-sm font-bold text-[#1B4332]">
                  📡 {selectedStation.station_code}
                </span>
                <StationStatusBadge status={selectedStation.status} />
              </div>
              <h2 className="text-sm font-bold text-[#14241B]">
                {selectedStation.name}
              </h2>
              <p className="font-mono-code text-xs text-[#526358]">
                GPS: {selectedStation.lat.toFixed(4)},{" "}
                {selectedStation.lng.toFixed(4)} • รัศมี{" "}
                {selectedStation.radius_meters} ม.
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#526358]">
              รายการเสาไมค์ทั้งหมด
            </h3>
            {stations.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStationId(st.id)}
                className={`w-full flex items-center justify-between rounded-lg border p-2.5 text-left text-xs transition ${
                  selectedStationId === st.id
                    ? "border-[#1B4332] bg-[#EBF2ED] font-semibold"
                    : "border-[#E2E8E3] hover:bg-[#F8FAF8]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Radio className="h-3.5 w-3.5 text-[#1B4332]" />
                  <span className="font-mono-code font-bold">
                    {st.station_code}
                  </span>
                  <span>{st.name}</span>
                </span>
                <StationStatusBadge status={st.status} />
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
