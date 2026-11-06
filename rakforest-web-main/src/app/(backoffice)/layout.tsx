"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  Compass,
  FileAudio,
  LogOut,
  Map as MapIcon,
  Menu,
  Radio,
  ShieldCheck,
  Trees,
  Users,
  X,
} from "lucide-react";
import { rakforestRepo } from "@/lib/supabase/repository";
import { ROLE_LABELS_TH } from "@/lib/utils/risk";
import FontScaleToggle from "@/components/ui/FontScaleToggle";
import RakForestLogo, { type LogoVariant } from "@/components/ui/RakForestLogo";
import UserSecurityNotificationBanner from "@/components/notifications/UserSecurityNotificationBanner";
import type { Profile } from "@/types/database.types";

const NAV_ITEMS = [
  { href: "/dashboard", label: "ภาพรวมศูนย์สั่งการ", icon: Activity },
  { href: "/map", label: "แผนที่ GIS & เสาไมค์", icon: MapIcon },
  { href: "/reports", label: "รายงาน & วิเคราะห์เสียง", icon: FileAudio },
  { href: "/zones", label: "จัดการโซนป่า & เสาไมค์", icon: Radio },
  { href: "/accounts", label: "จัดการบัญชีเจ้าหน้าที่", icon: Users },
  { href: "/settings/alerts", label: "ตั้งค่าแจ้งเตือน Telegram", icon: Bell },
];

export default function BackofficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    rakforestRepo.getCurrentProfile().then((p) => {
      if (!p) {
        router.replace("/login");
        return;
      }
      setProfile(p);
    });
  }, [router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await rakforestRepo.signOut();
    router.push("/login");
  }

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#F2F4F1]">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Operational Sidebar (Locked in place on desktop, never scrolls away!) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 h-full flex flex-col bg-[#112A1F] text-[#E6F0EA] transition-transform duration-200 lg:static lg:translate-x-0 shrink-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-[#214534]">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <RakForestLogo variant="shield-radar" size={38} />
            <div>
              <span className="font-bold text-base text-white tracking-tight block leading-none">
                RakForest
              </span>
              <span className="font-mono-code text-[10px] text-[#95D5B2]">
                COMMAND CENTER
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden rounded p-1 text-[#95D5B2] hover:bg-[#1B4332]"
            aria-label="ปิดเมนู"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links (Scrolls internally if sidebar height is small) */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#74A88E]">
            ระบบศูนย์ปฏิบัติการส่วนกลาง
          </p>
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-[#2D6A4F] text-white font-semibold shadow-xs"
                    : "text-[#C7DDD0] hover:bg-[#1B4332] hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-4 mt-4 border-t border-[#214534]">
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#74A88E]">
              สลับโหมดปฏิบัติการ
            </p>
            <Link
              href="/home"
              className="flex items-center gap-3 rounded-lg border border-[#32674E] bg-[#17382A] px-3 py-2.5 text-xs font-semibold text-[#B7E4C7] hover:bg-[#23503C] transition"
            >
              <Compass className="h-4 w-4 shrink-0" />
              <span>เปิดหน้าเจ้าหน้าที่ภาคสนาม (PWA)</span>
            </Link>
          </div>
        </div>

        {/* Sidebar Footer Status */}
        <div className="shrink-0 border-t border-[#214534] p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 text-[#95D5B2]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold">Supabase Realtime & AudioCNN</span>
          </div>
          {profile && (
            <div className="mt-2 pt-2 border-t border-[#214534]/70 text-[11px] text-[#B7E4C7]">
              <p className="font-semibold text-white truncate">
                {profile.full_name}
              </p>
              <p className="font-mono-code opacity-80">
                {profile.employee_code} • {ROLE_LABELS_TH[profile.role]}
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area: Only this column scrolls vertically on the page! */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Topbar (Locked sticky at top of the right panel) */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[#D4DCD5] bg-white px-4 sm:px-6 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden inline-flex items-center justify-center rounded-lg border border-[#C6D1C8] p-2 text-[#1B4332]"
              aria-label="เปิดเมนู"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-[#526358]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#1B4332] shrink-0" />
                <span className="truncate">
                  ศูนย์เฝ้าระวังไฟป่าและตรวจจับเสียงผิดปกติในป่าไม้ (Backoffice)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <FontScaleToggle variant="light" />
            <Link
              href="/home"
              className="hidden sm:inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#B8C7BC] bg-[#F5F8F5] px-3 py-1.5 text-xs font-semibold text-[#1B4332] hover:bg-[#E6EFE8]"
            >
              <Compass className="h-4 w-4" />
              <span>โหมดภาคสนาม</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#D4DCD5] bg-white px-3 py-1.5 text-xs font-semibold text-[#526358] hover:text-[#D62828] hover:border-red-300 transition"
            >
              <LogOut className="h-4 w-4" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto">
          <UserSecurityNotificationBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
