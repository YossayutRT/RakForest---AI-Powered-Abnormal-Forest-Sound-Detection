"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { rakforestRepo } from "@/lib/supabase/repository";

export default function RootEntryPage() {
  const router = useRouter();

  useEffect(() => {
    rakforestRepo.getCurrentProfile().then((profile) => {
      if (!profile) {
        router.replace("/login");
        return;
      }
      if (profile.role === "field_ranger") {
        router.replace("/home");
      } else {
        router.replace("/dashboard");
      }
    });
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#112A1F] text-white">
      <div className="flex items-center gap-3 text-sm font-medium">
        <span className="h-3 w-3 rounded-full bg-[#40916C] animate-ping" />
        <span>กำลังเข้าสู่ระบบปฏิบัติการ RakForest…</span>
      </div>
    </main>
  );
}
