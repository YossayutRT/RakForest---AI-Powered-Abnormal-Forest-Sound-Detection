"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, ArrowRight, Radio } from "lucide-react";
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

export default function BackofficeZoneDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [zone, setZone] = useState<ForestZone | null>(null);
  const [stations, setStations] = useState<SensorStation[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);

  useEffect(() => {
    Promise.all([
      rakforestRepo.getZones(),
      rakforestRepo.getStations(),
      rakforestRepo.getReports(),
    ]).then(([zList, stList, repList]) => {
      const found = zList.find((z) => z.id === id || z.zone_code === id) ?? null;
      setZone(found);
      if (found) {
        setStations(stList.filter((s) => s.zone_id === found.id));
        setReports(repList.filter((r) => r.zone_id === found.id));
      }
    });
  }, [id]);

  if (!zone) {
    return (
      <div className="rounded-lg border border-[#D4DCD5] bg-white p-8 text-center text-sm text-[#526358]">
        กำลังโหลดข้อมูลโซนป่าไม้…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/zones"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B4332] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับหน้าจัดการโซนป่าไม้และเสาไมค์
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-[#14241B]">{zone.name}</h1>
          <RiskBadge level={zone.current_risk_level} size="md" />
        </div>
        <p className="text-xs text-[#526358] mt-1">
          รหัสโซน: <span className="font-mono-code font-bold">{zone.zone_code}</span>{" "}
          • อ.{zone.district} จ.{zone.province} • พื้นที่{" "}
          <span className="font-mono-code font-bold">
            {zone.area_rai?.toLocaleString()}
          </span>{" "}
          ไร่
        </p>
      </div>

      <RiskZoneMap
        zones={[zone]}
        stations={stations}
        reports={reports}
        selectedZoneId={zone.id}
        heightClass="h-[400px]"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="rounded-lg border border-[#D4DCD5] bg-white p-4 space-y-3">
          <h2 className="text-base font-bold text-[#14241B]">
            เสาไมโครโฟนตรวจจับเสียงในโซนนี้ ({stations.length} เสา)
          </h2>
          {stations.map((st) => (
            <div
              key={st.id}
              className="rounded-lg border border-[#D4DCD5] bg-[#F8FAF8] p-3 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-[#1B4332]" />
                  <span className="font-mono-code text-xs font-bold text-[#1B4332]">
                    {st.station_code}
                  </span>
                  <span className="text-xs font-bold text-[#14241B]">
                    {st.name}
                  </span>
                </div>
                <p className="font-mono-code text-[11px] text-[#526358] mt-1">
                  พิกัด {st.lat.toFixed(4)}, {st.lng.toFixed(4)} • รัศมี{" "}
                  {st.radius_meters} ม. • แบตเตอรี่ {st.battery_percent}%
                </p>
              </div>
              <StationStatusBadge status={st.status} />
            </div>
          ))}
        </section>

        <section className="rounded-lg border border-[#D4DCD5] bg-white p-4 space-y-3">
          <h2 className="text-base font-bold text-[#14241B]">
            รายงานเหตุการณ์ในโซนนี้ ({reports.length} รายการ)
          </h2>
          {reports.map((rep) => (
            <Link
              key={rep.id}
              href={`/reports/${rep.id}`}
              className="block rounded-lg border border-[#D4DCD5] p-3 hover:border-[#1B4332] transition"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono-code text-xs font-bold text-[#14241B]">
                  {rep.report_code}
                </span>
                <RiskBadge level={rep.risk_level} size="xs" />
              </div>
              <p className="text-xs text-[#526358] mt-1">{rep.description}</p>
              <div className="mt-2 flex items-center justify-between">
                <ReportStatusBadge status={rep.status} />
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1B4332]">
                  เปิดดู <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
