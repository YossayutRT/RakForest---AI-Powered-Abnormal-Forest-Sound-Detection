"use client";

import { createClient } from "./client";
import {
  INITIAL_NOTIFICATION_LOGS,
  INITIAL_NOTIFICATION_RULES,
  INITIAL_PROFILES,
  INITIAL_REPORTS,
  INITIAL_STATIONS,
  INITIAL_ZONES,
} from "./fallback-seed";
import type {
  AIRawResponse,
  AuditLog,
  FieldOutcome,
  ForestZone,
  NotificationLog,
  NotificationRule,
  Profile,
  ReportRecord,
  ReportStatus,
  RiskLevel,
  SensorStation,
  SourceType,
  UserRole,
  UserNotification,
} from "@/types/database.types";

const LOCAL_CACHE_KEY = "rakforest-operational-cache-v1";
const SESSION_USER_KEY = "rakforest-active-profile-v1";

interface OperationalCache {
  profiles: Profile[];
  zones: ForestZone[];
  stations: SensorStation[];
  reports: ReportRecord[];
  rules: NotificationRule[];
  notifications: NotificationLog[];
  userNotifications: UserNotification[];
  auditLogs: AuditLog[];
}

function loadLocalCache(): OperationalCache {
  if (typeof window === "undefined") {
    return {
      profiles: structuredClone(INITIAL_PROFILES),
      zones: structuredClone(INITIAL_ZONES),
      stations: structuredClone(INITIAL_STATIONS),
      reports: structuredClone(INITIAL_REPORTS),
      rules: structuredClone(INITIAL_NOTIFICATION_RULES),
      notifications: structuredClone(INITIAL_NOTIFICATION_LOGS),
      userNotifications: [],
      auditLogs: [],
    };
  }
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<OperationalCache>;
      return {
        profiles: parsed.profiles?.length ? parsed.profiles : structuredClone(INITIAL_PROFILES),
        zones: parsed.zones?.length ? parsed.zones : structuredClone(INITIAL_ZONES),
        stations: parsed.stations?.length ? parsed.stations : structuredClone(INITIAL_STATIONS),
        reports: parsed.reports?.length ? parsed.reports : structuredClone(INITIAL_REPORTS),
        rules: parsed.rules?.length ? parsed.rules : structuredClone(INITIAL_NOTIFICATION_RULES),
        notifications: parsed.notifications ?? structuredClone(INITIAL_NOTIFICATION_LOGS),
        userNotifications: parsed.userNotifications ?? [],
        auditLogs: parsed.auditLogs ?? [],
      };
    }
  } catch {
    // ignore storage parse error
  }
  const initial: OperationalCache = {
    profiles: structuredClone(INITIAL_PROFILES),
    zones: structuredClone(INITIAL_ZONES),
    stations: structuredClone(INITIAL_STATIONS),
    reports: structuredClone(INITIAL_REPORTS),
    rules: structuredClone(INITIAL_NOTIFICATION_RULES),
    notifications: structuredClone(INITIAL_NOTIFICATION_LOGS),
    userNotifications: [],
    auditLogs: [],
  };
  saveLocalCache(initial);
  return initial;
}

function saveLocalCache(cache: OperationalCache) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cache));
    window.dispatchEvent(new CustomEvent("rakforest-data-updated"));
  } catch {
    // ignore quota error
  }
}

function enrichReports(
  reports: ReportRecord[],
  zones: ForestZone[],
  stations: SensorStation[],
  profiles: Profile[]
): ReportRecord[] {
  return reports.map((r) => ({
    ...r,
    forest_zones: r.forest_zones ?? zones.find((z) => z.id === r.zone_id) ?? null,
    sensor_stations:
      r.sensor_stations ?? stations.find((s) => s.id === r.station_id) ?? null,
    reporter: r.reporter ?? profiles.find((p) => p.id === r.reporter_id) ?? null,
    assignee: r.assignee ?? profiles.find((p) => p.id === r.assigned_to) ?? null,
  }));
}

export const rakforestRepo = {
  // ==========================================================================
  // AUTH & CURRENT PROFILE
  // ==========================================================================
  async getCurrentProfile(): Promise<Profile | null> {
    const supabase = createClient();
    const cache = loadLocalCache();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: dbProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (dbProfile) {
          if (typeof window !== "undefined") {
            localStorage.setItem(SESSION_USER_KEY, JSON.stringify(dbProfile));
          }
          return dbProfile as Profile;
        }

        // Match by email if profile row has different UUID in seed
        const matched = cache.profiles.find(
          (p) => p.email?.toLowerCase() === user.email?.toLowerCase()
        );
        if (matched) return matched;
      }
    } catch {
      // Fallback to stored profile session
    }

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(SESSION_USER_KEY);
      if (saved) {
        try {
          return JSON.parse(saved) as Profile;
        } catch {
          return null;
        }
      }
    }
    return null;
  },

  async signIn(identifier: string, password: string): Promise<Profile> {
    const supabase = createClient();
    const cache = loadLocalCache();
    const clean = identifier.trim().toLowerCase();

    // 1. Try real Supabase Auth first
    const emailCandidate = clean.includes("@")
      ? clean
      : cache.profiles.find((p) => p.employee_code?.toLowerCase() === clean)?.email ??
        `${clean}@rakforest.go.th`;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailCandidate,
        password,
      });

      if (!error && data.user) {
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profileRow) {
          const p = profileRow as Profile;
          if (p.role === "pending_verification") {
            throw new Error("บัญชีของคุณอยู่ระหว่างรอการอนุมัติยืนยันตัวตนจากผู้ดูแลระบบ");
          }
          if (p.role === "suspended") {
            throw new Error("บัญชีนี้ถูกระงับสิทธิ์การใช้งานชั่วคราว กรุณาติดต่อศูนย์สั่งการ");
          }
          if (typeof window !== "undefined") {
            localStorage.setItem(SESSION_USER_KEY, JSON.stringify(p));
          }
          return p;
        }
      }
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes("รอการอนุมัติ") || err.message.includes("ระงับสิทธิ์"))
      ) {
        throw err;
      }
    }

    // 2. Match against operational profiles (by email or employee_code)
    const allProfiles = await this.getProfiles();
    const matched = allProfiles.find(
      (p) =>
        p.email?.toLowerCase() === clean ||
        p.employee_code?.toLowerCase() === clean
    );

    if (!matched) {
      throw new Error("ไม่พบรหัสพนักงานหรืออีเมลนี้ในระบบ กรุณาตรวจสอบข้อมูลอีกครั้ง");
    }

    const expectedPassword = matched.password_hash || "RakForest2026!";
    if (password !== expectedPassword) {
      throw new Error("รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบรหัสผ่านอีกครั้ง");
    }
    if (matched.role === "pending_verification") {
      throw new Error("บัญชีของคุณอยู่ระหว่างรอการอนุมัติยืนยันตัวตนจากผู้ดูแลระบบ");
    }
    if (matched.role === "suspended") {
      throw new Error("บัญชีนี้ถูกระงับสิทธิ์การใช้งานชั่วคราว กรุณาติดต่อศูนย์สั่งการ");
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(matched));
    }
    return matched;
  },

  async signOut(): Promise<void> {
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem(SESSION_USER_KEY);
    }
  },

  // ==========================================================================
  // FOREST ZONES & SENSOR STATIONS
  // ==========================================================================
  async getZones(): Promise<ForestZone[]> {
    const supabase = createClient();
    const cache = loadLocalCache();
    try {
      const { data, error } = await supabase
        .from("forest_zones")
        .select("*")
        .order("created_at", { ascending: true });
      if (!error && data && data.length > 0) {
        cache.zones = data as ForestZone[];
        saveLocalCache(cache);
        return cache.zones;
      }
    } catch {
      // fallback to cache
    }
    return cache.zones;
  },

  async saveZone(
    zone: Partial<ForestZone> & { name: string; polygon_coords: [number, number][] }
  ): Promise<ForestZone> {
    const supabase = createClient();
    const cache = loadLocalCache();
    const isUpdate = Boolean(zone.id && cache.zones.some((z) => z.id === zone.id));
    const record: ForestZone = {
      id: zone.id ?? crypto.randomUUID(),
      zone_code:
        zone.zone_code?.trim() ||
        `ZN-${String(cache.zones.length + 1).padStart(2, "0")}`,
      name: zone.name.trim(),
      province: zone.province?.trim() || "เชียงใหม่",
      district: zone.district?.trim() || "เมือง",
      area_rai: zone.area_rai ?? 12000,
      polygon_coords: zone.polygon_coords,
      current_risk_level: zone.current_risk_level ?? "green",
      responsible_officer_id: zone.responsible_officer_id ?? null,
      description: zone.description?.trim() || null,
      created_at: zone.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await supabase.from("forest_zones").upsert({
        id: record.id,
        zone_code: record.zone_code,
        name: record.name,
        province: record.province,
        district: record.district,
        area_rai: record.area_rai,
        polygon_coords: record.polygon_coords,
        current_risk_level: record.current_risk_level,
        responsible_officer_id: record.responsible_officer_id,
        description: record.description,
        updated_at: record.updated_at,
      });
    } catch {
      // keep in local cache as well
    }

    if (isUpdate) {
      cache.zones = cache.zones.map((z) => (z.id === record.id ? record : z));
    } else {
      cache.zones.push(record);
    }
    saveLocalCache(cache);
    return record;
  },

  async getStations(): Promise<SensorStation[]> {
    const supabase = createClient();
    const cache = loadLocalCache();
    try {
      const { data, error } = await supabase
        .from("sensor_stations")
        .select("*")
        .order("station_code", { ascending: true });
      if (!error && data && data.length > 0) {
        cache.stations = data as SensorStation[];
        saveLocalCache(cache);
        return cache.stations;
      }
    } catch {
      // fallback
    }
    return cache.stations;
  },

  async saveStation(
    station: Partial<SensorStation> & {
      station_code: string;
      name: string;
      lat: number;
      lng: number;
    }
  ): Promise<SensorStation> {
    const supabase = createClient();
    const cache = loadLocalCache();
    const existing = cache.stations.find(
      (s) => s.id === station.id || s.station_code === station.station_code
    );
    const record: SensorStation = {
      id: station.id ?? existing?.id ?? crypto.randomUUID(),
      station_code: station.station_code.trim().toUpperCase(),
      name: station.name.trim(),
      zone_id: station.zone_id ?? existing?.zone_id ?? cache.zones[0]?.id ?? null,
      lat: Number(station.lat),
      lng: Number(station.lng),
      radius_meters: Number(station.radius_meters ?? 350),
      status: station.status ?? "online",
      battery_percent: Number(station.battery_percent ?? 100),
      last_heartbeat_at: new Date().toISOString(),
      notes: station.notes ?? null,
      created_at: existing?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await supabase.from("sensor_stations").upsert({
        id: record.id,
        station_code: record.station_code,
        name: record.name,
        zone_id: record.zone_id,
        lat: record.lat,
        lng: record.lng,
        radius_meters: record.radius_meters,
        status: record.status,
        battery_percent: record.battery_percent,
        last_heartbeat_at: record.last_heartbeat_at,
        notes: record.notes,
        updated_at: record.updated_at,
      });
    } catch {
      // keep in local cache
    }

    const idx = cache.stations.findIndex((s) => s.id === record.id);
    if (idx >= 0) cache.stations[idx] = record;
    else cache.stations.push(record);
    saveLocalCache(cache);
    return record;
  },

  // ==========================================================================
  // REPORTS, AUDIO & AI CLASSIFICATION
  // ==========================================================================
  async getReports(): Promise<ReportRecord[]> {
    const supabase = createClient();
    const cache = loadLocalCache();

    try {
      const { data, error } = await supabase
        .from("reports")
        .select(
          `*,
          report_audio(*, ai_classifications(*)),
          report_evidence(*)`
        )
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const enriched = enrichReports(
          data as ReportRecord[],
          cache.zones,
          cache.stations,
          cache.profiles
        );
        cache.reports = enriched;
        saveLocalCache(cache);
        return enriched;
      }
    } catch {
      // fallback
    }

    return enrichReports(
      cache.reports,
      cache.zones,
      cache.stations,
      cache.profiles
    ).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  },

  async getReportById(idOrCode: string): Promise<ReportRecord | null> {
    const all = await this.getReports();
    return (
      all.find((r) => r.id === idOrCode || r.report_code === idOrCode) ?? null
    );
  },

  async createReportWithAudio(params: {
    sourceType: SourceType;
    stationId?: string | null;
    zoneId?: string | null;
    lat: number;
    lng: number;
    description?: string;
    audioFile?: File | null;
    evidenceFiles?: File[];
    reporterId?: string | null;
  }): Promise<{ report: ReportRecord; aiResult: AIRawResponse | null }> {
    const supabase = createClient();
    const cache = loadLocalCache();
    const profile = await this.getCurrentProfile();

    const station = params.stationId
      ? cache.stations.find(
          (s) => s.id === params.stationId || s.station_code === params.stationId
        )
      : null;
    const zoneId =
      params.zoneId ?? station?.zone_id ?? cache.zones[0]?.id ?? null;

    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
    const seq = String(cache.reports.length + 1).padStart(3, "0");
    const reportCode = `RF-${datePart}-${seq}`;
    const reportId = crypto.randomUUID();

    let audioFileUrl = "";
    if (params.audioFile) {
      const storagePath = `${reportCode}/${Date.now()}-${params.audioFile.name}`;
      try {
        const { error: uploadErr } = await supabase.storage
          .from("audio-reports")
          .upload(storagePath, params.audioFile, { upsert: true });
        if (!uploadErr) {
          const { data: pub } = supabase.storage
            .from("audio-reports")
            .getPublicUrl(storagePath);
          audioFileUrl = pub.publicUrl;
        }
      } catch {
        // Fallback to local object URL
      }
      if (!audioFileUrl && typeof window !== "undefined") {
        audioFileUrl = URL.createObjectURL(params.audioFile);
      }
    }

    // Call /api/classify-audio to analyze with FastAPI AudioCNN (or smart fallback)
    let aiRaw: AIRawResponse | null = null;
    let predictedLabel = "chainsaw";
    let confidence = 0.88;
    let riskLevel: RiskLevel = "red";

    if (params.audioFile) {
      const formData = new FormData();
      formData.set("audio", params.audioFile);
      formData.set("requestId", reportCode);
      formData.set("stationId", station?.station_code ?? "FIELD-GPS");
      const res = await fetch("/api/classify-audio", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        aiRaw = data.rawResponse as AIRawResponse;
        predictedLabel = data.predictedLabel;
        confidence = data.confidence;
        riskLevel = data.riskLevel;
      }
    }

    // Upload evidence images if provided
    const evidenceItems: NonNullable<ReportRecord["report_evidence"]> = [];
    for (const file of params.evidenceFiles ?? []) {
      let evUrl = "";
      try {
        const path = `${reportCode}/${Date.now()}-${file.name}`;
        const { error: evErr } = await supabase.storage
          .from("evidence-files")
          .upload(path, file, { upsert: true });
        if (!evErr) {
          evUrl = supabase.storage.from("evidence-files").getPublicUrl(path).data
            .publicUrl;
        }
      } catch {
        // ignore
      }
      if (!evUrl && typeof window !== "undefined") {
        evUrl = URL.createObjectURL(file);
      }
      evidenceItems.push({
        id: crypto.randomUUID(),
        report_id: reportId,
        file_url: evUrl,
        file_name: file.name,
        file_type: file.type.startsWith("video/") ? "video" : "image",
        uploaded_by: profile?.id ?? null,
        uploaded_at: now.toISOString(),
      });
    }

    const audioId = crypto.randomUUID();
    const classificationId = crypto.randomUUID();

    const newReport: ReportRecord = {
      id: reportId,
      report_code: reportCode,
      source_type: params.sourceType,
      reporter_id: params.reporterId ?? profile?.id ?? cache.profiles[0].id,
      zone_id: zoneId,
      station_id: station?.id ?? null,
      lat: params.lat,
      lng: params.lng,
      description:
        params.description?.trim() ||
        (station
          ? `สัญญาณเสียงตรวจพบจาก ${station.station_code} (${station.name})`
          : "รายงานเหตุการณ์ภาคสนามพร้อมไฟล์เสียง"),
      status: "pending",
      risk_level: riskLevel,
      assigned_to: null,
      dispatch_note: null,
      dispatched_at: null,
      acknowledged_at: null,
      field_outcome: null,
      field_notes: null,
      submitted_at: null,
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      report_audio: params.audioFile
        ? [
            {
              id: audioId,
              report_id: reportId,
              file_url: audioFileUrl,
              file_name: params.audioFile.name,
              duration_seconds:
                aiRaw?.segments?.at(-1)?.endSeconds ?? 8,
              uploaded_at: now.toISOString(),
              ai_classifications: [
                {
                  id: classificationId,
                  report_audio_id: audioId,
                  predicted_label: predictedLabel,
                  confidence,
                  raw_response: aiRaw,
                  model_version:
                    aiRaw?.modelVersion ?? "rakforest-audiocnn-multilabel-v1",
                  processed_at: now.toISOString(),
                },
              ],
            },
          ]
        : [],
      report_evidence: evidenceItems,
    };

    // Persist to Supabase tables if available
    try {
      await supabase.from("reports").insert({
        id: newReport.id,
        report_code: newReport.report_code,
        source_type: newReport.source_type,
        reporter_id: newReport.reporter_id,
        zone_id: newReport.zone_id,
        station_id: newReport.station_id,
        lat: newReport.lat,
        lng: newReport.lng,
        description: newReport.description,
        status: newReport.status,
        risk_level: newReport.risk_level,
      });

      if (params.audioFile) {
        await supabase.from("report_audio").insert({
          id: audioId,
          report_id: reportId,
          file_url: audioFileUrl,
          file_name: params.audioFile.name,
          duration_seconds: aiRaw?.segments?.at(-1)?.endSeconds ?? 8,
        });

        await supabase.from("ai_classifications").insert({
          id: classificationId,
          report_audio_id: audioId,
          predicted_label: predictedLabel,
          confidence,
          raw_response: aiRaw ?? {},
          model_version:
            aiRaw?.modelVersion ?? "rakforest-audiocnn-multilabel-v1",
        });
      }

      if (evidenceItems.length > 0) {
        await supabase.from("report_evidence").insert(
          evidenceItems.map((ev) => ({
            id: ev.id,
            report_id: ev.report_id,
            file_url: ev.file_url,
            file_name: ev.file_name,
            file_type: ev.file_type,
            uploaded_by: ev.uploaded_by,
          }))
        );
      }
    } catch {
      // Local cache handles persistence seamlessly
    }

    // Update zone risk if red/yellow
    if (zoneId && riskLevel === "red") {
      cache.zones = cache.zones.map((z) =>
        z.id === zoneId ? { ...z, current_risk_level: "red" } : z
      );
    } else if (zoneId && riskLevel === "yellow") {
      cache.zones = cache.zones.map((z) =>
        z.id === zoneId && z.current_risk_level === "green"
          ? { ...z, current_risk_level: "yellow" }
          : z
      );
    }

    cache.reports.unshift(newReport);
    saveLocalCache(cache);

    // Trigger Telegram alert automatically if risk is red or yellow
    if (riskLevel === "red" || riskLevel === "yellow") {
      const stationLabel = station
        ? `${station.station_code} (${station.name})`
        : `พิกัด ${params.lat.toFixed(4)}, ${params.lng.toFixed(4)}`;
      await this.dispatchTelegramNotification({
        reportId: newReport.id,
        reportCode: newReport.report_code,
        riskLevel,
        predictedLabel,
        confidence,
        locationText: stationLabel,
        note: newReport.description ?? "",
      });
    }

    return {
      report: enrichReports(
        [newReport],
        cache.zones,
        cache.stations,
        cache.profiles
      )[0],
      aiResult: aiRaw,
    };
  },

  async dispatchToFieldRanger(params: {
    reportId: string;
    assigneeId: string;
    dispatchNote: string;
    sendTelegram?: boolean;
  }): Promise<ReportRecord> {
    const supabase = createClient();
    const cache = loadLocalCache();
    const profile = await this.getCurrentProfile();
    const now = new Date().toISOString();

    const idx = cache.reports.findIndex((r) => r.id === params.reportId);
    if (idx === -1) throw new Error("ไม่พบรายการรายงานนี้");

    const updated: ReportRecord = {
      ...cache.reports[idx],
      status: "dispatched",
      assigned_to: params.assigneeId,
      dispatch_note: params.dispatchNote.trim(),
      dispatched_at: now,
      updated_at: now,
    };
    cache.reports[idx] = updated;

    cache.auditLogs.unshift({
      id: crypto.randomUUID(),
      actor_id: profile?.id ?? null,
      actor_name: profile?.full_name ?? "เจ้าหน้าที่ส่วนกลาง",
      action: "dispatch_field_task",
      target_table: "reports",
      target_id: updated.id,
      details: {
        assigned_to: params.assigneeId,
        dispatch_note: params.dispatchNote,
      },
      created_at: now,
    });

    try {
      await supabase
        .from("reports")
        .update({
          status: "dispatched",
          assigned_to: params.assigneeId,
          dispatch_note: params.dispatchNote.trim(),
          dispatched_at: now,
          updated_at: now,
        })
        .eq("id", params.reportId);
    } catch {
      // local cache updated
    }

    saveLocalCache(cache);

    if (params.sendTelegram !== false) {
      const station = cache.stations.find((s) => s.id === updated.station_id);
      const ranger = cache.profiles.find((p) => p.id === params.assigneeId);
      const topClass =
        updated.report_audio?.[0]?.ai_classifications?.[0]?.predicted_label ??
        "chainsaw";
      const topConf =
        updated.report_audio?.[0]?.ai_classifications?.[0]?.confidence ?? 0.85;

      await this.dispatchTelegramNotification({
        reportId: updated.id,
        reportCode: updated.report_code,
        riskLevel: updated.risk_level,
        predictedLabel: topClass,
        confidence: topConf,
        locationText: station
          ? `${station.station_code} · ${station.name}`
          : `${updated.lat.toFixed(4)}, ${updated.lng.toFixed(4)}`,
        note: `มอบหมายให้ ${ranger?.full_name ?? "เจ้าหน้าที่ภาคสนาม"}: ${params.dispatchNote}`,
      });
    }

    return enrichReports([updated], cache.zones, cache.stations, cache.profiles)[0];
  },

  async acknowledgeFieldTask(reportId: string): Promise<ReportRecord> {
    const supabase = createClient();
    const cache = loadLocalCache();
    const profile = await this.getCurrentProfile();
    const now = new Date().toISOString();

    const idx = cache.reports.findIndex((r) => r.id === reportId);
    if (idx === -1) throw new Error("ไม่พบงานนี้");

    cache.reports[idx] = {
      ...cache.reports[idx],
      status: "acknowledged",
      acknowledged_at: now,
      updated_at: now,
    };

    cache.auditLogs.unshift({
      id: crypto.randomUUID(),
      actor_id: profile?.id ?? null,
      actor_name: profile?.full_name ?? "เจ้าหน้าที่ภาคสนาม",
      action: "acknowledge_task",
      target_table: "reports",
      target_id: reportId,
      details: {},
      created_at: now,
    });

    try {
      await supabase
        .from("reports")
        .update({
          status: "acknowledged",
          acknowledged_at: now,
          updated_at: now,
        })
        .eq("id", reportId);
    } catch {
      // local cache updated
    }

    saveLocalCache(cache);
    return enrichReports(
      [cache.reports[idx]],
      cache.zones,
      cache.stations,
      cache.profiles
    )[0];
  },

  async submitFieldInspection(params: {
    reportId: string;
    outcome: FieldOutcome;
    fieldNotes: string;
    evidenceFiles?: File[];
  }): Promise<ReportRecord> {
    const supabase = createClient();
    const cache = loadLocalCache();
    const profile = await this.getCurrentProfile();
    const now = new Date().toISOString();

    const idx = cache.reports.findIndex((r) => r.id === params.reportId);
    if (idx === -1) throw new Error("ไม่พบงานนี้");

    const current = cache.reports[idx];
    const addedEvidence: NonNullable<ReportRecord["report_evidence"]> = [];

    for (const file of params.evidenceFiles ?? []) {
      let url = "";
      try {
        const path = `${current.report_code}/field-${Date.now()}-${file.name}`;
        const { error } = await supabase.storage
          .from("evidence-files")
          .upload(path, file, { upsert: true });
        if (!error) {
          url = supabase.storage.from("evidence-files").getPublicUrl(path).data
            .publicUrl;
        }
      } catch {
        // ignore
      }
      if (!url && typeof window !== "undefined") {
        url = URL.createObjectURL(file);
      }
      addedEvidence.push({
        id: crypto.randomUUID(),
        report_id: current.id,
        file_url: url,
        file_name: file.name,
        file_type: file.type.startsWith("video/") ? "video" : "image",
        uploaded_by: profile?.id ?? null,
        uploaded_at: now,
      });
    }

    const updated: ReportRecord = {
      ...current,
      status: "submitted",
      field_outcome: params.outcome,
      field_notes: params.fieldNotes.trim(),
      submitted_at: now,
      updated_at: now,
      report_evidence: [...(current.report_evidence ?? []), ...addedEvidence],
    };
    cache.reports[idx] = updated;

    cache.auditLogs.unshift({
      id: crypto.randomUUID(),
      actor_id: profile?.id ?? null,
      actor_name: profile?.full_name ?? "เจ้าหน้าที่ภาคสนาม",
      action: "submit_field_outcome",
      target_table: "reports",
      target_id: current.id,
      details: { outcome: params.outcome, notes: params.fieldNotes },
      created_at: now,
    });

    try {
      await supabase
        .from("reports")
        .update({
          status: "submitted",
          field_outcome: params.outcome,
          field_notes: params.fieldNotes.trim(),
          submitted_at: now,
          updated_at: now,
        })
        .eq("id", params.reportId);
    } catch {
      // local cache updated
    }

    saveLocalCache(cache);
    return enrichReports([updated], cache.zones, cache.stations, cache.profiles)[0];
  },

  async reviewReportStatus(params: {
    reportId: string;
    status: ReportStatus;
    reviewNotes: string;
  }): Promise<ReportRecord> {
    const supabase = createClient();
    const cache = loadLocalCache();
    const profile = await this.getCurrentProfile();
    const now = new Date().toISOString();

    const idx = cache.reports.findIndex((r) => r.id === params.reportId);
    if (idx === -1) throw new Error("ไม่พบรายการรายงาน");

    const updated: ReportRecord = {
      ...cache.reports[idx],
      status: params.status,
      reviewed_by: profile?.id ?? null,
      reviewed_at: now,
      review_notes: params.reviewNotes.trim(),
      updated_at: now,
    };
    cache.reports[idx] = updated;

    cache.auditLogs.unshift({
      id: crypto.randomUUID(),
      actor_id: profile?.id ?? null,
      actor_name: profile?.full_name ?? "เจ้าหน้าที่ส่วนกลาง",
      action:
        params.status === "confirmed"
          ? "confirm_report"
          : params.status === "rejected"
            ? "reject_report"
            : "close_report",
      target_table: "reports",
      target_id: updated.id,
      details: { status: params.status, review_notes: params.reviewNotes },
      created_at: now,
    });

    try {
      await supabase
        .from("reports")
        .update({
          status: params.status,
          reviewed_by: profile?.id ?? null,
          reviewed_at: now,
          review_notes: params.reviewNotes.trim(),
          updated_at: now,
        })
        .eq("id", params.reportId);
    } catch {
      // local cache updated
    }

    saveLocalCache(cache);
    return enrichReports([updated], cache.zones, cache.stations, cache.profiles)[0];
  },

  // ==========================================================================
  // ACCOUNTS & VERIFICATION STEPPER
  // ==========================================================================
  async getProfiles(): Promise<Profile[]> {
    const supabase = createClient();
    const cache = loadLocalCache();
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        cache.profiles = data as Profile[];
        saveLocalCache(cache);
        return cache.profiles;
      }
    } catch {
      // fallback
    }
    return cache.profiles;
  },

  async createAccountStep1(params: {
    employee_code: string;
    full_name: string;
    email: string;
    phone: string;
    position: string;
    department: string;
    targetRole: UserRole;
    assigned_zone_ids: string[];
    id_card_file_url?: string | null;
    password?: string;
  }): Promise<{ profile: Profile; otpCode: string }> {
    const supabase = createClient();
    const cache = loadLocalCache();
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const userPassword = params.password?.trim() || "RakForest2026!";
    const newProfile: Profile = {
      id: crypto.randomUUID(),
      employee_code: params.employee_code.trim().toUpperCase(),
      email: params.email.trim().toLowerCase(),
      full_name: params.full_name.trim(),
      phone: params.phone.trim(),
      position: params.position.trim(),
      department: params.department.trim(),
      role: "pending_verification",
      assigned_zone_ids: params.assigned_zone_ids,
      id_card_file_url: params.id_card_file_url ?? null,
      password_hash: userPassword,
      verification_status: "otp_sent",
      otp_code: otpCode,
      otp_expires_at: new Date(Date.now() + 15 * 60000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await supabase.from("profiles").insert(newProfile);
    } catch {
      // fallback to cache
    }

    cache.profiles.unshift(newProfile);
    saveLocalCache(cache);
    return { profile: newProfile, otpCode };
  },

  async verifyAccountOtp(profileId: string, otpInput: string): Promise<Profile> {
    const cache = loadLocalCache();
    const idx = cache.profiles.findIndex((p) => p.id === profileId);
    if (idx === -1) throw new Error("ไม่พบบัญชีที่ต้องการยืนยัน");

    const current = cache.profiles[idx];
    if (current.otp_code && current.otp_code !== otpInput.trim()) {
      throw new Error("รหัส OTP ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");
    }

    const updated: Profile = {
      ...current,
      verification_status: "otp_verified",
      updated_at: new Date().toISOString(),
    };
    cache.profiles[idx] = updated;
    saveLocalCache(cache);
    return updated;
  },

  async approveAccountRole(
    profileId: string,
    approvedRole: UserRole
  ): Promise<Profile> {
    const supabase = createClient();
    const cache = loadLocalCache();
    const actor = await this.getCurrentProfile();
    const now = new Date().toISOString();

    const idx = cache.profiles.findIndex((p) => p.id === profileId);
    if (idx === -1) throw new Error("ไม่พบบัญชีผู้ใช้");

    const updated: Profile = {
      ...cache.profiles[idx],
      role: approvedRole,
      verification_status: approvedRole === "suspended" ? "rejected" : "approved",
      approved_by: actor?.id ?? null,
      approved_at: now,
      updated_at: now,
    };
    cache.profiles[idx] = updated;

    try {
      await supabase
        .from("profiles")
        .update({
          role: updated.role,
          verification_status: updated.verification_status,
          approved_by: updated.approved_by,
          approved_at: updated.approved_at,
          updated_at: now,
        })
        .eq("id", profileId);
    } catch {
      // local cache updated
    }

    saveLocalCache(cache);
    return updated;
  },

  async adminResetUserPassword(params: {
    userId: string;
    newPassword: string;
    notifyUser?: boolean;
  }): Promise<{ profile: Profile; notification?: UserNotification }> {
    const supabase = createClient();
    const cache = loadLocalCache();
    const admin = await this.getCurrentProfile();
    const now = new Date().toISOString();

    const idx = cache.profiles.findIndex((p) => p.id === params.userId);
    if (idx === -1) throw new Error("ไม่พบบัญชีผู้ใช้งานที่ต้องการแก้ไข");

    const targetUser = cache.profiles[idx];
    const updatedProfile: Profile = {
      ...targetUser,
      password_hash: params.newPassword,
      updated_at: now,
    };
    cache.profiles[idx] = updatedProfile;

    // 1. Update in Supabase profiles table
    try {
      await supabase
        .from("profiles")
        .update({
          password_hash: params.newPassword,
          updated_at: now,
        })
        .eq("id", params.userId);
    } catch {
      // local cache updated
    }

    // 2. Notification to UserID if notifyUser is true
    let notif: UserNotification | undefined;
    if (params.notifyUser !== false) {
      notif = {
        id: crypto.randomUUID(),
        user_id: params.userId,
        title: "แจ้งเตือนความปลอดภัย: รหัสผ่านของคุณถูกแก้ไขโดยผู้ดูแลระบบ",
        message: `ผู้ดูแลระบบ (Super Admin) ได้ทำการแก้ไขรหัสผ่านสำหรับบัญชี ${targetUser.employee_code ?? targetUser.full_name} เมื่อ ${new Date().toLocaleString("th-TH")} หากท่านไม่ได้เป็นผู้ร้องขอ กรุณาติดต่อศูนย์สั่งการทันที`,
        type: "security_alert",
        is_read: false,
        created_at: now,
      };

      if (!cache.userNotifications) cache.userNotifications = [];
      cache.userNotifications.unshift(notif);

      try {
        await supabase.from("user_notifications").insert(notif);
      } catch {
        // fallback
      }

      // Add to general notifications_log
      const logEntry: NotificationLog = {
        id: crypto.randomUUID(),
        report_id: null,
        channel: "push",
        recipient: targetUser.email ?? targetUser.employee_code ?? params.userId,
        message: notif.message,
        status: "sent",
        error_message: null,
        sent_at: now,
      };
      cache.notifications.unshift(logEntry);
      try {
        await supabase.from("notifications_log").insert(logEntry);
      } catch {
        // fallback
      }

      // Dispatch Telegram if user has telegram_chat_id
      if (targetUser.telegram_chat_id) {
        try {
          await this.dispatchTelegramNotification({
            reportCode: targetUser.employee_code ?? "SECURITY",
            riskLevel: "yellow",
            locationText: "ศูนย์ปฏิบัติการความปลอดภัยบัญชี",
            predictedLabel: "security_alert",
            confidence: 1.0,
            note: `[แจ้งเตือนเจ้าหน้าที่ ${targetUser.full_name}] ผู้ดูแลระบบได้ปรับปรุงรหัสผ่านบัญชีของคุณเรียบร้อยแล้ว`,
          });
        } catch {
          // ignore
        }
      }
    }

    // 3. Audit log
    cache.auditLogs.unshift({
      id: crypto.randomUUID(),
      actor_id: admin?.id ?? null,
      actor_name: admin?.full_name ?? "ผู้ดูแลระบบ (Super Admin)",
      action: "admin_reset_user_password",
      target_table: "profiles",
      target_id: params.userId,
      details: {
        target_employee_code: targetUser.employee_code,
        target_name: targetUser.full_name,
        notified: params.notifyUser !== false,
      },
      created_at: now,
    });

    saveLocalCache(cache);
    return { profile: updatedProfile, notification: notif };
  },

  async getUserNotifications(userId: string): Promise<UserNotification[]> {
    const supabase = createClient();
    const cache = loadLocalCache();

    try {
      const { data, error } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data as UserNotification[];
      }
    } catch {
      // fallback to cache
    }

    return (cache.userNotifications ?? []).filter((n) => n.user_id === userId);
  },

  async markNotificationAsRead(notificationId: string): Promise<void> {
    const supabase = createClient();
    const cache = loadLocalCache();

    if (cache.userNotifications) {
      const idx = cache.userNotifications.findIndex((n) => n.id === notificationId);
      if (idx !== -1) {
        cache.userNotifications[idx].is_read = true;
      }
    }
    saveLocalCache(cache);

    try {
      await supabase
        .from("user_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
    } catch {
      // ignore
    }
  },

  // ==========================================================================
  // NOTIFICATIONS & TELEGRAM DISPATCH
  // ==========================================================================
  async getNotificationRules(): Promise<NotificationRule[]> {
    const supabase = createClient();
    const cache = loadLocalCache();
    try {
      const { data, error } = await supabase
        .from("notification_rules")
        .select("*");
      if (!error && data && data.length > 0) {
        cache.rules = data as NotificationRule[];
        saveLocalCache(cache);
        return cache.rules;
      }
    } catch {
      // fallback
    }
    return cache.rules;
  },

  async updateNotificationRule(
    rule: Partial<NotificationRule> & { risk_level: RiskLevel }
  ): Promise<NotificationRule[]> {
    const supabase = createClient();
    const cache = loadLocalCache();
    cache.rules = cache.rules.map((r) =>
      r.risk_level === rule.risk_level
        ? { ...r, ...rule, updated_at: new Date().toISOString() }
        : r
    );
    try {
      const target = cache.rules.find((r) => r.risk_level === rule.risk_level);
      if (target) {
        await supabase.from("notification_rules").upsert(target);
      }
    } catch {
      // local cache updated
    }
    saveLocalCache(cache);
    return cache.rules;
  },

  async getNotificationLogs(): Promise<NotificationLog[]> {
    const supabase = createClient();
    const cache = loadLocalCache();
    try {
      const { data, error } = await supabase
        .from("notifications_log")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(30);
      if (!error && data && data.length > 0) {
        cache.notifications = data as NotificationLog[];
        saveLocalCache(cache);
        return cache.notifications;
      }
    } catch {
      // fallback
    }
    return cache.notifications;
  },

  async dispatchTelegramNotification(params: {
    reportId?: string | null;
    reportCode: string;
    riskLevel: RiskLevel;
    predictedLabel: string;
    confidence: number;
    locationText: string;
    note?: string;
  }): Promise<NotificationLog> {
    const cache = loadLocalCache();
    const res = await fetch("/api/notifications/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const payload = await res.json();
    const logItem: NotificationLog = payload.log ?? {
      id: crypto.randomUUID(),
      report_id: params.reportId ?? null,
      channel: "telegram",
      recipient: "Telegram Operations Channel",
      message: payload.message ?? `แจ้งเตือน ${params.reportCode}`,
      status: res.ok ? "sent" : "failed",
      error_message: payload.error ?? null,
      sent_at: new Date().toISOString(),
    };

    cache.notifications.unshift(logItem);
    saveLocalCache(cache);
    return logItem;
  },
};
