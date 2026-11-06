"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  Plus,
  Radio,
  RotateCcw,
  Trees,
} from "lucide-react";
import { rakforestRepo } from "@/lib/supabase/repository";
import { calculatePolygonAreaRai } from "@/lib/utils/geo";
import {
  RiskBadge,
  StationStatusBadge,
} from "@/components/reports/RiskBadge";
import type {
  ForestZone,
  Profile,
  RiskLevel,
  SensorStation,
  StationStatus,
} from "@/types/database.types";

const RiskZoneMap = dynamic(() => import("@/components/map/RiskZoneMap"), {
  ssr: false,
});

export default function BackofficeZonesAndStationsPage() {
  const [zones, setZones] = useState<ForestZone[]>([]);
  const [stations, setStations] = useState<SensorStation[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [mode, setMode] = useState<"view" | "new_zone" | "new_station">("view");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  // New Zone Form State (Interactive Polygon Drawing)
  const [zoneName, setZoneName] = useState("");
  const [zoneCode, setZoneCode] = useState("ZN-CM-05");
  const [province, setProvince] = useState("เชียงใหม่");
  const [district, setDistrict] = useState("สะเมิง");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("yellow");
  const [officerId, setOfficerId] = useState("");
  const [zoneDesc, setZoneDesc] = useState("");
  const [draftPolygon, setDraftPolygon] = useState<[number, number][]>([]);

  // New / Edit Sensor Station Form State
  const [editingStationId, setEditingStationId] = useState<string | null>(null);
  const [stCode, setStCode] = useState("ST-07");
  const [stName, setStName] = useState("");
  const [stZoneId, setStZoneId] = useState("");
  const [stLat, setStLat] = useState("18.1320");
  const [stLng, setStLng] = useState("98.7710");
  const [stRadius, setStRadius] = useState("350");
  const [stStatus, setStStatus] = useState<StationStatus>("online");
  const [stNotes, setStNotes] = useState("");

  const loadAll = useCallback(async () => {
    const [z, st, prof] = await Promise.all([
      rakforestRepo.getZones(),
      rakforestRepo.getStations(),
      rakforestRepo.getProfiles(),
    ]);
    setZones(z);
    setStations(st);
    setProfiles(prof);
    if (!stZoneId && z[0]) setStZoneId(z[0].id);
    if (!officerId && prof[0]) setOfficerId(prof[0].id);
  }, [stZoneId, officerId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function handleMapClick([lng, lat]: [number, number]) {
    if (mode === "new_zone") {
      setDraftPolygon((prev) => [...prev, [lng, lat]]);
    } else if (mode === "new_station") {
      setStLng(String(lng));
      setStLat(String(lat));
    }
  }

  async function handleSaveZone(e: React.FormEvent) {
    e.preventDefault();
    if (!zoneName.trim() || draftPolygon.length < 3) return;
    setBusy(true);
    setFeedback("");
    try {
      const areaRai = calculatePolygonAreaRai(draftPolygon);
      await rakforestRepo.saveZone({
        zone_code: zoneCode,
        name: zoneName,
        province,
        district,
        area_rai: areaRai,
        polygon_coords: draftPolygon,
        current_risk_level: riskLevel,
        responsible_officer_id: officerId || null,
        description: zoneDesc,
      });
      await loadAll();
      setMode("view");
      setZoneName("");
      setDraftPolygon([]);
      setFeedback("บันทึกโซนป่าไม้และคำนวณพื้นที่ไร่เรียบร้อยแล้ว");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveStation(e: React.FormEvent) {
    e.preventDefault();
    if (!stCode.trim() || !stName.trim()) return;
    setBusy(true);
    setFeedback("");
    try {
      await rakforestRepo.saveStation({
        id: editingStationId ?? undefined,
        station_code: stCode,
        name: stName,
        zone_id: stZoneId || null,
        lat: Number(stLat),
        lng: Number(stLng),
        radius_meters: Number(stRadius) || 350,
        status: stStatus,
        notes: stNotes,
      });
      await loadAll();
      setMode("view");
      setEditingStationId(null);
      setFeedback(`บันทึกข้อมูลเสาไมโครโฟน ${stCode} เรียบร้อยแล้ว`);
    } finally {
      setBusy(false);
    }
  }

  function startEditStation(st: SensorStation) {
    setEditingStationId(st.id);
    setStCode(st.station_code);
    setStName(st.name);
    setStZoneId(st.zone_id ?? zones[0]?.id ?? "");
    setStLat(String(st.lat));
    setStLng(String(st.lng));
    setStRadius(String(st.radius_meters));
    setStStatus(st.status);
    setStNotes(st.notes ?? "");
    setMode("new_station");
  }

  const calculatedRai = calculatePolygonAreaRai(draftPolygon);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#14241B]">
            จัดการโซนป่าไม้ (Forest Zones) และเสาไมค์ตรวจจับเสียง (Sensor Stations)
          </h1>
          <p className="text-xs text-[#526358]">
            วาดขอบเขตโซนป่าอนุรักษ์บนแผนที่ GIS คำนวณพื้นที่ไร่อัตโนมัติ และกำหนดพิกัดเสาไมโครโฟนพร้อมรัศมีรับเสียง
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "new_zone" ? "view" : "new_zone");
              setDraftPolygon([]);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              mode === "new_zone"
                ? "bg-[#D97706] text-white"
                : "bg-[#1B4332] text-white hover:bg-[#2D6A4F]"
            }`}
          >
            <Trees className="h-4 w-4" />
            <span>
              {mode === "new_zone" ? "ยกเลิกการวาดโซน" : "+ วาดเพิ่มโซนป่าไม้ใหม่"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingStationId(null);
              setStCode(`ST-0${stations.length + 1}`);
              setStName("");
              setMode(mode === "new_station" ? "view" : "new_station");
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${
              mode === "new_station"
                ? "border-[#1B4332] bg-[#EBF2ED] text-[#1B4332]"
                : "border-[#B8C7BC] bg-white text-[#1B4332] hover:bg-[#EBF2ED]"
            }`}
          >
            <Radio className="h-4 w-4" />
            <span>
              {mode === "new_station"
                ? "ปิดฟอร์มเสาไมค์"
                : "+ เพิ่มเสาไมค์ตรวจจับเสียง (ST-XX)"}
            </span>
          </button>
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

      {/* Map + Interactive Form Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7">
          {mode !== "view" && (
            <div className="mb-2 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-900">
              {mode === "new_zone"
                ? "โหมดวาดขอบเขตโซนป่า: คลิกบนแผนที่อย่างน้อย 3 จุดเพื่อสร้าง Polygon โซนป่าไม้ ระบบจะคำนวณพื้นที่ (ไร่) ให้อัตโนมัติ"
                : "โหมดปักหมุดเสาไมค์: คลิกบนแผนที่เพื่อเลือกพิกัดติดตั้งเสาไมโครโฟน หรือกรอกละติจูด/ลองจิจูดด้านขวา"}
            </div>
          )}

          <RiskZoneMap
            zones={zones}
            stations={stations}
            onMapClickCoordinates={handleMapClick}
            draftPolygonCoords={mode === "new_zone" ? draftPolygon : undefined}
            draftPointCoords={
              mode === "new_station" &&
              Number.isFinite(Number(stLng)) &&
              Number.isFinite(Number(stLat))
                ? [Number(stLng), Number(stLat)]
                : null
            }
            draftRadiusMeters={Number(stRadius) || 350}
            heightClass="h-[460px]"
          />
        </div>

        {/* Right Side Form or Station Directory (5 cols) */}
        <div className="lg:col-span-5">
          {mode === "new_zone" ? (
            <form
              onSubmit={handleSaveZone}
              className="rounded-lg border-2 border-[#1B4332] bg-white p-5 space-y-3.5"
            >
              <div className="flex items-center justify-between border-b border-[#E4ECE6] pb-2.5">
                <h2 className="text-base font-bold text-[#14241B]">
                  เพิ่มโซนป่าอนุรักษ์ใหม่ (วาด Polygon)
                </h2>
                <button
                  type="button"
                  onClick={() => setDraftPolygon([])}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#D62828] hover:underline"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  ล้างจุดที่วาด ({draftPolygon.length} จุด)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#14241B] mb-1">
                    รหัสโซน
                  </label>
                  <input
                    type="text"
                    required
                    value={zoneCode}
                    onChange={(e) => setZoneCode(e.target.value)}
                    className="w-full rounded border border-[#B8C7BC] px-3 py-2 text-xs font-mono-code"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#14241B] mb-1">
                    พื้นที่คำนวณอัตโนมัติ (ไร่)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={
                      draftPolygon.length >= 3
                        ? `${calculatedRai.toLocaleString()} ไร่`
                        : "คลิกแผนที่อย่างน้อย 3 จุด"
                    }
                    className="w-full rounded border border-[#D4DCD5] bg-[#F4F7F4] px-3 py-2 text-xs font-mono-code font-bold text-[#1B4332]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#14241B] mb-1">
                  ชื่อโซนป่าไม้ *
                </label>
                <input
                  type="text"
                  required
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  placeholder="เช่น ป่าสงวนแห่งชาติสะเมิง–แม่ขาน"
                  className="w-full rounded border border-[#B8C7BC] px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#14241B] mb-1">
                    จังหวัด
                  </label>
                  <input
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full rounded border border-[#B8C7BC] px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#14241B] mb-1">
                    อำเภอ
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full rounded border border-[#B8C7BC] px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#14241B] mb-1">
                    ระดับความเสี่ยงเริ่มต้น
                  </label>
                  <select
                    value={riskLevel}
                    onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
                    className="w-full rounded border border-[#B8C7BC] px-3 py-2 text-xs"
                  >
                    <option value="green">สีเขียว (ปกติ)</option>
                    <option value="yellow">สีเหลือง (เฝ้าระวัง)</option>
                    <option value="red">สีแดง (เสี่ยงสูง)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#14241B] mb-1">
                    หัวหน้าชุดผู้รับผิดชอบ
                  </label>
                  <select
                    value={officerId}
                    onChange={(e) => setOfficerId(e.target.value)}
                    className="w-full rounded border border-[#B8C7BC] px-3 py-2 text-xs"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#14241B] mb-1">
                  รายละเอียดพื้นที่
                </label>
                <textarea
                  rows={2}
                  value={zoneDesc}
                  onChange={(e) => setZoneDesc(e.target.value)}
                  className="w-full rounded border border-[#B8C7BC] p-2.5 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={busy || draftPolygon.length < 3 || !zoneName.trim()}
                className="w-full rounded-lg bg-[#1B4332] py-2.5 text-xs font-semibold text-white hover:bg-[#2D6A4F] disabled:opacity-50"
              >
                บันทึกขอบเขตโซนป่าไม้
              </button>
            </form>
          ) : mode === "new_station" ? (
            <form
              onSubmit={handleSaveStation}
              className="rounded-lg border-2 border-[#1B4332] bg-white p-5 space-y-3.5"
            >
              <h2 className="text-base font-bold text-[#14241B] border-b border-[#E4ECE6] pb-2.5">
                {editingStationId
                  ? `แก้ไขเสาไมโครโฟน ${stCode}`
                  : "ติดตั้งเสาไมโครโฟนตรวจจับเสียงใหม่"}
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#14241B] mb-1">
                    รหัสเสาไมค์ *
                  </label>
                  <input
                    type="text"
                    required
                    value={stCode}
                    onChange={(e) => setStCode(e.target.value)}
                    placeholder="เช่น ST-07"
                    className="w-full rounded border border-[#B8C7BC] px-3 py-2 text-xs font-mono-code"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#14241B] mb-1">
                    สถานะเสา
                  </label>
                  <select
                    value={stStatus}
                    onChange={(e) =>
                      setStStatus(e.target.value as StationStatus)
                    }
                    className="w-full rounded border border-[#B8C7BC] px-3 py-2 text-xs"
                  >
                    <option value="online">ออนไลน์ปกติ</option>
                    <option value="maintenance">กำลังซ่อมบำรุง</option>
                    <option value="offline">ขาดการเชื่อมต่อ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#14241B] mb-1">
                  ชื่อจุดติดตั้งเสาไมค์ *
                </label>
                <input
                  type="text"
                  required
                  value={stName}
                  onChange={(e) => setStName(e.target.value)}
                  placeholder="เช่น เสาไมค์ดอยสุเทพ-ปุย จุดสกัดที่ 2"
                  className="w-full rounded border border-[#B8C7BC] px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#14241B] mb-1">
                  สังกัดโซนป่าไม้
                </label>
                <select
                  value={stZoneId}
                  onChange={(e) => setStZoneId(e.target.value)}
                  className="w-full rounded border border-[#B8C7BC] px-3 py-2 text-xs"
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.zone_code} · {z.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#14241B] mb-1">
                    ละติจูด (Lat)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={stLat}
                    onChange={(e) => setStLat(e.target.value)}
                    className="w-full rounded border border-[#B8C7BC] px-2.5 py-2 text-xs font-mono-code"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#14241B] mb-1">
                    ลองจิจูด (Lng)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={stLng}
                    onChange={(e) => setStLng(e.target.value)}
                    className="w-full rounded border border-[#B8C7BC] px-2.5 py-2 text-xs font-mono-code"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#14241B] mb-1">
                    รัศมีรับเสียง (ม.)
                  </label>
                  <input
                    type="number"
                    required
                    value={stRadius}
                    onChange={(e) => setStRadius(e.target.value)}
                    className="w-full rounded border border-[#B8C7BC] px-2.5 py-2 text-xs font-mono-code"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#14241B] mb-1">
                  หมายเหตุทางเทคนิค
                </label>
                <input
                  type="text"
                  value={stNotes}
                  onChange={(e) => setStNotes(e.target.value)}
                  placeholder="เช่น โซลาร์เซลล์ 50W พร้อมไมค์รอบทิศทาง"
                  className="w-full rounded border border-[#B8C7BC] px-3 py-2 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-[#1B4332] py-2.5 text-xs font-semibold text-white hover:bg-[#2D6A4F] disabled:opacity-50"
              >
                บันทึกข้อมูลเสาไมโครโฟน
              </button>
            </form>
          ) : (
            <section className="rounded-lg border border-[#D4DCD5] bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#14241B]">
                  ทำเนียบเสาไมโครโฟนตรวจจับเสียง ({stations.length} เสา)
                </h2>
                <button
                  type="button"
                  onClick={() => setMode("new_station")}
                  className="text-xs font-semibold text-[#1B4332] hover:underline"
                >
                  + เพิ่มเสาใหม่
                </button>
              </div>
              <div className="space-y-2.5 max-h-[395px] overflow-y-auto pr-1">
                {stations.map((st) => (
                  <div
                    key={st.id}
                    className="rounded-lg border border-[#D4DCD5] bg-[#F8FAF8] p-3 flex items-start justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-code text-xs font-bold text-[#1B4332]">
                          {st.station_code}
                        </span>
                        <span className="text-xs font-bold text-[#14241B]">
                          {st.name}
                        </span>
                      </div>
                      <p className="font-mono-code text-[11px] text-[#526358] mt-0.5">
                        GPS: {st.lat.toFixed(4)}, {st.lng.toFixed(4)} • รัศมี{" "}
                        {st.radius_meters} ม. • แบต {st.battery_percent}%
                      </p>
                      <div className="mt-1.5">
                        <StationStatusBadge status={st.status} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEditStation(st)}
                      className="rounded border border-[#B8C7BC] bg-white px-2.5 py-1 text-xs font-semibold text-[#1B4332] hover:bg-[#EBF2ED]"
                    >
                      แก้ไข
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Forest Zones Cards Grid */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-[#14241B]">
          รายการโซนป่าอนุรักษ์ทั้งหมด ({zones.length} โซน)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {zones.map((zone) => {
            const zoneStations = stations.filter((s) => s.zone_id === zone.id);
            return (
              <div
                key={zone.id}
                className="rounded-lg border border-[#D4DCD5] bg-white p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-code text-xs font-bold text-[#526358]">
                      {zone.zone_code}
                    </span>
                    <RiskBadge level={zone.current_risk_level} />
                  </div>
                  <h3 className="mt-1 text-base font-bold text-[#14241B]">
                    {zone.name}
                  </h3>
                  <p className="text-xs text-[#526358]">
                    อ.{zone.district} จ.{zone.province} • พื้นที่ประมาณ{" "}
                    <strong className="font-mono-code text-[#14241B]">
                      {zone.area_rai?.toLocaleString()}
                    </strong>{" "}
                    ไร่ • ติดตั้งเสาไมค์{" "}
                    <strong className="font-mono-code text-[#1B4332]">
                      {zoneStations.length}
                    </strong>{" "}
                    เสา
                  </p>
                  {zone.description && (
                    <p className="mt-2 text-xs text-[#435449]">
                      {zone.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#E4ECE6]">
                  <div className="flex flex-wrap gap-1.5">
                    {zoneStations.map((s) => (
                      <span
                        key={s.id}
                        className="rounded bg-[#EBF2ED] px-2 py-0.5 font-mono-code text-[11px] font-semibold text-[#1B4332]"
                      >
                        📡 {s.station_code}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={`/zones/${zone.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#1B4332] hover:underline"
                  >
                    <span>ดูรายละเอียดโซน</span>
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
