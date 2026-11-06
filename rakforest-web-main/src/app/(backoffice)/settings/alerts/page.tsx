"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { rakforestRepo } from "@/lib/supabase/repository";
import { RiskBadge } from "@/components/reports/RiskBadge";
import type {
  NotificationLog,
  NotificationRule,
  RiskLevel,
} from "@/types/database.types";

const CHANNELS = [
  { id: "telegram", label: "Telegram Bot API (ช่องทางหลัก)" },
  { id: "sms", label: "SMS แจ้งเตือนด่วน" },
  { id: "email", label: "อีเมลหน่วยงาน" },
  { id: "push", label: "Web Push Notification" },
];

export default function BackofficeAlertSettingsPage() {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [testBusy, setTestBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [testNote, setTestNote] = useState(
    "ทดสอบการส่งสัญญาณแจ้งเตือนจากศูนย์สั่งการ RakForest เข้ากลุ่มปฏิบัติการ Telegram"
  );

  const loadData = useCallback(async () => {
    const [r, l] = await Promise.all([
      rakforestRepo.getNotificationRules(),
      rakforestRepo.getNotificationLogs(),
    ]);
    setRules(r);
    setLogs(l);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function toggleChannel(riskLevel: RiskLevel, channelId: string) {
    const target = rules.find((r) => r.risk_level === riskLevel);
    if (!target) return;
    const nextChannels = target.channels.includes(channelId)
      ? target.channels.filter((c) => c !== channelId)
      : [...target.channels, channelId];
    const updated = await rakforestRepo.updateNotificationRule({
      risk_level: riskLevel,
      channels: nextChannels,
    });
    setRules(updated);
    setFeedback(`บันทึกการตั้งค่าช่องทางแจ้งเตือนระดับ "${riskLevel}" แล้ว`);
  }

  async function sendLiveTelegramTest() {
    setTestBusy(true);
    setFeedback("");
    try {
      const log = await rakforestRepo.dispatchTelegramNotification({
        reportCode: "RF-TG-TEST",
        riskLevel: "red",
        predictedLabel: "chainsaw",
        confidence: 0.92,
        locationText: "เสาไมค์ ST-01 (ห้วยแม่ริม A • 18.1234, 98.7654)",
        note: testNote,
      });
      await loadData();
      setFeedback(
        log.status === "sent"
          ? "ส่งข้อความแจ้งเตือนเข้า Telegram สำเร็จแล้ว! กรุณาตรวจสอบในแอป Telegram ของคุณ"
          : `บันทึกประวัติแล้ว (${log.error_message ?? "ตรวจสอบสถานะด้านล่าง"})`
      );
    } finally {
      setTestBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#14241B]">
          ตั้งค่าการแจ้งเตือนอัตโนมัติ (Telegram Bot API & Multi-Channel Alerts)
        </h1>
        <p className="text-xs text-[#526358]">
          กำหนดเงื่อนไขการส่งข้อความแจ้งเตือนตามระดับความเสี่ยงของเสียงที่โมเดล AI ตรวจพบ และทดสอบส่งข้อความเข้า Telegram จริง
        </p>
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

      {/* Rules Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {rules.map((rule) => (
          <section
            key={rule.risk_level}
            className="rounded-lg border border-[#D4DCD5] bg-white p-4 space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <RiskBadge level={rule.risk_level} size="md" />
                <span className="font-mono-code text-xs text-[#526358]">
                  Rule: {rule.risk_level.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-[#435449] leading-relaxed">
                {rule.action_description}
              </p>
            </div>

            <div className="pt-3 border-t border-[#E4ECE6] space-y-2">
              <p className="text-xs font-bold text-[#14241B]">
                ช่องทางแจ้งเตือนที่เปิดใช้งาน:
              </p>
              {CHANNELS.map((ch) => (
                <label
                  key={ch.id}
                  className="flex items-center gap-2 text-xs text-[#14241B] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={rule.channels.includes(ch.id)}
                    onChange={() => toggleChannel(rule.risk_level, ch.id)}
                  />
                  <span>{ch.label}</span>
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Live Telegram Test Card */}
      <section className="rounded-lg border border-[#B8C7BC] bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4ECE6] pb-3">
          <div>
            <h2 className="text-base font-bold text-[#14241B]">
              ทดสอบส่งข้อความแจ้งเตือนเข้า Telegram จริง (Live Telegram Dispatch)
            </h2>
            <p className="text-xs text-[#526358]">
              เชื่อมต่อกับ TELEGRAM_BOT_TOKEN และ TELEGRAM_CHAT_ID (1750820064) ที่ตั้งค่าไว้ในระบบ
            </p>
          </div>
          <span className="rounded bg-emerald-50 border border-emerald-300 px-2.5 py-1 font-mono-code text-xs font-semibold text-emerald-800">
            ● Telegram Bot Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-9">
            <label className="block text-xs font-semibold text-[#14241B] mb-1">
              ข้อความคำสั่งการทดสอบที่จะส่งเข้า Telegram
            </label>
            <input
              type="text"
              value={testNote}
              onChange={(e) => setTestNote(e.target.value)}
              className="w-full rounded-lg border border-[#B8C7BC] px-3.5 py-2 text-xs sm:text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <button
              type="button"
              disabled={testBusy}
              onClick={sendLiveTelegramTest}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#1B4332] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-[#2D6A4F] disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>{testBusy ? "กำลังส่งเข้า Telegram…" : "ส่งข้อความทดสอบ"}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Notification Logs History */}
      <section className="rounded-lg border border-[#D4DCD5] bg-white p-4 sm:p-5 space-y-3">
        <h2 className="text-base font-bold text-[#14241B]">
          ประวัติการส่งข้อความแจ้งเตือนย้อนหลัง
        </h2>
        <div className="space-y-2.5">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-lg border border-[#E2E8E3] bg-[#F8FAF8] p-3 text-xs space-y-1"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono-code font-bold text-[#1B4332] uppercase">
                  [{log.channel}] {log.recipient}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 font-semibold ${
                      log.status === "sent"
                        ? "bg-emerald-100 text-emerald-900"
                        : "bg-red-100 text-red-900"
                    }`}
                  >
                    {log.status === "sent" ? "ส่งสำเร็จ" : "ล้มเหลว"}
                  </span>
                  <span className="text-[#526358]">
                    {new Date(log.sent_at).toLocaleString("th-TH", {
                      dateStyle: "short",
                      timeStyle: "medium",
                    })}
                  </span>
                </div>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-[#14241B] pt-1">
                {log.message}
              </pre>
              {log.error_message && (
                <p className="text-[11px] text-amber-800">{log.error_message}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
