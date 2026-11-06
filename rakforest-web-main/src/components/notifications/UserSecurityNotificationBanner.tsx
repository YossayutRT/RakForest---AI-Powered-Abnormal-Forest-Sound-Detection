"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, ShieldAlert, X } from "lucide-react";
import { rakforestRepo } from "@/lib/supabase/repository";
import type { UserNotification } from "@/types/database.types";

export default function UserSecurityNotificationBanner() {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    async function checkNotifications() {
      const profile = await rakforestRepo.getCurrentProfile();
      if (!profile) return;
      const list = await rakforestRepo.getUserNotifications(profile.id);
      const unread = list.filter((n) => !n.is_read);
      setNotifications(unread);
    }

    checkNotifications();

    // Listen for custom event or storage change
    const handler = () => checkNotifications();
    window.addEventListener("rakforest-data-updated", handler);
    return () => window.removeEventListener("rakforest-data-updated", handler);
  }, []);

  async function handleDismiss(notificationId: string) {
    setBusyId(notificationId);
    try {
      await rakforestRepo.markNotificationAsRead(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } finally {
      setBusyId(null);
    }
  }

  if (notifications.length === 0) return null;

  return (
    <div className="space-y-2 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border-2 border-amber-400 bg-amber-50 p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-amber-100 p-1.5 text-amber-900 shrink-0 mt-0.5">
              <ShieldAlert className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                {notif.title}
              </h4>
              <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                {notif.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              disabled={busyId === notif.id}
              onClick={() => handleDismiss(notif.id)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs transition"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>รับทราบแล้ว</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
