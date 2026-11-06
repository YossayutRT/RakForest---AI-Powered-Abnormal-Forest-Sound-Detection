"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  Home,
  Map as MapIcon,
  Mic,
  RefreshCw,
  Shield,
  User,
  Wifi,
  WifiOff,
} from "lucide-react";
import { rakforestRepo } from "@/lib/supabase/repository";
import { offlineReportQueue } from "@/lib/offline/report-queue";
import FontScaleToggle from "@/components/ui/FontScaleToggle";
import RakForestLogo, { type LogoVariant } from "@/components/ui/RakForestLogo";
import UserSecurityNotificationBanner from "@/components/notifications/UserSecurityNotificationBanner";
import type { Profile } from "@/types/database.types";

const FIELD_NAV = [
  {
    href: "/home",
    label: "หน้าแรกปฏิบัติการ",
    shortLabel: "หน้าแรก",
    icon: Home,
    isPrimaryRecord: false,
  },
  {
    href: "/field-reports",
    matchPrefix: "/field-reports",
    label: "งานตรวจเสา & ประวัติ",
    shortLabel: "งานของฉัน",
    icon: ClipboardList,
    isPrimaryRecord: false,
  },
  {
    href: "/report/new",
    label: "บันทึกเสียง / แจ้งเหตุ",
    shortLabel: "อัดเสียง",
    icon: Mic,
    isPrimaryRecord: true, // Center Red Action Button on Mobile Navbar!
  },
  {
    href: "/field-map",
    matchPrefix: "/field-map",
    label: "แผนที่เขตรับผิดชอบ",
    shortLabel: "แผนที่",
    icon: MapIcon,
    isPrimaryRecord: false,
  },
  {
    href: "/profile",
    label: "ข้อมูลเจ้าหน้าที่",
    shortLabel: "โปรไฟล์",
    icon: User,
    isPrimaryRecord: false,
  },
];

export default function FieldRangerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const checkQueue = useCallback(async () => {
    const items = await offlineReportQueue.list();
    setPendingOfflineCount(items.length);
  }, []);

  const syncOfflineReports = useCallback(async () => {
    const items = await offlineReportQueue.list();
    if (!items.length) return;
    setSyncing(true);
    try {
      for (const item of items) {
        const audioFile = item.audioBlob
          ? new File([item.audioBlob], item.audioName || "offline_audio.wav", {
              type: item.audioType || "audio/wav",
            })
          : null;
        await rakforestRepo.createReportWithAudio({
          sourceType: "field_patrol",
          stationId: item.stationId,
          zoneId: item.zoneId,
          lat: item.lat,
          lng: item.lng,
          description: item.description,
          audioFile,
        });
        await offlineReportQueue.remove(item.id);
      }
      await checkQueue();
    } finally {
      setSyncing(false);
    }
  }, [checkQueue]);

  useEffect(() => {
    rakforestRepo.getCurrentProfile().then((p) => {
      if (!p) {
        router.replace("/login");
        return;
      }
      setProfile(p);
    });
    checkQueue();

    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const onOnline = () => {
      setIsOnline(true);
      syncOfflineReports();
    };
    const onOffline = () => setIsOnline(false);
    const onQueueChange = () => checkQueue();

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("rakforest-offline-queue-changed", onQueueChange);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener(
        "rakforest-offline-queue-changed",
        onQueueChange
      );
    };
  }, [router, checkQueue, syncOfflineReports]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F2F4F1]">
      {/* Top Header Bar (Clean & Compact on Mobile, Full Horizontal Nav on Tablet/Desktop) */}
      <header className="sticky top-0 z-30 border-b border-[#214534] bg-[#112A1F] text-white shadow-xs">
        <div className="max-w-[1440px] mx-auto px-3.5 sm:px-6 h-15 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link href="/home" className="flex items-center gap-2.5 min-w-0">
              <RakForestLogo variant="shield-radar" size={36} />
              <div className="min-w-0">
                <span className="font-bold text-sm sm:text-base tracking-tight block leading-tight truncate">
                  RakForest Field
                </span>
                <span className="font-mono-code text-[10px] text-[#95D5B2] block truncate">
                  หน่วยลาดตระเวนภาคสนาม
                </span>
              </div>
            </Link>

            {/* Desktop & Tablet Horizontal Navigation (>= 768px) */}
            <nav
              aria-label="เมนูเจ้าหน้าที่ภาคสนาม"
              className="hidden md:flex items-center gap-1.5 ml-5"
            >
              {FIELD_NAV.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.matchPrefix && pathname.startsWith(item.matchPrefix));
                const Icon = item.icon;
                if (item.isPrimaryRecord) {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition shadow-xs ${
                        active
                          ? "bg-red-700 text-white ring-2 ring-amber-300"
                          : "bg-[#D62828] text-white hover:bg-red-700"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      active
                        ? "bg-[#2D6A4F] text-white"
                        : "text-[#C7DDD0] hover:bg-[#1B4332] hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Compact Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <FontScaleToggle variant="dark" />

            <span
              title={isOnline ? "ออนไลน์พร้อมซิงก์" : "โหมดออฟไลน์ในป่า"}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold whitespace-nowrap ${
                isOnline
                  ? "bg-emerald-950/90 text-emerald-300 border border-emerald-700"
                  : "bg-amber-950/90 text-amber-300 border border-amber-700"
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">ออนไลน์</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden xs:inline">ออฟไลน์</span>
                </>
              )}
            </span>

            {pendingOfflineCount > 0 && (
              <button
                type="button"
                disabled={syncing}
                onClick={syncOfflineReports}
                className="inline-flex h-9 items-center gap-1 rounded-lg bg-amber-500 px-2.5 text-xs font-bold text-slate-950 whitespace-nowrap"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
                />
                <span>ซิงก์ ({pendingOfflineCount})</span>
              </button>
            )}

            {profile && profile.role !== "field_ranger" && (
              <Link
                href="/dashboard"
                title="กลับศูนย์สั่งการ (Backoffice)"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#40916C] bg-[#1B4332] px-2.5 text-xs font-semibold text-white hover:bg-[#2D6A4F] whitespace-nowrap"
              >
                <Shield className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">ศูนย์สั่งการ</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Responsive Content Container */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-3.5 sm:px-6 py-4 sm:py-5 pb-28 md:pb-8">
        <UserSecurityNotificationBanner />
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar (< 768px) with Prominent Center Red Record Button */}
      <nav
        aria-label="เมนูด้านล่างสำหรับมือถือ"
        className="fixed inset-x-0 bottom-0 z-30 md:hidden border-t border-[#C6D1C8] bg-white/98 backdrop-blur-xs px-2 pt-1.5 pb-2 shadow-[0_-4px_16px_rgba(17,42,31,0.1)]"
      >
        <div className="grid grid-cols-5 items-end max-w-md mx-auto">
          {FIELD_NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.matchPrefix && pathname.startsWith(item.matchPrefix));
            const Icon = item.icon;

            if (item.isPrimaryRecord) {
              return (
                <div key={item.href} className="flex flex-col items-center -mt-5">
                  <Link
                    href={item.href}
                    aria-label="บันทึกเสียงสดหรือแจ้งเหตุฉุกเฉิน"
                    className={`flex h-14 w-14 items-center justify-center rounded-full bg-[#D62828] text-white shadow-lg border-4 border-white transition active:scale-95 ${
                      active ? "ring-2 ring-[#D62828] bg-red-700" : "hover:bg-red-700"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </Link>
                  <span
                    className={`mt-0.5 text-[11px] font-extrabold ${
                      active ? "text-[#D62828]" : "text-[#B91C1C]"
                    }`}
                  >
                    {item.shortLabel}
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center min-h-12 py-1 rounded-xl text-[11px] font-semibold transition ${
                  active
                    ? "text-[#1B4332] font-bold bg-[#EBF2ED]"
                    : "text-[#526358] hover:text-[#14241B]"
                }`}
              >
                <Icon className="h-5 w-5 mb-0.5" />
                <span className="truncate">{item.shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
