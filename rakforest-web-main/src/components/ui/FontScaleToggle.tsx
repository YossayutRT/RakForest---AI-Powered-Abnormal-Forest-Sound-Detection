"use client";

import { useEffect, useState } from "react";
import { Type } from "lucide-react";

const STORAGE_KEY = "rakforest_font_scale";

export default function FontScaleToggle({
  variant = "light",
}: {
  variant?: "light" | "dark";
}) {
  const [scale, setScale] = useState<"normal" | "large">("normal");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "large") {
        setScale("large");
        document.documentElement.setAttribute("data-font-scale", "large");
      } else {
        document.documentElement.removeAttribute("data-font-scale");
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  function toggleScale() {
    const next = scale === "normal" ? "large" : "normal";
    setScale(next);
    try {
      if (next === "large") {
        localStorage.setItem(STORAGE_KEY, "large");
        document.documentElement.setAttribute("data-font-scale", "large");
      } else {
        localStorage.setItem(STORAGE_KEY, "normal");
        document.documentElement.removeAttribute("data-font-scale");
      }
    } catch {
      // ignore storage errors
    }
  }

  const isLarge = scale === "large";

  if (variant === "dark") {
    return (
      <button
        type="button"
        onClick={toggleScale}
        title="สลับขนาดตัวอักษรสำหรับผู้สูงอายุหรือใช้งานกลางแจ้ง"
        aria-pressed={isLarge}
        className={`inline-flex h-9 items-center gap-1 rounded-lg border px-2.5 text-xs font-bold whitespace-nowrap transition shrink-0 ${
          isLarge
            ? "border-amber-300 bg-amber-400 text-slate-950"
            : "border-[#40916C] bg-[#1B4332] text-[#E6F0EA] hover:bg-[#2D6A4F]"
        }`}
      >
        <Type className="h-3.5 w-3.5 shrink-0" />
        <span>{isLarge ? "ก+ ใหญ่" : "ก+"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleScale}
      title="สลับขนาดตัวอักษรสำหรับผู้สูงอายุหรือใช้งานกลางแจ้ง"
      aria-pressed={isLarge}
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold whitespace-nowrap transition shrink-0 ${
        isLarge
          ? "border-[#1B4332] bg-[#1B4332] text-white"
          : "border-[#B8C7BC] bg-[#F5F8F5] text-[#1B4332] hover:bg-[#E6EFE8]"
      }`}
    >
      <Type className="h-4 w-4 shrink-0" />
      <span className="hidden sm:inline">
        {isLarge ? "ก+ โหมดตัวหนังสือใหญ่" : "ก+ ขยายตัวหนังสือ"}
      </span>
      <span className="sm:hidden">{isLarge ? "ก+ ใหญ่" : "ก+"}</span>
    </button>
  );
}
