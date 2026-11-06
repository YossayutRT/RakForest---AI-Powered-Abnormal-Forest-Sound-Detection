import { NextResponse } from "next/server";
import { createServiceRoleSupabase } from "@/lib/supabase/server";
import { getClassNameTh, RISK_LABELS_TH } from "@/lib/utils/risk";
import type { RiskLevel } from "@/types/database.types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      reportId,
      reportCode = "RF-TEST",
      riskLevel = "red" as RiskLevel,
      predictedLabel = "chainsaw",
      confidence = 0.9,
      locationText = "เขตอนุรักษ์ป่าแม่ริม",
      note = "",
      customChatId,
    } = body;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = customChatId || process.env.TELEGRAM_CHAT_ID;

    const riskEmoji =
      riskLevel === "red" ? "🚨" : riskLevel === "yellow" ? "⚠️" : "🌲";
    const soundTh = getClassNameTh(predictedLabel);
    const riskTh = RISK_LABELS_TH[riskLevel as RiskLevel] ?? riskLevel;
    const pct = Math.round(Number(confidence) * 100);
    const timestampTh = new Date().toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
      dateStyle: "medium",
      timeStyle: "short",
    });

    const message = [
      `${riskEmoji} <b>[RakForest ศูนย์เฝ้าระวังเสียงป่าไม้]</b>`,
      `<b>รหัสรายงาน:</b> <code>${reportCode}</code>`,
      `<b>ระดับความเสี่ยง:</b> ${riskTh}`,
      `<b>เสียงที่ตรวจพบ:</b> ${soundTh} (ความมั่นใจ ${pct}%)`,
      `<b>จุดตรวจ/พิกัด:</b> ${locationText}`,
      `<b>เวลาตรวจพบ:</b> ${timestampTh}`,
      note ? `<b>รายละเอียด/คำสั่งการ:</b> ${note}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    let status: "sent" | "failed" = "sent";
    let errorMessage: string | null = null;

    if (botToken && chatId) {
      try {
        const tgRes = await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: message,
              parse_mode: "HTML",
            }),
            signal: AbortSignal.timeout(10000),
          }
        );

        if (!tgRes.ok) {
          const errJson = await tgRes.json().catch(() => ({}));
          status = "failed";
          errorMessage =
            errJson.description || `Telegram HTTP ${tgRes.status}`;
        }
      } catch (err) {
        status = "failed";
        errorMessage =
          err instanceof Error
            ? err.message
            : "ไม่สามารถเชื่อมต่อ Telegram API ได้";
      }
    } else {
      status = "sent";
      errorMessage = "บันทึกในระบบแล้ว (ไม่ได้ตั้งค่า TELEGRAM_BOT_TOKEN)";
    }

    const logRecord = {
      id: crypto.randomUUID(),
      report_id: reportId ?? null,
      channel: "telegram",
      recipient: chatId ? `Telegram Chat (${chatId})` : "ศูนย์ปฏิบัติการ Telegram",
      message: message.replace(/<[^>]+>/g, ""),
      status,
      error_message: errorMessage,
      sent_at: new Date().toISOString(),
    };

    try {
      const supabase = createServiceRoleSupabase();
      await supabase.from("notifications_log").insert(logRecord);
    } catch {
      // ignore if table not migrated yet
    }

    return NextResponse.json({
      ok: status === "sent",
      log: logRecord,
      message: logRecord.message,
      error: errorMessage,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "ส่งการแจ้งเตือนไม่สำเร็จ",
      },
      { status: 500 }
    );
  }
}
