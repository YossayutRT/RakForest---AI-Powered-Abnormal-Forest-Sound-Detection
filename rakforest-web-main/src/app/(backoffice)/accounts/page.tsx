"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  ShieldAlert,
  Sparkles,
  UserCheck,
  UserPlus,
  UserX,
  X,
} from "lucide-react";
import { rakforestRepo } from "@/lib/supabase/repository";
import { ROLE_LABELS_TH } from "@/lib/utils/risk";
import type { Profile, UserRole } from "@/types/database.types";

export default function BackofficeAccountsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmSuspendProfile, setConfirmSuspendProfile] =
    useState<Profile | null>(null);
  const [feedback, setFeedback] = useState("");

  // Super Admin Password Edit Modal state
  const [editingPasswordProfile, setEditingPasswordProfile] =
    useState<Profile | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [notifyUserCheck, setNotifyUserCheck] = useState(true);
  const [modalError, setModalError] = useState("");
  const [modalBusy, setModalBusy] = useState(false);

  function generateSecurePassword(): string {
    const charsLower = "abcdefghjkmnpqrstuvwxyz";
    const charsUpper = "ABCDEFGHJKMNPQRSTUVWXYZ";
    const charsNum = "23456789";
    const charsSpecial = "@#$!%";

    let pwd = "";
    for (let i = 0; i < 3; i++)
      pwd += charsUpper[Math.floor(Math.random() * charsUpper.length)];
    for (let i = 0; i < 4; i++)
      pwd += charsLower[Math.floor(Math.random() * charsLower.length)];
    for (let i = 0; i < 3; i++)
      pwd += charsNum[Math.floor(Math.random() * charsNum.length)];
    for (let i = 0; i < 2; i++)
      pwd += charsSpecial[Math.floor(Math.random() * charsSpecial.length)];

    return pwd
      .split("")
      .sort(() => 0.5 - Math.random())
      .join("");
  }

  async function handleSaveNewPassword() {
    if (!editingPasswordProfile) return;
    if (newPasswordInput.length < 8) {
      setModalError("รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (
      !/[a-z]/.test(newPasswordInput) ||
      !/[A-Z]/.test(newPasswordInput) ||
      !/[0-9]/.test(newPasswordInput)
    ) {
      setModalError("รหัสผ่านต้องมีทั้งตัวพิมพ์เล็ก, ตัวพิมพ์ใหญ่ และตัวเลข");
      return;
    }

    setModalBusy(true);
    setModalError("");
    try {
      await rakforestRepo.adminResetUserPassword({
        userId: editingPasswordProfile.id,
        newPassword: newPasswordInput.trim(),
        notifyUser: notifyUserCheck,
      });
      setFeedback(
        `แก้ไขรหัสผ่านของ ${editingPasswordProfile.full_name} (${editingPasswordProfile.employee_code ?? "RF-NEW"}) และส่งการแจ้งเตือนความปลอดภัยไปยัง UserID เรียบร้อยแล้ว`
      );
      setEditingPasswordProfile(null);
      setNewPasswordInput("");
      await loadProfiles();
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการแก้ไขรหัสผ่าน"
      );
    } finally {
      setModalBusy(false);
    }
  }

  const loadProfiles = useCallback(async () => {
    const list = await rakforestRepo.getProfiles();
    setProfiles(list);
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  async function handleRoleChange(profileId: string, role: UserRole) {
    setBusyId(profileId);
    setFeedback("");
    try {
      const updated = await rakforestRepo.approveAccountRole(profileId, role);
      await loadProfiles();
      setConfirmSuspendProfile(null);
      setFeedback(
        `อัปเดตสิทธิ์ของ ${updated.full_name} เป็น "${ROLE_LABELS_TH[role]}" เรียบร้อยแล้ว`
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#14241B]">
            จัดการบัญชีเจ้าหน้าที่และการยืนยันตัวตนพนักงาน
          </h1>
          <p className="text-xs text-[#526358]">
            ตรวจสอบสถานะการยืนยันบัตรประจำตัวเจ้าหน้าที่ รหัส OTP และอนุมัติสิทธิ์การเข้าใช้งานระบบตามบทบาท (RBAC)
          </p>
        </div>

        <Link
          href="/accounts/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[#1B4332] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-[#2D6A4F]"
        >
          <UserPlus className="h-4 w-4" />
          <span>+ ลงทะเบียนเจ้าหน้าที่ใหม่ (4 ขั้นตอน)</span>
        </Link>
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

      {/* Confirmation Banner before suspending an account */}
      {confirmSuspendProfile && (
        <div
          role="alertdialog"
          aria-labelledby="confirm-suspend-title"
          className="rounded-lg border-2 border-red-300 bg-red-50 p-4 space-y-3"
        >
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="h-5 w-5 text-[#D62828] shrink-0 mt-0.5" />
            <div>
              <p
                id="confirm-suspend-title"
                className="text-sm font-bold text-red-950"
              >
                ยืนยันการระงับสิทธิ์ใช้งานของ “{confirmSuspendProfile.full_name}” (
                {confirmSuspendProfile.employee_code}) ใช่หรือไม่?
              </p>
              <p className="text-xs text-red-900 mt-0.5">
                เมื่อระงับสิทธิ์แล้ว เจ้าหน้าที่ท่านนี้จะไม่สามารถเข้าสู่ระบบหรือส่งรายงานได้จนกว่าจะกดคืนสิทธิ์ใช้งาน
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={busyId === confirmSuspendProfile.id}
              onClick={() =>
                handleRoleChange(confirmSuspendProfile.id, "suspended")
              }
              className="min-h-11 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#D62828] px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-red-800"
            >
              <UserX className="h-4 w-4" />
              <span>ยืนยันการระงับสิทธิ์</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirmSuspendProfile(null)}
              className="min-h-11 inline-flex items-center justify-center rounded-lg border border-red-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-[#14241B] hover:bg-slate-100"
            >
              ยกเลิก (ย้อนกลับ)
            </button>
          </div>
        </div>
      )}

      {/* Responsive Accounts Table (Desktop) & Cards (Mobile) */}
      <section className="rounded-lg border border-[#D4DCD5] bg-white overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#D4DCD5] bg-[#F4F7F4] text-[#435449]">
                <th className="py-3 px-4 font-semibold">รหัสพนักงาน / ชื่อ-สกุล</th>
                <th className="py-3 px-4 font-semibold">ตำแหน่ง / หน่วยงาน</th>
                <th className="py-3 px-4 font-semibold">สถานะยืนยันตัวตน</th>
                <th className="py-3 px-4 font-semibold">บทบาท (Role)</th>
                <th className="py-3 px-4 font-semibold text-right">การอนุมัติ / จัดการสิทธิ์</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5ECE6]">
              {profiles.map((p) => (
                <tr key={p.id} className="hover:bg-[#F8FAF8]">
                  <td className="py-3.5 px-4">
                    <span className="font-mono-code font-bold text-[#1B4332] block">
                      {p.employee_code ?? "RF-NEW"}
                    </span>
                    <strong className="text-sm text-[#14241B] block">
                      {p.full_name}
                    </strong>
                    <span className="text-[11px] text-[#526358]">
                      {p.email} • {p.phone}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-[#14241B] block">
                      {p.position}
                    </span>
                    <span className="text-[#526358]">{p.department}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${
                        p.verification_status === "approved"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : p.verification_status === "otp_verified"
                            ? "border-blue-300 bg-blue-50 text-blue-800"
                            : "border-amber-300 bg-amber-50 text-amber-800"
                      }`}
                    >
                      {p.verification_status === "approved"
                        ? "อนุมัติแล้ว"
                        : p.verification_status === "otp_verified"
                          ? "ยืนยัน OTP แล้ว (รออนุมัติ)"
                          : p.verification_status === "otp_sent"
                            ? `ส่ง OTP แล้ว (${p.otp_code ?? ""})`
                            : "รอตรวจสอบ"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#14241B]">
                    {ROLE_LABELS_TH[p.role]}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => {
                          setEditingPasswordProfile(p);
                          setNewPasswordInput("");
                          setShowNewPassword(false);
                          setNotifyUserCheck(true);
                          setModalError("");
                        }}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#B8C7BC] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1B4332] hover:bg-[#EBF2ED] transition shadow-xs"
                        title="แก้ไขรหัสผ่านและส่งแจ้งเตือน"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        <span>แก้ไขรหัสผ่าน</span>
                      </button>

                      {p.role === "pending_verification" && (
                        <>
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() =>
                              handleRoleChange(p.id, "field_ranger")
                            }
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#1B4332] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2D6A4F]"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>อนุมัติภาคสนาม</span>
                          </button>
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() =>
                              handleRoleChange(p.id, "officer_backoffice")
                            }
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#1B4332] bg-white px-3 py-1.5 text-xs font-semibold text-[#1B4332] hover:bg-[#EBF2ED]"
                          >
                            <span>อนุมัติส่วนกลาง</span>
                          </button>
                        </>
                      )}
                      {p.role !== "super_admin" && p.role !== "suspended" && (
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          onClick={() => setConfirmSuspendProfile(p)}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#D62828] hover:bg-red-50"
                        >
                          <UserX className="h-3.5 w-3.5" />
                          <span>ระงับสิทธิ์</span>
                        </button>
                      )}
                      {p.role === "suspended" && (
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          onClick={() => handleRoleChange(p.id, "field_ranger")}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800"
                        >
                          <span>คืนสิทธิ์ใช้งาน</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards (<768px) */}
        <div className="divide-y divide-[#E5ECE6] md:hidden">
          {profiles.map((p) => (
            <div key={p.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono-code text-xs font-bold text-[#1B4332]">
                  {p.employee_code}
                </span>
                <span className="text-xs font-semibold text-[#526358]">
                  {ROLE_LABELS_TH[p.role]}
                </span>
              </div>
              <p className="text-sm font-bold text-[#14241B]">{p.full_name}</p>
              <p className="text-xs text-[#526358]">
                {p.position} • {p.department}
              </p>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-[#F0F4F1]">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPasswordProfile(p);
                    setNewPasswordInput("");
                    setShowNewPassword(false);
                    setNotifyUserCheck(true);
                    setModalError("");
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#B8C7BC] bg-white py-2 text-xs font-semibold text-[#1B4332] hover:bg-[#EBF2ED]"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>แก้ไขรหัสผ่าน</span>
                </button>
              </div>

              {p.role === "pending_verification" && (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleRoleChange(p.id, "field_ranger")}
                    className="flex-1 rounded bg-[#1B4332] py-2 text-xs font-semibold text-white"
                  >
                    อนุมัติเป็นเจ้าหน้าที่ภาคสนาม
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleChange(p.id, "officer_backoffice")}
                    className="flex-1 rounded border border-[#1B4332] py-2 text-xs font-semibold text-[#1B4332]"
                  >
                    อนุมัติเป็นส่วนกลาง
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Super Admin Reset Password Modal */}
      {editingPasswordProfile && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md rounded-xl border border-[#C6D1C8] bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4ECE6] pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-emerald-100 p-2 text-[#1B4332]">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#14241B]">
                    แก้ไขรหัสผ่านเจ้าหน้าที่
                  </h2>
                  <p className="text-xs text-[#526358]">
                    {editingPasswordProfile.full_name} ({editingPasswordProfile.employee_code ?? "RF-NEW"})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPasswordProfile(null)}
                className="p-1.5 text-[#526358] hover:text-[#14241B] rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-2.5 text-xs font-semibold text-red-800">
                {modalError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#14241B]">
                    รหัสผ่านใหม่ (New Password) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPasswordInput(generateSecurePassword())}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1B4332] hover:underline"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>สุ่มรหัสผ่านอัตโนมัติ</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPasswordInput}
                    onChange={(e) => {
                      setNewPasswordInput(e.target.value);
                      if (modalError) setModalError("");
                    }}
                    placeholder="อย่างน้อย 8 ตัวอักษร (a-z, A-Z, 0-9)"
                    className="w-full rounded-lg border border-[#B8C7BC] bg-white pl-3.5 pr-10 py-2.5 text-sm font-mono-code text-[#14241B] focus:border-[#1B4332] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[#526358] hover:text-[#14241B]"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-[#526358] mt-1">
                  เกณฑ์ความปลอดภัย: ต้องมีอย่างน้อย 8 ตัวอักษร, มีตัวพิมพ์เล็ก พิมพ์ใหญ่ และตัวเลข
                </p>
              </div>

              {/* Notify User Checkbox */}
              <label className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyUserCheck}
                  onChange={(e) => setNotifyUserCheck(e.target.checked)}
                  className="mt-0.5 rounded border-[#1B4332] text-[#1B4332] focus:ring-[#1B4332]"
                />
                <div>
                  <span className="font-bold text-emerald-950 block">
                    แจ้งเตือนไปยังเจ้าหน้าที่ (UserID) ทันที
                  </span>
                  <span className="text-[11px] text-emerald-800 block">
                    ระบบจะแสดง In-App Security Banner เมื่อเจ้าหน้าที่ล็อกอิน + ส่งแจ้งเตือนผ่าน Telegram Bot
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E4ECE6]">
              <button
                type="button"
                disabled={modalBusy}
                onClick={() => setEditingPasswordProfile(null)}
                className="rounded-lg border border-[#C6D1C8] px-4 py-2.5 text-xs font-semibold text-[#526358] hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={modalBusy || !newPasswordInput}
                onClick={handleSaveNewPassword}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B4332] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#2D6A4F] disabled:opacity-50"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>{modalBusy ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่และแจ้งเตือน"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
