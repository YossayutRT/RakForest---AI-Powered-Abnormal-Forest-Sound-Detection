"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  FileBadge,
  KeyRound,
  Lock,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { rakforestRepo } from "@/lib/supabase/repository";
import type { ForestZone, Profile, UserRole } from "@/types/database.types";

const PRESET_POSITIONS: {
  label: string;
  value: string;
  role: UserRole;
  dept: string;
}[] = [
  {
    label: "เจ้าหน้าที่พิทักษ์ป่าภาคสนาม (Field Ranger)",
    value: "เจ้าหน้าที่พิทักษ์ป่าภาคสนาม",
    role: "field_ranger",
    dept: "หน่วยพิทักษ์ป่าแม่ริม–สะเมิง",
  },
  {
    label: "หัวหน้าชุดลาดตระเวนเคลื่อนที่เร็ว (Patrol Leader)",
    value: "หัวหน้าชุดลาดตระเวนเคลื่อนที่เร็ว",
    role: "field_ranger",
    dept: "ชุดปฏิบัติการพิเศษป่าสงวนแม่แตง",
  },
  {
    label: "นักวิชาการป่าไม้ปฏิบัติการ (เวรศูนย์สั่งการ)",
    value: "นักวิชาการป่าไม้ปฏิบัติการ (เวรศูนย์สั่งการ)",
    role: "officer_backoffice",
    dept: "ศูนย์ปฏิบัติการเฝ้าระวังไฟป่าและทรัพยากรป่าไม้",
  },
  {
    label: "เจ้าหน้าที่วิเคราะห์ข้อมูล GIS และตรวจจับเสียง (Acoustic Analyst)",
    value: "เจ้าหน้าที่วิเคราะห์ข้อมูล GIS และตรวจจับเสียง",
    role: "officer_backoffice",
    dept: "กลุ่มงานระบบภูมิสารสนเทศและเทคโนโลยีเสียง AI",
  },
  {
    label: "เจ้าหน้าที่เทคโนโลยีและระบบเครือข่ายเซนเซอร์ (IoT Network)",
    value: "เจ้าหน้าที่เทคโนโลยีและระบบเครือข่ายเซนเซอร์",
    role: "officer_backoffice",
    dept: "ฝ่ายเทคโนโลยีสารสนเทศและเสาไมโครโฟน",
  },
  {
    label: "ผู้อำนวยการศูนย์เฝ้าระวังไฟป่าและทรัพยากรป่าไม้ (Director)",
    value: "ผู้อำนวยการศูนย์เฝ้าระวังไฟป่าและทรัพยากรป่าไม้",
    role: "super_admin",
    dept: "ส่วนควบคุมและปฏิบัติการไฟป่า (ส่วนกลาง)",
  },
  {
    label: "อาสาสมัครพิทักษ์ป่าชุมชน (Community Volunteer)",
    value: "อาสาสมัครพิทักษ์ป่าชุมชน",
    role: "field_ranger",
    dept: "เครือข่ายอาสาสมัครป่าชุมชนห้วยตึงเฒ่า",
  },
  {
    label: "เจ้าหน้าที่ประสานงานและธุรการ (Administrative Coordinator)",
    value: "เจ้าหน้าที่ประสานงานและธุรการ",
    role: "officer_backoffice",
    dept: "ฝ่ายอำนวยการและธุรการประจำศูนย์",
  },
  {
    label: "อื่นๆ (ระบุตำแหน่งเอง...)",
    value: "__custom__",
    role: "field_ranger",
    dept: "หน่วยงานราชการพิทักษ์ป่าไม้",
  },
];

export default function NewAccountVerificationStepperPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [zones, setZones] = useState<ForestZone[]>([]);

  // Step 1 fields
  const [employeeCode, setEmployeeCode] = useState("RF-RNG-120");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [positionSelect, setPositionSelect] = useState("เจ้าหน้าที่พิทักษ์ป่าภาคสนาม");
  const [customPosition, setCustomPosition] = useState("");
  const [department, setDepartment] = useState("หน่วยพิทักษ์ป่าแม่ริม–สะเมิง");
  const [targetRole, setTargetRole] = useState<UserRole>("field_ranger");
  const [selectedZones, setSelectedZones] = useState<string[]>([]);

  // Password fields (Policy: 8+ chars, lowercase, uppercase, number)
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  // Password rules validation
  const hasMinLength = password.length >= 8;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isPasswordValid =
    hasMinLength && hasLower && hasUpper && hasNumber && passwordsMatch;

  // Step 2 ID Card (Optional)
  const [idCardFile, setIdCardFile] = useState<File | null>(null);

  // Step 3 OTP
  const [createdProfile, setCreatedProfile] = useState<Profile | null>(null);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    rakforestRepo.getZones().then((z) => {
      setZones(z);
      if (z[0]) setSelectedZones([z[0].id]);
    });
  }, []);

  function handlePositionSelect(val: string) {
    setPositionSelect(val);
    const preset = PRESET_POSITIONS.find((p) => p.value === val);
    if (preset && preset.value !== "__custom__") {
      setTargetRole(preset.role);
      setDepartment(preset.dept);
    }
  }

  async function submitStep1(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!fullName.trim() || !email.trim()) {
      setError("กรุณากรอกชื่อ-นามสกุล และอีเมลหน่วยงานให้ครบถ้วน");
      return;
    }
    if (!isPasswordValid) {
      setPasswordTouched(true);
      setError(
        "กรุณากำหนดรหัสผ่านให้ถูกต้องตามเงื่อนไขความปลอดภัย (8 ตัวอักษรขึ้นไป, มีพิมพ์เล็ก พิมพ์ใหญ่ และตัวเลข) และยืนยันรหัสผ่านให้ตรงกัน"
      );
      return;
    }
    setStep(2);
  }

  async function submitStep2(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setBusy(true);
    setError("");
    try {
      let uploadedCardUrl: string | null = null;
      if (idCardFile) {
        try {
          const supabase = createClient();
          const ext = idCardFile.name.split(".").pop() || "jpg";
          const path = `${Date.now()}-${employeeCode}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("employee-ids")
            .upload(path, idCardFile, { upsert: true });
          if (!upErr) {
            uploadedCardUrl = supabase.storage
              .from("employee-ids")
              .getPublicUrl(path).data.publicUrl;
          }
        } catch {
          // ignore offline/sandbox storage error
        }
      }

      const effectivePosition =
        positionSelect === "__custom__"
          ? customPosition.trim() || "เจ้าหน้าที่พิทักษ์ป่า"
          : positionSelect;

      const { profile, otpCode } = await rakforestRepo.createAccountStep1({
        employee_code: employeeCode,
        full_name: fullName,
        email,
        phone,
        position: effectivePosition,
        department,
        targetRole,
        assigned_zone_ids: selectedZones,
        id_card_file_url: uploadedCardUrl,
        password: password.trim(),
      });
      setCreatedProfile(profile);
      setGeneratedOtp(otpCode);
      setOtpInput(otpCode);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "สร้างบัญชีไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function submitStep3(e: React.FormEvent) {
    e.preventDefault();
    if (!createdProfile) return;
    setBusy(true);
    setError("");
    try {
      const verified = await rakforestRepo.verifyAccountOtp(
        createdProfile.id,
        otpInput
      );
      setCreatedProfile(verified);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "รหัส OTP ไม่ถูกต้อง");
    } finally {
      setBusy(false);
    }
  }

  async function approveFinalStep() {
    if (!createdProfile) return;
    setBusy(true);
    try {
      await rakforestRepo.approveAccountRole(createdProfile.id, targetRole);
      router.push("/accounts");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <Link
          href="/accounts"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B4332] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับหน้าจัดการบัญชีทั้งหมด
        </Link>
        <h1 className="mt-1 text-xl font-bold text-[#14241B]">
          ลงทะเบียนและยืนยันตัวตนเจ้าหน้าที่ใหม่ (4-Step Verification)
        </h1>
      </div>

      {/* 4-Step Progress Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { num: 1, title: "1. ข้อมูลพนักงาน", icon: UserPlus },
          { num: 2, title: "2. บัตรเจ้าหน้าที่", icon: FileBadge },
          { num: 3, title: "3. ยืนยันรหัส OTP", icon: KeyRound },
          { num: 4, title: "4. อนุมัติเปิดสิทธิ์", icon: ShieldCheck },
        ].map((item) => {
          const active = step === item.num;
          const done = step > item.num;
          return (
            <div
              key={item.num}
              className={`rounded-lg border p-3 text-xs font-semibold flex items-center gap-2 ${
                active
                  ? "border-[#1B4332] bg-[#1B4332] text-white"
                  : done
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : "border-[#D4DCD5] bg-white text-[#526358]"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.title}</span>
            </div>
          );
        })}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-800"
        >
          {error}
        </div>
      )}

      {/* Step 1: Employee Details */}
      {step === 1 && (
        <form
          onSubmit={submitStep1}
          className="rounded-lg border border-[#D4DCD5] bg-white p-6 space-y-4"
        >
          <h2 className="text-base font-bold text-[#14241B] border-b border-[#E4ECE6] pb-2.5">
            ขั้นตอนที่ 1: กรอกข้อมูลพนักงานและโซนรับผิดชอบ
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#14241B] mb-1">
                รหัสพนักงาน *
              </label>
              <input
                type="text"
                required
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                className="w-full rounded border border-[#B8C7BC] px-3 py-2 text-sm font-mono-code"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#14241B] mb-1">
                ชื่อ–นามสกุล *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="เช่น จ.อ.วิชัย พิทักษ์พงษ์"
                className="w-full rounded border border-[#B8C7BC] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#14241B] mb-1">
                อีเมลหน่วยงาน *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="wichai@rakforest.go.th"
                className="w-full rounded border border-[#B8C7BC] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#14241B] mb-1">
                เบอร์โทรศัพท์
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="081-xxx-xxxx"
                className="w-full rounded border border-[#B8C7BC] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#14241B] mb-1">
                ตำแหน่งงาน *
              </label>
              <select
                value={positionSelect}
                onChange={(e) => handlePositionSelect(e.target.value)}
                className="w-full rounded border border-[#B8C7BC] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
              >
                {PRESET_POSITIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {positionSelect === "__custom__" && (
                <input
                  type="text"
                  required
                  placeholder="พิมพ์ระบุชื่อตำแหน่งงาน..."
                  value={customPosition}
                  onChange={(e) => setCustomPosition(e.target.value)}
                  className="mt-2 w-full rounded border border-[#B8C7BC] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#14241B] mb-1">
                บทบาทที่ต้องการเปิดสิทธิ์
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as UserRole)}
                className="w-full rounded border border-[#B8C7BC] px-3 py-2 text-sm"
              >
                <option value="field_ranger">
                  เจ้าหน้าที่ภาคสนาม (Field Ranger)
                </option>
                <option value="officer_backoffice">
                  เจ้าหน้าที่ส่วนกลาง (Backoffice)
                </option>
                <option value="super_admin">ผู้ดูแลระบบ (Super Admin)</option>
              </select>
            </div>
          </div>

          {/* Password Creation (Policy: 8+ chars, lowercase, uppercase, number) */}
          <div className="rounded-lg border border-[#D4DCD5] bg-[#F8FAF8] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#1B4332]" />
              <h3 className="text-xs font-bold text-[#14241B]">
                กำหนดรหัสผ่านเข้าสู่ระบบ (Account Password) *
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#14241B] mb-1">
                  รหัสผ่าน (Password) *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordTouched(true);
                      if (error) setError("");
                    }}
                    placeholder="อย่างน้อย 8 ตัวอักษร"
                    className="w-full rounded border border-[#B8C7BC] bg-white pl-3 pr-9 py-2 text-xs text-[#14241B] focus:border-[#1B4332] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#526358] hover:text-[#14241B]"
                  >
                    {showPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#14241B] mb-1">
                  ยืนยันรหัสผ่าน (Confirm Password) *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPasswordTouched(true);
                      if (error) setError("");
                    }}
                    placeholder="กรอกรหัสผ่านซ้ำอีกครั้ง"
                    className="w-full rounded border border-[#B8C7BC] bg-white pl-3 pr-9 py-2 text-xs text-[#14241B] focus:border-[#1B4332] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#526358] hover:text-[#14241B]"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Policy Indicator Badges */}
            <div className="pt-1">
              <span className="block text-[10px] font-semibold text-[#526358] mb-1.5">
                เกณฑ์ความปลอดภัยของรหัสผ่าน:
              </span>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium transition ${
                    hasMinLength
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  {hasMinLength ? "✓" : "○"} 8+ ตัวอักษร
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium transition ${
                    hasLower
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  {hasLower ? "✓" : "○"} ตัวพิมพ์เล็ก (a-z)
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium transition ${
                    hasUpper
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  {hasUpper ? "✓" : "○"} ตัวพิมพ์ใหญ่ (A-Z)
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium transition ${
                    hasNumber
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  {hasNumber ? "✓" : "○"} ตัวเลข (0-9)
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium transition ${
                    passwordsMatch
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  {passwordsMatch ? "✓ รหัสผ่านตรงกัน" : "○ รหัสผ่านตรงกัน"}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#14241B] mb-1.5">
              โซนป่าไม้ที่รับผิดชอบ
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {zones.map((z) => {
                const checked = selectedZones.includes(z.id);
                return (
                  <label
                    key={z.id}
                    className={`flex items-center gap-2 rounded border p-2.5 text-xs cursor-pointer ${
                      checked
                        ? "border-[#1B4332] bg-[#EBF2ED] font-semibold"
                        : "border-[#D4DCD5]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked)
                          setSelectedZones((prev) => [...prev, z.id]);
                        else
                          setSelectedZones((prev) =>
                            prev.filter((id) => id !== z.id)
                          );
                      }}
                    />
                    <span>
                      {z.zone_code} · {z.name}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-[#1B4332] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#2D6A4F]"
            >
              <span>ถัดไป: อัปโหลดบัตรเจ้าหน้าที่</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}

      {/* Step 2: Upload Employee ID Card */}
      {step === 2 && (
        <form
          onSubmit={submitStep2}
          className="rounded-lg border border-[#D4DCD5] bg-white p-6 space-y-4"
        >
          <div className="border-b border-[#E4ECE6] pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-[#14241B] flex items-center gap-2">
                <span>ขั้นตอนที่ 2: อัปโหลดภาพถ่ายบัตรประจำตัวเจ้าหน้าที่</span>
              </h2>
              <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                ไม่บังคับ · กดไปต่อได้ทันที
              </span>
            </div>
            <p className="text-xs text-[#526358] mt-1">
              (Private Storage Bucket: employee-ids) แนบภาพถ่ายบัตรเพื่อความสะดวกในการยืนยันตัวตน หรือหากไม่มีสามารถกดปุ่มไปต่อได้เลย
            </p>
          </div>

          <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#8FA394] bg-[#F8FAF8] hover:bg-[#F0F5F1] transition-colors p-8 cursor-pointer text-center">
            <FileBadge className="h-9 w-9 text-[#1B4332]" />
            <span className="text-sm font-semibold text-[#14241B]">
              คลิกเพื่อเลือกไฟล์ภาพบัตรประจำตัวเจ้าหน้าที่รัฐ / พนักงานพิทักษ์ป่า
            </span>
            <span className="text-xs text-[#526358]">
              รองรับไฟล์ JPEG, PNG, WebP ขนาดไม่เกิน 5 MB (ไม่บังคับ — กดไปต่อได้ทันที)
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setIdCardFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {idCardFile ? (
            <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-900">
              <span className="flex items-center gap-2 truncate">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>เลือกไฟล์แล้ว: {idCardFile.name} ({(idCardFile.size / 1024).toFixed(0)} KB)</span>
              </span>
              <button
                type="button"
                onClick={() => setIdCardFile(null)}
                className="ml-2 text-xs text-red-600 hover:underline shrink-0"
              >
                ลบไฟล์
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-[#D4DCD5] bg-[#F8FAF8] px-3.5 py-2.5 text-xs text-[#526358] flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <span>
                ไม่ได้เลือกไฟล์ภาพถ่าย — ท่านสามารถกด <strong>&ldquo;ไปต่อได้เลย&rdquo;</strong> เพื่อข้ามไปยังขั้นตอนถัดไปได้ทันที
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-[#C6D1C8] px-4 py-2.5 text-xs font-semibold text-[#526358] hover:bg-[#F4F6F4]"
            >
              ย้อนกลับ
            </button>
            <div className="flex items-center gap-2">
              {!idCardFile && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={(e) => submitStep2(e)}
                  className="rounded-lg border border-[#1B4332] bg-white px-4 py-2.5 text-xs font-semibold text-[#1B4332] hover:bg-emerald-50 shadow-sm"
                >
                  <span>ไปต่อได้เลย (ไม่แนบบัตร) →</span>
                </button>
              )}
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1B4332] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#2D6A4F] shadow-sm"
              >
                <span>
                  {busy
                    ? "กำลังดำเนินการ..."
                    : idCardFile
                      ? "บันทึกบัตรและส่งรหัส OTP"
                      : "ไปต่อและส่งรหัส OTP"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Step 3: OTP Verification */}
      {step === 3 && (
        <form
          onSubmit={submitStep3}
          className="rounded-lg border border-[#D4DCD5] bg-white p-6 space-y-4"
        >
          <h2 className="text-base font-bold text-[#14241B] border-b border-[#E4ECE6] pb-2.5">
            ขั้นตอนที่ 3: ยืนยันรหัส OTP 6 หลัก
          </h2>

          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3.5 text-xs text-emerald-900">
            ระบบได้สร้างรหัส OTP สำหรับ <strong>{fullName}</strong> ({email}) เรียบร้อยแล้ว:{" "}
            <strong className="font-mono-code text-sm underline">
              {generatedOtp}
            </strong>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#14241B] mb-1">
              กรอกรหัส OTP 6 หลักเพื่อยืนยันอีเมลหน่วยงาน
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
              className="w-full rounded border border-[#B8C7BC] px-3.5 py-2.5 font-mono-code text-base tracking-widest"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1B4332] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#2D6A4F]"
            >
              <span>ยืนยันรหัส OTP</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}

      {/* Step 4: Final Super Admin Approval */}
      {step === 4 && (
        <div className="rounded-lg border border-[#D4DCD5] bg-white p-6 space-y-4">
          <div className="flex items-center gap-3 text-emerald-800">
            <CheckCircle2 className="h-6 w-6 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-[#14241B]">
                ขั้นตอนที่ 4: ยืนยัน OTP สำเร็จ • รอการอนุมัติขั้นสุดท้ายจาก Super Admin
              </h2>
              <p className="text-xs text-[#526358]">
                เมื่อกดอนุมัติ บัญชีของ {fullName} ({employeeCode}) จะเปลี่ยนสถานะจาก{" "}
                <code>pending_verification</code> เป็น <code>{targetRole}</code> ทันที
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Link
              href="/accounts"
              className="rounded-lg border border-[#C6D1C8] px-4 py-2.5 text-xs font-semibold text-[#526358]"
            >
              กลับไปอนุมัติภายหลัง
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={approveFinalStep}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1B4332] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#2D6A4F]"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>อนุมัติเปิดสิทธิ์เข้าใช้งานทันที</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
