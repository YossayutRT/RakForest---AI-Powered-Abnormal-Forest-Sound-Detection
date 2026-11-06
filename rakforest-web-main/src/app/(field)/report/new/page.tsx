"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Activity,
  Camera,
  CheckCircle2,
  Compass,
  MapPin,
  Radio,
  Send,
  Trash2,
  WifiOff,
} from "lucide-react";
import { rakforestRepo } from "@/lib/supabase/repository";
import { offlineReportQueue } from "@/lib/offline/report-queue";
import AudioRecorder from "@/components/reports/AudioRecorder";
import type { ForestZone, SensorStation } from "@/types/database.types";

const RiskZoneMap = dynamic(() => import("@/components/map/RiskZoneMap"), {
  ssr: false,
});

export default function FieldNewReportPage() {
  const router = useRouter();
  const [zones, setZones] = useState<ForestZone[]>([]);
  const [stations, setStations] = useState<SensorStation[]>([]);

  const [lat, setLat] = useState(18.1234);
  const [lng, setLng] = useState(98.7654);
  const [gpsStatus, setGpsStatus] = useState("พิกัดเริ่มต้นใกล้เสา ST-01");
  const [stationId, setStationId] = useState<string>("");
  const [zoneId, setZoneId] = useState<string>("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidencePreviews, setEvidencePreviews] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [queuedSuccess, setQueuedSuccess] = useState(false);

  useEffect(() => {
    Promise.all([rakforestRepo.getZones(), rakforestRepo.getStations()]).then(
      ([z, st]) => {
        setZones(z);
        setStations(st);
        if (z[0]) setZoneId(z[0].id);
        if (st[0]) {
          setStationId(st[0].id);
          setLat(st[0].lat);
          setLng(st[0].lng);
        }
      }
    );
  }, []);

  useEffect(() => {
    const urls = evidenceFiles.map((f) => URL.createObjectURL(f));
    setEvidencePreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [evidenceFiles]);

  function detectMyGps() {
    if (!navigator.geolocation) {
      setGpsStatus("อุปกรณ์ไม่รองรับ GPS อัตโนมัติ สามารถคลิกเลือกบนแผนที่ได้");
      return;
    }
    setGpsStatus("กำลังดึงพิกัดดาวเทียม GPS…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(Number(pos.coords.latitude.toFixed(6)));
        setLng(Number(pos.coords.longitude.toFixed(6)));
        setGpsStatus("ดึงพิกัด GPS ปัจจุบันสำเร็จ");
      },
      () => {
        setGpsStatus("ใช้พิกัดจากเสาไมค์อ้างอิงหรือคลิกเลือกจุดบนแผนที่");
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!audioFile && !description.trim()) {
      setError("กรุณาบันทึก/แนบไฟล์เสียง หรือระบุรายละเอียดเหตุการณ์");
      return;
    }

    setSubmitting(true);
    setError("");

    // Offline resilience: queue in IndexedDB if offline
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await offlineReportQueue.enqueue({
        stationId: stationId || null,
        zoneId: zoneId || null,
        lat,
        lng,
        description:
          description.trim() || "รายงานเหตุการณ์ภาคสนาม (บันทึกขณะออฟไลน์)",
        audioBlob: audioFile,
        audioName: audioFile?.name ?? null,
        audioType: audioFile?.type ?? null,
      });
      setSubmitting(false);
      setQueuedSuccess(true);
      return;
    }

    try {
      const { report } = await rakforestRepo.createReportWithAudio({
        sourceType: "field_patrol",
        stationId: stationId || null,
        zoneId: zoneId || null,
        lat,
        lng,
        description:
          description.trim() ||
          "เจ้าหน้าที่ภาคสนามบันทึกเสียงผิดปกติระหว่างลาดตระเวน",
        audioFile,
        evidenceFiles,
      });
      router.push(`/field-reports/${report.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "ส่งรายงานไม่สำเร็จ กรุณาลองใหม่"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#14241B]">
          บันทึกเสียงสดและแจ้งเหตุการณ์ผิดปกติจากพื้นที่ป่า
        </h1>
        <p className="text-xs sm:text-sm text-[#526358]">
          ส่งไฟล์เสียงเข้าโมเดล AI AudioCNN เพื่อประเมินความเสี่ยงและแจ้งเตือนศูนย์สั่งการส่วนกลางทันที (รองรับการเก็บคิวออฟไลน์เมื่อไม่มีสัญญาณ)
        </p>
      </div>

      {queuedSuccess && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-950 flex items-center gap-2">
          <WifiOff className="h-5 w-5 shrink-0" />
          <span>
            บันทึกใบงานและไฟล์เสียงลงในคิวออฟไลน์ของอุปกรณ์แล้ว ระบบจะส่งขึ้นเซิร์ฟเวอร์อัตโนมัติเมื่อกลับมามีสัญญาณอินเทอร์เน็ต
          </span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-800"
        >
          {error}
        </div>
      )}

      {/* Responsive 2-Column Workspace on Tablet/Desktop (>=1024px), 1-Column on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 6 Cols: Audio Recorder + Evidence Uploader + Field Description */}
        <div className="lg:col-span-6 space-y-5">
          {/* 1. Audio Recording / File Upload */}
          <section className="rounded-lg border border-[#D4DCD5] bg-white p-4 sm:p-5 space-y-3">
            <h2 className="text-base font-bold text-[#14241B]">
              1. บันทึกเสียงผิดปกติ หรือเลือกไฟล์เสียงเพื่อวิเคราะห์ด้วย AI
            </h2>
            <AudioRecorder
              file={audioFile}
              onChange={setAudioFile}
              disabled={submitting}
            />
          </section>

          {/* 2. Evidence Photos / Video Upload with Thumbnail Preview */}
          <section className="rounded-lg border border-[#D4DCD5] bg-white p-4 sm:p-5 space-y-3">
            <h2 className="text-base font-bold text-[#14241B]">
              2. แนบภาพถ่ายหรือวิดีโอหลักฐานหน้างาน (ไม่บังคับ)
            </h2>

            <label className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#8FA394] bg-[#F8FAF8] p-4 text-xs sm:text-sm font-semibold text-[#1B4332] hover:bg-[#EBF2ED] transition">
              <Camera className="h-5 w-5" />
              <span>ถ่ายภาพ / เลือกรูปหลักฐาน (สูงสุด 3 ภาพ)</span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const chosen = Array.from(e.target.files ?? []).slice(0, 3);
                  setEvidenceFiles(chosen);
                }}
              />
            </label>

            {evidencePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                {evidencePreviews.map((url, idx) => (
                  <div
                    key={url}
                    className="relative rounded-lg overflow-hidden border border-[#C6D1C8] bg-slate-100"
                  >
                    <img
                      src={url}
                      alt={`หลักฐาน ${idx + 1}`}
                      className="h-24 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setEvidenceFiles((prev) =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }
                      className="absolute top-1.5 right-1.5 flex h-10 w-10 items-center justify-center rounded-lg bg-black/80 text-white shadow-xs hover:bg-red-700"
                      aria-label={`ลบรูปภาพที่ ${idx + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 3. Additional Description */}
          <section className="rounded-lg border border-[#D4DCD5] bg-white p-4 sm:p-5 space-y-3">
            <h2 className="text-base font-bold text-[#14241B]">
              3. รายละเอียดเพิ่มเติมจากเจ้าหน้าที่ภาคสนาม
            </h2>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ระบุสิ่งที่พบเห็น เช่น ทิศทางของเสียง ร่องรอยยานพาหนะ หรือควันไฟ..."
              className="w-full rounded-lg border border-[#B8C7BC] p-3 text-sm"
            />
          </section>
        </div>

        {/* Right 6 Cols: GPS Location + Reference Sensor Station + Interactive Map */}
        <div className="lg:col-span-6 space-y-5">
          <section className="rounded-lg border border-[#D4DCD5] bg-white p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#14241B]">
                  4. พิกัด GPS และเสาไมค์อ้างอิงในพื้นที่
                </h2>
                <p className="text-xs text-[#526358]">{gpsStatus}</p>
              </div>
              <button
                type="button"
                onClick={detectMyGps}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#1B4332] bg-[#EBF2ED] px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#1B4332] hover:bg-[#DCE8E0]"
              >
                <Compass className="h-4 w-4" />
                <span>ดึงพิกัด GPS ปัจจุบัน</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#14241B] mb-1">
                  เสาไมค์ตรวจจับเสียงใกล้เคียง (ถ้ามี)
                </label>
                <select
                  value={stationId}
                  onChange={(e) => {
                    setStationId(e.target.value);
                    const st = stations.find((s) => s.id === e.target.value);
                    if (st) {
                      setLat(st.lat);
                      setLng(st.lng);
                      if (st.zone_id) setZoneId(st.zone_id);
                    }
                  }}
                  className="w-full rounded-lg border border-[#B8C7BC] px-3 py-2 text-xs sm:text-sm"
                >
                  <option value="">ไม่ระบุเสาไมค์ (ใช้พิกัด GPS ล้วน)</option>
                  {stations.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.station_code} · {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#14241B] mb-1">
                  โซนป่าอนุรักษ์
                </label>
                <select
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  className="w-full rounded-lg border border-[#B8C7BC] px-3 py-2 text-xs sm:text-sm"
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.zone_code} · {z.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#14241B] mb-1">
                  ละติจูด (Latitude)
                </label>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#B8C7BC] px-3 py-2 font-mono-code text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#14241B] mb-1">
                  ลองจิจูด (Longitude)
                </label>
                <input
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#B8C7BC] px-3 py-2 font-mono-code text-xs sm:text-sm"
                />
              </div>
            </div>

            <p className="text-xs text-[#526358]">
              * คลิกบนแผนที่ด้านล่างเพื่อปรับตำแหน่งหมุดจุดเกิดเหตุได้โดยตรง
            </p>

            <RiskZoneMap
              zones={zones}
              stations={stations}
              selectedStationId={stationId}
              draftPointCoords={[lng, lat]}
              onMapClickCoordinates={([clickLng, clickLat]) => {
                setLng(clickLng);
                setLat(clickLat);
                setGpsStatus("เลือกพิกัดจากบนแผนที่แล้ว");
              }}
              heightClass="h-[310px]"
              showLayerControls={false}
            />
          </section>

          {/* Submit Action Bar (Sticky on mobile, inline card on desktop) */}
          <div className="sticky bottom-16 md:static z-20 rounded-lg border border-[#1B4332] bg-white p-3 shadow-md md:shadow-none">
            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-13 flex items-center justify-center gap-2 rounded-lg bg-[#1B4332] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#2D6A4F] disabled:opacity-50 transition"
            >
              <Activity className="h-5 w-5" />
              <span>
                {submitting
                  ? "กำลังวิเคราะห์เสียงด้วย AI AudioCNN และส่งรายงาน…"
                  : "ส่งรายงานและวิเคราะห์เสียงด้วย AI ทันที"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
