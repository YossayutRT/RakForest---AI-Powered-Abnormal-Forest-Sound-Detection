"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Radio,
  Shield,
  Trees,
  UserCheck,
} from "lucide-react";
import { rakforestRepo } from "@/lib/supabase/repository";
import RakForestLogo from "@/components/ui/RakForestLogo";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("admin@rakforest.go.th");
  const [password, setPassword] = useState("RakForest2026!");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("กรุณากรอกอีเมลหรือรหัสพนักงานและรหัสผ่าน");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const profile = await rakforestRepo.signIn(identifier, password);
      if (profile.role === "field_ranger") {
        router.push("/home");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "ไม่สามารถเข้าสู่ระบบได้"
      );
    } finally {
      setBusy(false);
    }
  }

  async function quickLogin(email: string) {
    setIdentifier(email);
    setPassword("RakForest2026!");
    setBusy(true);
    setError("");
    try {
      const profile = await rakforestRepo.signIn(email, "RakForest2026!");
      router.push(profile.role === "field_ranger" ? "/home" : "/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "ไม่สามารถเข้าสู่ระบบได้"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#112A1F]">
      {/* Left Operational Information Panel */}
      <section className="lg:col-span-7 flex flex-col justify-between p-8 sm:p-12 lg:p-16 text-white border-b lg:border-b-0 lg:border-r border-[#234937]">
        <div>
          <div className="inline-flex items-center gap-3">
            <RakForestLogo variant="shield-radar" size={44} />
            <div>
              <span className="text-lg font-bold tracking-tight block leading-none">
                RakForest GIS
              </span>
              <span className="text-xs text-[#95D5B2] font-mono-code">
                FOREST ACOUSTIC SURVEILLANCE & DISPATCH
              </span>
            </div>
          </div>

          <h1 className="mt-10 text-2xl sm:text-4xl font-bold leading-snug tracking-tight text-white max-w-xl">
            ระบบเฝ้าระวังไฟป่าและตรวจจับเสียงผิดปกติในพื้นที่ป่าอนุรักษ์
          </h1>
          <p className="mt-4 text-sm sm:text-base text-[#B7E4C7]/90 max-w-xl leading-relaxed">
            เชื่อมโยงสัญญาณจากโครงข่ายเสาไมโครโฟนตรวจจับเสียงในป่า (Acoustic
            Sensor Stations) และการลาดตระเวนภาคสนาม วิเคราะห์ความถี่เสียงด้วยโมเดล
            AudioCNN พร้อมพิกัดภูมิสารสนเทศแบบเรียลไทม์
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
            <div className="rounded-lg border border-[#28543F] bg-[#163628] p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#95D5B2]">
                <Radio className="h-4 w-4" />
                <span>โครงข่ายเสาไมค์</span>
              </div>
              <p className="mt-1 text-xs text-slate-200">
                รับสัญญาณเสียงรอบเสาไมค์ในโซนป่าอนุรักษ์พร้อมรัศมีพิกัด GPS
              </p>
            </div>
            <div className="rounded-lg border border-[#28543F] bg-[#163628] p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#95D5B2]">
                <Shield className="h-4 w-4" />
                <span>AI AudioCNN 9 คลาส</span>
              </div>
              <p className="mt-1 text-xs text-slate-200">
                จำแนกเสียงเลื่อยยนต์ ไฟป่า เสียงปืน และยานพาหนะแยกตามช่วงเวลา
              </p>
            </div>
            <div className="rounded-lg border border-[#28543F] bg-[#163628] p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#95D5B2]">
                <UserCheck className="h-4 w-4" />
                <span>สั่งการ & Telegram</span>
              </div>
              <p className="mt-1 text-xs text-slate-200">
                แจ้งเตือนด่วนผ่าน Telegram และติดตามการตรวจพื้นที่ของภาคสนาม
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[#234937] flex flex-wrap items-center justify-between gap-4 text-xs text-[#95D5B2]/80">
          <span>ป่าอยู่ได้ คนอยู่ดี อนาคตยั่งยืน • SDG 15 Life on Land</span>
          <span className="font-mono-code">v1.0 • Supabase PostGIS + AudioCNN</span>
        </div>
      </section>

      {/* Right Authentication Form Panel */}
      <section className="lg:col-span-5 flex items-center justify-center bg-[#F2F4F1] p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-md rounded-xl border border-[#CED8D0] bg-white p-6 sm:p-8 shadow-sm">
          <div className="border-b border-[#E4ECE6] pb-4">
            <h2 className="text-xl font-bold text-[#14241B]">
              เข้าสู่ระบบสำหรับเจ้าหน้าที่
            </h2>
            <p className="mt-1 text-xs text-[#526358]">
              ใช้อีเมลหน่วยงานหรือรหัสพนักงานที่ผ่านการอนุมัติสิทธิ์แล้ว
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2.5 rounded-lg border-2 border-red-300 bg-red-50 p-3.5 text-xs font-semibold text-red-900 shadow-sm"
            >
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
              <div>
                <strong className="block text-red-950 font-bold">เข้าสู่ระบบไม่สำเร็จ:</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="login-identifier"
                className="block text-xs font-semibold text-[#14241B] mb-1.5"
              >
                อีเมลหน่วยงาน หรือ รหัสพนักงาน
              </label>
              <input
                id="login-identifier"
                type="text"
                required
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (error) setError("");
                }}
                placeholder="เช่น admin@rakforest.go.th หรือ RF-ADM-001"
                className="w-full rounded-lg border border-[#B8C7BC] bg-white px-3.5 py-2.5 text-sm text-[#14241B] focus:border-[#1B4332] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-[#14241B] mb-1.5"
              >
                รหัสผ่าน
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="••••••••"
                  aria-invalid={!!error}
                  className={`w-full rounded-lg border bg-white pl-3.5 pr-10 py-2.5 text-sm text-[#14241B] transition focus:outline-none ${
                    error
                      ? "border-red-500 ring-2 ring-red-200 text-red-950"
                      : "border-[#B8C7BC] focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[#526358] hover:text-[#14241B] rounded focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#1B4332] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2D6A4F] disabled:opacity-60 transition"
            >
              <KeyRound className="h-4 w-4" />
              <span>{busy ? "กำลังตรวจสอบสิทธิ์…" : "เข้าสู่ระบบปฏิบัติการ"}</span>
            </button>
          </form>

          {/* Quick Role Switcher for Evaluation / Testing */}
          <div className="mt-6 pt-5 border-t border-[#E4ECE6]">
            <p className="text-xs font-semibold text-[#526358] mb-2.5">
              บัญชีเจ้าหน้าที่สำหรับเข้าใช้งานตามบทบาท (คลิกเพื่อเข้าสู่ระบบทันที):
            </p>
            <div className="space-y-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => quickLogin("admin@rakforest.go.th")}
                className="w-full flex items-center justify-between rounded-lg border border-[#CBD6CE] bg-[#F8FAF8] px-3.5 py-2.5 text-left text-xs hover:border-[#1B4332] hover:bg-[#EBF2ED] transition"
              >
                <div>
                  <span className="font-bold text-[#14241B] block">
                    ดร.กิตติพงศ์ พิทักษ์ไพร (Super Admin)
                  </span>
                  <span className="font-mono-code text-[11px] text-[#526358]">
                    RF-ADM-001 • สิทธิ์จัดการศูนย์สั่งการ + สลับดูหน้าภาคสนามได้
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-[#1B4332] shrink-0" />
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => quickLogin("officer@rakforest.go.th")}
                className="w-full flex items-center justify-between rounded-lg border border-[#CBD6CE] bg-[#F8FAF8] px-3.5 py-2.5 text-left text-xs hover:border-[#1B4332] hover:bg-[#EBF2ED] transition"
              >
                <div>
                  <span className="font-bold text-[#14241B] block">
                    วรัญญา ศรีสุวรรณ (เจ้าหน้าที่ส่วนกลาง Backoffice)
                  </span>
                  <span className="font-mono-code text-[11px] text-[#526358]">
                    RF-OPS-014 • ตรวจวิเคราะห์เสียง ดูแผนที่ มอบหมายงาน
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-[#1B4332] shrink-0" />
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => quickLogin("ranger@rakforest.go.th")}
                className="w-full flex items-center justify-between rounded-lg border border-[#CBD6CE] bg-[#F8FAF8] px-3.5 py-2.5 text-left text-xs hover:border-[#1B4332] hover:bg-[#EBF2ED] transition"
              >
                <div>
                  <span className="font-bold text-[#14241B] block">
                    สมชาย ใจดี (เจ้าหน้าที่พิทักษ์ป่าภาคสนาม Field PWA)
                  </span>
                  <span className="font-mono-code text-[11px] text-[#526358]">
                    RF-RNG-108 • รับงานตรวจเสาไมค์ อัดเสียงสด แจ้งเหตุพร้อม GPS
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-[#1B4332] shrink-0" />
              </button>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between text-xs text-[#526358]">
            <span>ได้รับรหัส OTP สำหรับยืนยันบัญชีใหม่?</span>
            <Link
              href="/verify"
              className="font-semibold text-[#1B4332] hover:underline"
            >
              หน้ายืนยันรหัส OTP →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
