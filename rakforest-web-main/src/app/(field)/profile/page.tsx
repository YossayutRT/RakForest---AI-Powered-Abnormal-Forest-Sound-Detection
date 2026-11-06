"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Send, ShieldCheck, User } from "lucide-react";
import { rakforestRepo } from "@/lib/supabase/repository";
import { ROLE_LABELS_TH } from "@/lib/utils/risk";
import type { ForestZone, Profile } from "@/types/database.types";

export default function FieldRangerProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [zones, setZones] = useState<ForestZone[]>([]);

  useEffect(() => {
    Promise.all([
      rakforestRepo.getCurrentProfile(),
      rakforestRepo.getZones(),
    ]).then(([p, z]) => {
      setProfile(p);
      setZones(z);
    });
  }, []);

  async function handleLogout() {
    await rakforestRepo.signOut();
    router.push("/login");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <h1 className="text-xl sm:text-2xl font-bold text-[#14241B]">
        ข้อมูลประจำตัวเจ้าหน้าที่และการแจ้งเตือน
      </h1>

      <section className="rounded-lg border border-[#D4DCD5] bg-white p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-4 border-b border-[#E4ECE6] pb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EBF2ED] text-[#1B4332]">
            <User className="h-7 w-7" />
          </div>
          <div>
            <span className="font-mono-code text-xs font-bold text-[#1B4332]">
              {profile?.employee_code ?? "RF-RNG-108"}
            </span>
            <h2 className="text-lg font-bold text-[#14241B]">
              {profile?.full_name ?? "สมชาย ใจดี"}
            </h2>
            <p className="text-xs text-[#526358]">
              {profile?.position} • {profile?.department}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[#526358] block">บทบาทสิทธิ์การใช้งาน</span>
            <strong className="text-[#14241B] text-sm">
              {profile ? ROLE_LABELS_TH[profile.role] : "เจ้าหน้าที่ภาคสนาม"}
            </strong>
          </div>
          <div>
            <span className="text-[#526358] block">สถานะการยืนยันตัวตน</span>
            <span className="inline-flex items-center gap-1 text-emerald-800 font-bold text-sm">
              <ShieldCheck className="h-4 w-4" />
              ยืนยันตัวตนและอนุมัติแล้ว
            </span>
          </div>
          <div>
            <span className="text-[#526358] block">อีเมลหน่วยงาน</span>
            <strong className="font-mono-code text-[#14241B]">
              {profile?.email ?? "ranger@rakforest.go.th"}
            </strong>
          </div>
          <div>
            <span className="text-[#526358] block">การเชื่อมต่อ Telegram แจ้งเตือน</span>
            <span className="inline-flex items-center gap-1 font-mono-code font-bold text-[#1B4332]">
              <Send className="h-3.5 w-3.5" />
              Chat ID: {profile?.telegram_chat_id || "1750820064"}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-[#E4ECE6]">
          <p className="text-xs font-bold text-[#14241B] mb-2">
            โซนป่าอนุรักษ์ในความรับผิดชอบ:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {zones.slice(0, 2).map((z) => (
              <div
                key={z.id}
                className="rounded border border-[#D4DCD5] bg-[#F8FAF8] p-2.5 text-xs"
              >
                <span className="font-mono-code font-bold text-[#1B4332] block">
                  {z.zone_code}
                </span>
                <span className="font-semibold text-[#14241B]">{z.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-[#E4ECE6] flex justify-end">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-xs font-bold text-[#D62828] hover:bg-red-100"
          >
            <LogOut className="h-4 w-4" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </section>
    </div>
  );
}
