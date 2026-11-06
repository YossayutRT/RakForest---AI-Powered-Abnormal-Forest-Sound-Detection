import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// Load .env.local
const envPath = path.join(rootDir, ".env.local");
const envVars = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = envVars.DATABASE_URL;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !DATABASE_URL) {
  console.error("Missing SUPABASE_URL, SERVICE_ROLE_KEY, or DATABASE_URL in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PROFILES = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    employee_code: "RF-ADM-001",
    email: "admin@rakforest.go.th",
    full_name: "ดร.กิตติพงศ์ พิทักษ์ไพร",
    position: "ผู้อำนวยการศูนย์เฝ้าระวังไฟป่าและทรัพยากรป่าไม้",
    department: "ส่วนควบคุมและปฏิบัติการไฟป่า (ส่วนกลาง)",
    phone: "081-234-5678",
    role: "super_admin",
    assigned_zone_ids: [
      "11111111-1111-4111-8111-111111111101",
      "11111111-1111-4111-8111-111111111102",
      "11111111-1111-4111-8111-111111111103",
      "11111111-1111-4111-8111-111111111104",
    ],
    id_card_file_url: null,
    verification_status: "approved",
    telegram_chat_id: "1750820064",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    employee_code: "RF-OPS-014",
    email: "officer@rakforest.go.th",
    full_name: "วรัญญา ศรีสุวรรณ",
    position: "นักวิชาการป่าไม้ปฏิบัติการ (เวรศูนย์สั่งการ)",
    department: "ศูนย์สั่งการระบบตรวจจับเสียงป่าไม้",
    phone: "089-456-1122",
    role: "officer_backoffice",
    assigned_zone_ids: [
      "11111111-1111-4111-8111-111111111101",
      "11111111-1111-4111-8111-111111111102",
    ],
    id_card_file_url: null,
    verification_status: "approved",
    telegram_chat_id: "1750820064",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    employee_code: "RF-RNG-108",
    email: "ranger@rakforest.go.th",
    full_name: "สมชาย ใจดี",
    position: "หัวหน้าชุดลาดตระเวนเคลื่อนที่เร็ว (ชุดที่ 1)",
    department: "หน่วยพิทักษ์ป่าแม่ริม–สะเมิง",
    phone: "086-789-3344",
    role: "field_ranger",
    assigned_zone_ids: [
      "11111111-1111-4111-8111-111111111101",
      "11111111-1111-4111-8111-111111111102",
    ],
    id_card_file_url: null,
    verification_status: "approved",
    telegram_chat_id: "1750820064",
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    employee_code: "RF-RNG-115",
    email: "narong.p@rakforest.go.th",
    full_name: "ณรงค์ฤทธิ์ ทองคำ",
    position: "เจ้าหน้าที่พิทักษ์ป่าภาคสนาม",
    department: "หน่วยพิทักษ์ป่าเขาใหญ่ โซนตะวันออก",
    phone: "082-331-9088",
    role: "pending_verification",
    assigned_zone_ids: ["11111111-1111-4111-8111-111111111103"],
    id_card_file_url: "employee-ids/id-card-narong.jpg",
    verification_status: "otp_verified",
    otp_code: "482910",
    telegram_chat_id: "1750820064",
  },
];

const REPORTS_SEED = [
  {
    report: {
      id: "33333333-3333-4333-8333-333333333301",
      report_code: "RF-20261101-001",
      source_type: "station_sensor",
      reporter_id: "00000000-0000-4000-8000-000000000002",
      zone_id: "11111111-1111-4111-8111-111111111101",
      station_id: "22222222-2222-4222-8222-222222222201",
      lat: 18.1234,
      lng: 98.7654,
      description:
        "เสาไมค์ ST-01 ตรวจพบสัญญาณความถี่เลื่อยยนต์ต่อเนื่องบริเวณสันเขาตะวันตก ความมั่นใจสูง 91%",
      status: "pending",
      risk_level: "red",
      assigned_to: "00000000-0000-4000-8000-000000000003",
      dispatch_note:
        "โปรดนำชุดเคลื่อนที่เร็วเข้าตรวจสอบรัศมี 350 เมตรรอบเสา ST-01 ทันที",
    },
    audio: {
      id: "44444444-4444-4444-8444-444444444401",
      report_id: "33333333-3333-4333-8333-333333333301",
      file_url: "",
      file_name: "st01_chainsaw_clip_20261101.wav",
      duration_seconds: 12,
    },
    ai: {
      id: "55555555-5555-4555-8555-555555555501",
      report_audio_id: "44444444-4444-4444-8444-444444444401",
      predicted_label: "chainsaw",
      confidence: 0.91,
      model_version: "rakforest-audiocnn-multilabel-v1",
      raw_response: {
        requestId: "req-st01-001",
        modelVersion: "rakforest-audiocnn-multilabel-v1",
        label: "chainsaw",
        decisionThreshold: 0.5,
        source: "http",
        scores: [
          { classId: "chainsaw", label: "เสียงเลื่อยยนต์", score: 0.91 },
          { classId: "natural_ambient", label: "เสียงธรรมชาติ", score: 0.64 },
          { classId: "human_activity", label: "กิจกรรมมนุษย์", score: 0.52 },
          { classId: "vehicle", label: "เสียงยานพาหนะ", score: 0.28 },
          { classId: "fire", label: "เสียงไฟ", score: 0.08 },
          { classId: "threat_tactical", label: "กิจกรรมต้องสงสัย", score: 0.12 },
          { classId: "weather", label: "เสียงสภาพอากาศ", score: 0.19 },
          { classId: "other", label: "เสียงอื่น", score: 0.14 },
          { classId: "silence", label: "ความเงียบ", score: 0.03 },
        ],
        segments: [
          {
            segmentIndex: 0,
            startSeconds: 0,
            endSeconds: 4,
            scores: [
              { classId: "natural_ambient", label: "เสียงธรรมชาติ", score: 0.64 },
              { classId: "chainsaw", label: "เสียงเลื่อยยนต์", score: 0.42 },
              { classId: "human_activity", label: "กิจกรรมมนุษย์", score: 0.35 },
            ],
          },
          {
            segmentIndex: 1,
            startSeconds: 4,
            endSeconds: 8,
            scores: [
              { classId: "chainsaw", label: "เสียงเลื่อยยนต์", score: 0.91 },
              { classId: "human_activity", label: "กิจกรรมมนุษย์", score: 0.52 },
              { classId: "natural_ambient", label: "เสียงธรรมชาติ", score: 0.48 },
            ],
          },
          {
            segmentIndex: 2,
            startSeconds: 8,
            endSeconds: 12,
            scores: [
              { classId: "chainsaw", label: "เสียงเลื่อยยนต์", score: 0.87 },
              { classId: "natural_ambient", label: "เสียงธรรมชาติ", score: 0.41 },
              { classId: "vehicle", label: "เสียงยานพาหนะ", score: 0.28 },
            ],
          },
        ],
      },
    },
  },
  {
    report: {
      id: "33333333-3333-4333-8333-333333333302",
      report_code: "RF-20261101-002",
      source_type: "station_sensor",
      reporter_id: "00000000-0000-4000-8000-000000000002",
      zone_id: "11111111-1111-4111-8111-111111111101",
      station_id: "22222222-2222-4222-8222-222222222203",
      lat: 18.1119,
      lng: 98.7615,
      description:
        "เสาไมค์ ST-03 ตรวจพบเสียงปะทุคล้ายไฟไหม้กิ่งไม้แห้งในพื้นที่ป่าเต็งรัง มอบหมายชุดลาดตระเวนเข้าตรวจสอบแล้ว",
      status: "dispatched",
      risk_level: "red",
      assigned_to: "00000000-0000-4000-8000-000000000003",
      dispatch_note:
        "ตรวจพบเสียงไฟป่าที่เสา ST-03 ความมั่นใจ 84% ให้ชุดเคลื่อนที่เร็วเข้าตรวจสอบแนวกันไฟฝั่งทิศใต้",
      dispatched_at: new Date(Date.now() - 55 * 60000).toISOString(),
    },
    audio: {
      id: "44444444-4444-4444-8444-444444444402",
      report_id: "33333333-3333-4333-8333-333333333302",
      file_url: "",
      file_name: "st03_fire_crackle_20261101.wav",
      duration_seconds: 8,
    },
    ai: {
      id: "55555555-5555-4555-8555-555555555502",
      report_audio_id: "44444444-4444-4444-8444-444444444402",
      predicted_label: "fire",
      confidence: 0.84,
      model_version: "rakforest-audiocnn-multilabel-v1",
      raw_response: {
        requestId: "req-st03-002",
        modelVersion: "rakforest-audiocnn-multilabel-v1",
        label: "fire",
        decisionThreshold: 0.5,
        source: "http",
        scores: [
          { classId: "fire", label: "เสียงไฟ", score: 0.84 },
          { classId: "weather", label: "เสียงสภาพอากาศ", score: 0.58 },
          { classId: "natural_ambient", label: "เสียงธรรมชาติ", score: 0.46 },
          { classId: "chainsaw", label: "เสียงเลื่อยยนต์", score: 0.09 },
          { classId: "vehicle", label: "เสียงยานพาหนะ", score: 0.05 },
          { classId: "human_activity", label: "กิจกรรมมนุษย์", score: 0.14 },
          { classId: "threat_tactical", label: "กิจกรรมต้องสงสัย", score: 0.04 },
          { classId: "other", label: "เสียงอื่น", score: 0.11 },
          { classId: "silence", label: "ความเงียบ", score: 0.02 },
        ],
        segments: [
          {
            segmentIndex: 0,
            startSeconds: 0,
            endSeconds: 4,
            scores: [
              { classId: "fire", label: "เสียงไฟ", score: 0.79 },
              { classId: "weather", label: "เสียงสภาพอากาศ", score: 0.58 },
            ],
          },
          {
            segmentIndex: 1,
            startSeconds: 4,
            endSeconds: 8,
            scores: [
              { classId: "fire", label: "เสียงไฟ", score: 0.84 },
              { classId: "natural_ambient", label: "เสียงธรรมชาติ", score: 0.46 },
            ],
          },
        ],
      },
    },
  },
  {
    report: {
      id: "33333333-3333-4333-8333-333333333303",
      report_code: "RF-20261101-003",
      source_type: "field_patrol",
      reporter_id: "00000000-0000-4000-8000-000000000003",
      zone_id: "11111111-1111-4111-8111-111111111102",
      station_id: "22222222-2222-4222-8222-222222222204",
      lat: 18.1742,
      lng: 98.8405,
      description:
        "ชุดลาดตระเวนพบเห็นร่องรอยล้อรถกระบะและได้ยินเสียงเครื่องยนต์กำลังสูงบริเวณทางแยกเหนืออ่างเก็บน้ำแม่แตง",
      status: "submitted",
      risk_level: "yellow",
      assigned_to: "00000000-0000-4000-8000-000000000003",
      dispatch_note: "ตรวจสอบเส้นทางลำเลียงใกล้เสา ST-04",
      dispatched_at: new Date(Date.now() - 180 * 60000).toISOString(),
      acknowledged_at: new Date(Date.now() - 160 * 60000).toISOString(),
      field_outcome: "found",
      field_notes:
        "พบรอยล้อรถยนต์เข้าออกใหม่และกองกิ่งไม้ถูกตัดแต่งริมทาง ได้บันทึกเสียงและพิกัดไว้เป็นหลักฐาน รอส่วนกลางยืนยันปิดกั้นเส้นทาง",
      submitted_at: new Date(Date.now() - 110 * 60000).toISOString(),
    },
    audio: {
      id: "44444444-4444-4444-8444-444444444403",
      report_id: "33333333-3333-4333-8333-333333333303",
      file_url: "",
      file_name: "field_patrol_vehicle_st04.wav",
      duration_seconds: 8,
    },
    ai: {
      id: "55555555-5555-4555-8555-555555555503",
      report_audio_id: "44444444-4444-4444-8444-444444444403",
      predicted_label: "vehicle",
      confidence: 0.78,
      model_version: "rakforest-audiocnn-multilabel-v1",
      raw_response: {
        requestId: "req-st04-003",
        modelVersion: "rakforest-audiocnn-multilabel-v1",
        label: "vehicle",
        decisionThreshold: 0.5,
        source: "http",
        scores: [
          { classId: "vehicle", label: "เสียงยานพาหนะ", score: 0.78 },
          { classId: "human_activity", label: "กิจกรรมมนุษย์", score: 0.62 },
          { classId: "natural_ambient", label: "เสียงธรรมชาติ", score: 0.55 },
          { classId: "chainsaw", label: "เสียงเลื่อยยนต์", score: 0.18 },
          { classId: "fire", label: "เสียงไฟ", score: 0.05 },
          { classId: "threat_tactical", label: "กิจกรรมต้องสงสัย", score: 0.09 },
          { classId: "weather", label: "เสียงสภาพอากาศ", score: 0.22 },
          { classId: "other", label: "เสียงอื่น", score: 0.15 },
          { classId: "silence", label: "ความเงียบ", score: 0.04 },
        ],
        segments: [
          {
            segmentIndex: 0,
            startSeconds: 0,
            endSeconds: 4,
            scores: [
              { classId: "vehicle", label: "เสียงยานพาหนะ", score: 0.78 },
              { classId: "human_activity", label: "กิจกรรมมนุษย์", score: 0.62 },
            ],
          },
          {
            segmentIndex: 1,
            startSeconds: 4,
            endSeconds: 8,
            scores: [
              { classId: "vehicle", label: "เสียงยานพาหนะ", score: 0.69 },
              { classId: "natural_ambient", label: "เสียงธรรมชาติ", score: 0.55 },
            ],
          },
        ],
      },
    },
  },
  {
    report: {
      id: "33333333-3333-4333-8333-333333333304",
      report_code: "RF-20261031-019",
      source_type: "station_sensor",
      reporter_id: "00000000-0000-4000-8000-000000000002",
      zone_id: "11111111-1111-4111-8111-111111111103",
      station_id: "22222222-2222-4222-8222-222222222205",
      lat: 14.438,
      lng: 101.382,
      description:
        "สัญญาณเสียงประจำวันจากเสา ST-05 พบเฉพาะเสียงนกและลมตามธรรมชาติ",
      status: "closed",
      risk_level: "green",
      reviewed_by: "00000000-0000-4000-8000-000000000002",
      reviewed_at: new Date(Date.now() - 86400000).toISOString(),
      review_notes: "เสียงธรรมชาติปกติ ปิดรายการอัตโนมัติ",
    },
    audio: {
      id: "44444444-4444-4444-8444-444444444404",
      report_id: "33333333-3333-4333-8333-333333333304",
      file_url: "",
      file_name: "st05_ambient_check.wav",
      duration_seconds: 8,
    },
    ai: {
      id: "55555555-5555-4555-8555-555555555504",
      report_audio_id: "44444444-4444-4444-8444-444444444404",
      predicted_label: "natural_ambient",
      confidence: 0.93,
      model_version: "rakforest-audiocnn-multilabel-v1",
      raw_response: {
        requestId: "req-st05-004",
        modelVersion: "rakforest-audiocnn-multilabel-v1",
        label: "natural_ambient",
        decisionThreshold: 0.5,
        source: "http",
        scores: [
          { classId: "natural_ambient", label: "เสียงธรรมชาติ", score: 0.93 },
          { classId: "weather", label: "เสียงสภาพอากาศ", score: 0.34 },
          { classId: "silence", label: "ความเงียบ", score: 0.12 },
          { classId: "other", label: "เสียงอื่น", score: 0.08 },
          { classId: "human_activity", label: "กิจกรรมมนุษย์", score: 0.04 },
          { classId: "vehicle", label: "เสียงยานพาหนะ", score: 0.02 },
          { classId: "chainsaw", label: "เสียงเลื่อยยนต์", score: 0.01 },
          { classId: "fire", label: "เสียงไฟ", score: 0.01 },
          { classId: "threat_tactical", label: "กิจกรรมต้องสงสัย", score: 0.01 },
        ],
        segments: [
          {
            segmentIndex: 0,
            startSeconds: 0,
            endSeconds: 8,
            scores: [
              { classId: "natural_ambient", label: "เสียงธรรมชาติ", score: 0.93 },
              { classId: "weather", label: "เสียงสภาพอากาศ", score: 0.34 },
            ],
          },
        ],
      },
    },
  },
  {
    report: {
      id: "33333333-3333-4333-8333-333333333305",
      report_code: "RF-20261101-005",
      source_type: "station_sensor",
      reporter_id: "00000000-0000-4000-8000-000000000002",
      zone_id: "11111111-1111-4111-8111-111111111101",
      station_id: "22222222-2222-4222-8222-222222222202",
      lat: 18.1275,
      lng: 98.7772,
      description:
        "เสาไมค์ ST-02 ตรวจพบเสียงดังคล้ายอาวุธปืนและเสียงพูดคุยบริเวณด่านตรวจชั้นในยามวิกาล",
      status: "acknowledged",
      risk_level: "red",
      assigned_to: "00000000-0000-4000-8000-000000000003",
      dispatch_note:
        "ระมัดระวังความปลอดภัยสูงสุด สนธิกำลังร่วมกับชุดพิทักษ์ป่าส่วนหน้าเข้าตรวจสอบพิกัด ST-02",
      dispatched_at: new Date(Date.now() - 40 * 60000).toISOString(),
      acknowledged_at: new Date(Date.now() - 30 * 60000).toISOString(),
    },
    audio: {
      id: "44444444-4444-4444-8444-444444444405",
      report_id: "33333333-3333-4333-8333-333333333305",
      file_url: "",
      file_name: "st02_tactical_gunshot_20261101.wav",
      duration_seconds: 8,
    },
    ai: {
      id: "55555555-5555-4555-8555-555555555505",
      report_audio_id: "44444444-4444-4444-8444-444444444405",
      predicted_label: "threat_tactical",
      confidence: 0.86,
      model_version: "rakforest-audiocnn-multilabel-v1",
      raw_response: {
        requestId: "req-st02-005",
        modelVersion: "rakforest-audiocnn-multilabel-v1",
        label: "threat_tactical",
        decisionThreshold: 0.5,
        source: "http",
        scores: [
          { classId: "threat_tactical", label: "กิจกรรมต้องสงสัย", score: 0.86 },
          { classId: "human_activity", label: "กิจกรรมมนุษย์", score: 0.67 },
          { classId: "natural_ambient", label: "เสียงธรรมชาติ", score: 0.49 },
          { classId: "vehicle", label: "เสียงยานพาหนะ", score: 0.31 },
          { classId: "chainsaw", label: "เสียงเลื่อยยนต์", score: 0.07 },
          { classId: "fire", label: "เสียงไฟ", score: 0.04 },
          { classId: "weather", label: "เสียงสภาพอากาศ", score: 0.16 },
          { classId: "other", label: "เสียงอื่น", score: 0.12 },
          { classId: "silence", label: "ความเงียบ", score: 0.05 },
        ],
        segments: [
          {
            segmentIndex: 0,
            startSeconds: 0,
            endSeconds: 4,
            scores: [
              { classId: "threat_tactical", label: "กิจกรรมต้องสงสัย", score: 0.86 },
              { classId: "human_activity", label: "กิจกรรมมนุษย์", score: 0.67 },
            ],
          },
          {
            segmentIndex: 1,
            startSeconds: 4,
            endSeconds: 8,
            scores: [
              { classId: "human_activity", label: "กิจกรรมมนุษย์", score: 0.59 },
              { classId: "natural_ambient", label: "เสียงธรรมชาติ", score: 0.49 },
            ],
          },
        ],
      },
    },
  },
];

async function main() {
  console.log("1. Rebuilding clean UTF-8 supabase/full_setup.sql...");
  const m1 = fs.readFileSync(
    path.join(rootDir, "supabase/migrations/20261101000001_initial_schema.sql"),
    "utf8"
  );
  const m2 = fs.readFileSync(
    path.join(rootDir, "supabase/migrations/20261101000002_rls_and_storage.sql"),
    "utf8"
  );
  const m3 = fs.readFileSync(
    path.join(rootDir, "supabase/migrations/20261101000003_seed_data.sql"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(rootDir, "supabase/full_setup.sql"),
    [m1, m2, m3].join("\n\n"),
    "utf8"
  );

  console.log("2. Connecting to Supabase PostgreSQL...");
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    console.log("3. Executing Migration 01 (Extensions, 10 Tables, Functions, Triggers)...");
    await client.query(m1);

    // Ensure profiles.id does not fail if created before auth.users row
    await client.query(`
      alter table public.profiles alter column id set default gen_random_uuid();
      do $$
      declare
        r record;
      begin
        for r in (
          select constraint_name
          from information_schema.table_constraints
          where table_schema = 'public'
            and table_name = 'profiles'
            and constraint_type = 'FOREIGN KEY'
        ) loop
          if r.constraint_name like '%id_fkey%' then
            execute 'alter table public.profiles drop constraint if exists ' || quote_ident(r.constraint_name);
          end if;
        end loop;
      end $$;
    `);

    console.log("4. Executing Migration 02 (RLS Policies, Storage Buckets, Realtime)...");
    await client.query(m2);

    console.log("5. Creating/Updating 4 Officer Accounts in Supabase Auth & public.profiles...");
    for (const p of PROFILES) {
      try {
        const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
          id: p.id,
          email: p.email,
          password: "RakForest2026!",
          email_confirm: true,
          user_metadata: {
            employee_code: p.employee_code,
            full_name: p.full_name,
            role: p.role,
          },
        });
        if (createErr && !createErr.message.toLowerCase().includes("already")) {
          console.warn(`Auth user notice (${p.email}):`, createErr.message);
        }
      } catch (e) {
        console.warn(`Auth user skip (${p.email}):`, e.message);
      }

      await client.query(
        `insert into public.profiles (
          id, employee_code, email, full_name, position, department, phone,
          role, assigned_zone_ids, id_card_file_url, verification_status, otp_code, telegram_chat_id
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        on conflict (id) do update set
          employee_code = excluded.employee_code,
          email = excluded.email,
          full_name = excluded.full_name,
          position = excluded.position,
          department = excluded.department,
          phone = excluded.phone,
          role = excluded.role,
          assigned_zone_ids = excluded.assigned_zone_ids,
          verification_status = excluded.verification_status,
          telegram_chat_id = excluded.telegram_chat_id,
          updated_at = now()`,
        [
          p.id,
          p.employee_code,
          p.email,
          p.full_name,
          p.position,
          p.department,
          p.phone,
          p.role,
          p.assigned_zone_ids,
          p.id_card_file_url ?? null,
          p.verification_status,
          p.otp_code ?? null,
          p.telegram_chat_id ?? "1750820064",
        ]
      );
    }

    console.log("6. Executing Migration 03 (4 Forest Zones, 6 Sensor Stations ST-01..ST-06, 3 Alert Rules)...");
    await client.query(m3);

    // Assign responsible officers to forest zones
    await client.query(`
      update public.forest_zones set responsible_officer_id = '00000000-0000-4000-8000-000000000003'
      where zone_code in ('ZN-CM-01', 'ZN-CM-02');
      update public.forest_zones set responsible_officer_id = '00000000-0000-4000-8000-000000000002'
      where zone_code = 'ZN-KJ-03';
      update public.forest_zones set responsible_officer_id = '00000000-0000-4000-8000-000000000001'
      where zone_code = 'ZN-UT-04';
    `);

    console.log("7. Seeding 5 Sample Acoustic Reports + Audio + 9-Class AI Classifications...");
    for (const item of REPORTS_SEED) {
      const r = item.report;
      await client.query(
        `insert into public.reports (
          id, report_code, source_type, reporter_id, zone_id, station_id,
          lat, lng, description, status, risk_level, assigned_to,
          dispatch_note, dispatched_at, acknowledged_at,
          field_outcome, field_notes, submitted_at,
          reviewed_by, reviewed_at, review_notes
        ) values (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
        )
        on conflict (id) do update set
          report_code = excluded.report_code,
          description = excluded.description,
          status = excluded.status,
          risk_level = excluded.risk_level,
          assigned_to = excluded.assigned_to,
          dispatch_note = excluded.dispatch_note,
          field_outcome = excluded.field_outcome,
          field_notes = excluded.field_notes,
          updated_at = now()`,
        [
          r.id,
          r.report_code,
          r.source_type,
          r.reporter_id ?? null,
          r.zone_id ?? null,
          r.station_id ?? null,
          r.lat,
          r.lng,
          r.description,
          r.status,
          r.risk_level,
          r.assigned_to ?? null,
          r.dispatch_note ?? null,
          r.dispatched_at ?? null,
          r.acknowledged_at ?? null,
          r.field_outcome ?? null,
          r.field_notes ?? null,
          r.submitted_at ?? null,
          r.reviewed_by ?? null,
          r.reviewed_at ?? null,
          r.review_notes ?? null,
        ]
      );

      const a = item.audio;
      await client.query(
        `insert into public.report_audio (id, report_id, file_url, file_name, duration_seconds)
         values ($1,$2,$3,$4,$5)
         on conflict (id) do update set
           file_name = excluded.file_name,
           duration_seconds = excluded.duration_seconds`,
        [a.id, a.report_id, a.file_url, a.file_name, a.duration_seconds]
      );

      const ai = item.ai;
      await client.query(
        `insert into public.ai_classifications (
          id, report_audio_id, predicted_label, confidence, raw_response, model_version
        ) values ($1,$2,$3,$4,$5::jsonb,$6)
        on conflict (id) do update set
          predicted_label = excluded.predicted_label,
          confidence = excluded.confidence,
          raw_response = excluded.raw_response`,
        [
          ai.id,
          ai.report_audio_id,
          ai.predicted_label,
          ai.confidence,
          JSON.stringify(ai.raw_response),
          ai.model_version,
        ]
      );
    }

    console.log("8. Seeding Notification Logs & Audit Logs...");
    await client.query(`
      insert into public.notifications_log (id, report_id, channel, recipient, message, status)
      values
        (
          '77777777-7777-4777-8777-777777777701',
          '33333333-3333-4333-8333-333333333301',
          'telegram',
          'Chat ID: 1750820064 (กลุ่มปฏิบัติการแม่ริม)',
          '🚨 [RakForest วิกฤต] RF-20261101-001 • ตรวจพบเสียงเลื่อยยนต์ (91%) ที่เสา ST-01 (ห้วยแม่ริม A) พิกัด 18.1234, 98.7654',
          'sent'
        ),
        (
          '77777777-7777-4777-8777-777777777702',
          '33333333-3333-4333-8333-333333333302',
          'telegram',
          'Chat ID: 1750820064 (สมชาย ใจดี - ชุดเคลื่อนที่เร็ว)',
          '📋 [มอบหมายงานภาคสนาม] RF-20261101-002 • โปรดเข้าตรวจสอบเสา ST-03 (ผาดำ C) พบเสียงไฟป่า (84%)',
          'sent'
        )
      on conflict (id) do nothing;

      insert into public.audit_logs (id, actor_id, actor_name, action, target_table, target_id, details)
      values
        (
          '88888888-8888-4888-8888-888888888801',
          '00000000-0000-4000-8000-000000000002',
          'วรัญญา ศรีสุวรรณ',
          'dispatch_field_ranger',
          'reports',
          '33333333-3333-4333-8333-333333333302',
          '{"report_code":"RF-20261101-002","assigned_to":"RF-RNG-108"}'::jsonb
        )
      on conflict (id) do nothing;
    `);

    // Reload PostgREST schema cache
    await client.query(`NOTIFY pgrst, 'reload schema';`);

    console.log("9. Verifying row counts across all 10 tables in Supabase...");
    const tables = [
      "profiles",
      "forest_zones",
      "sensor_stations",
      "reports",
      "report_audio",
      "ai_classifications",
      "report_evidence",
      "notification_rules",
      "notifications_log",
      "audit_logs",
    ];
    for (const t of tables) {
      const { rows } = await client.query(`select count(*)::int as cnt from public.${t}`);
      console.log(`   - public.${t}: ${rows[0].cnt} rows`);
    }
    console.log("✅ Supabase Database Provisioning Complete!");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
