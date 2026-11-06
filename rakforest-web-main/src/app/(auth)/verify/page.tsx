"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, ShieldCheck } from "lucide-react";
import { rakforestRepo } from "@/lib/supabase/repository";
import type { Profile } from "@/types/database.types";

export default function VerifyAccountPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    rakforestRepo.getProfiles().then((list) => {
      const pending = list.filter((p) => p.role === "pending_verification");
      setProfiles(pending);
      if (pending[0]) setSelectedId(pending[0].id);
    });
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !otp.trim()) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const updated = await rakforestRepo.verifyAccountOtp(selectedId, otp);
      setMessage(
        `ยืนยันรหัส OTP ของคุณ ${updated.full_name} สำเร็จแล้ว สถานะปัจจุบัน: รอผู้ดูแลระบบอนุมัติขั้นสุดท้าย`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "รหัส OTP ไม่ถูกต้อง");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F2F4F1] p-6">
      <div className="w-full max-w-lg rounded-xl border border-[#CED8D0] bg-white p-6 sm:p-8 shadow-sm">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B4332] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับหน้าเข้าสู่ระบบ
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EBF2ED] text-[#1B4332]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#14241B]">
              ยืนยันตัวตนพนักงานด้วยรหัส OTP
            </h1>
            <p className="text-xs text-[#526358]">
              ขั้นตอนที่ 3 จาก 4 ของการเปิดสิทธิ์เจ้าหน้าที่ใหม่
            </p>
          </div>
        </div>

        {message && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs font-medium text-emerald-900">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700 mt-0.5" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-medium text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#14241B] mb-1.5">
              เลือกบัญชีที่อยู่ระหว่างรอยืนยันตัวตน
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-lg border border-[#B8C7BC] bg-white px-3 py-2.5 text-sm"
            >
              {profiles.length === 0 ? (
                <option value="">ไม่มีบัญชีที่รอยืนยัน OTP</option>
              ) : (
                profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.employee_code} · {p.full_name} ({p.department})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#14241B] mb-1.5">
              รหัส OTP 6 หลัก (ที่ได้รับทางอีเมลหน่วยงาน)
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="กรอกรหัส 6 หลัก เช่น 482910"
              className="w-full rounded-lg border border-[#B8C7BC] bg-white px-3.5 py-2.5 font-mono-code text-base tracking-widest"
            />
          </div>

          <button
            type="submit"
            disabled={busy || !selectedId}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#1B4332] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2D6A4F] disabled:opacity-50"
          >
            <KeyRound className="h-4 w-4" />
            <span>ยืนยันรหัส OTP</span>
          </button>
        </form>
      </div>
    </main>
  );
}
