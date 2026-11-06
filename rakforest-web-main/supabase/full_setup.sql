-- ============================================================================
-- RakForest Migration 01: Core Schema (PostGIS, Profiles, Forest Zones,
-- Sensor Stations, Reports, Audio, AI Classifications, Evidence, Alerts, Audit)
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "postgis";

-- 1. PROFILES
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  employee_code text unique,
  email text,
  full_name text not null,
  position text,
  department text,
  phone text,
  role text not null default 'pending_verification'
    check (role in ('super_admin','officer_backoffice','field_ranger','pending_verification','suspended')),
  assigned_zone_ids uuid[] default '{}',
  id_card_file_url text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending','otp_sent','otp_verified','approved','rejected')),
  otp_code text,
  otp_expires_at timestamptz,
  telegram_chat_id text,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. FOREST ZONES
create table if not exists public.forest_zones (
  id uuid primary key default gen_random_uuid(),
  zone_code text unique,
  name text not null,
  province text,
  district text,
  area_rai numeric,
  geometry geometry(Polygon, 4326),
  polygon_coords jsonb not null default '[]'::jsonb, -- Array of [lng, lat] pairs for direct frontend rendering
  current_risk_level text not null default 'green'
    check (current_risk_level in ('red','yellow','green')),
  responsible_officer_id uuid references public.profiles(id) on delete set null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists forest_zones_geometry_idx on public.forest_zones using gist (geometry);

-- 3. SENSOR STATIONS (เสาไมค์ตรวจจับเสียงในป่า)
create table if not exists public.sensor_stations (
  id uuid primary key default gen_random_uuid(),
  station_code text unique not null, -- เช่น ST-01, ST-02
  name text not null,
  zone_id uuid references public.forest_zones(id) on delete set null,
  location geography(Point, 4326),
  lat double precision not null,
  lng double precision not null,
  radius_meters numeric not null default 300,
  status text not null default 'online'
    check (status in ('online','offline','maintenance')),
  battery_percent integer not null default 100
    check (battery_percent >= 0 and battery_percent <= 100),
  last_heartbeat_at timestamptz default now(),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists sensor_stations_zone_idx on public.sensor_stations (zone_id);
create index if not exists sensor_stations_location_idx on public.sensor_stations using gist (location);

-- 4. REPORTS (รายงานเหตุการณ์จากเสาไมค์ หรือ ลาดตระเวนภาคสนาม)
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  report_code text unique not null,
  source_type text not null default 'station_sensor'
    check (source_type in ('station_sensor','field_patrol')),
  reporter_id uuid references public.profiles(id) on delete set null,
  zone_id uuid references public.forest_zones(id) on delete set null,
  station_id uuid references public.sensor_stations(id) on delete set null,
  location geography(Point, 4326),
  lat double precision not null,
  lng double precision not null,
  description text,
  status text not null default 'pending'
    check (status in ('pending','under_review','dispatched','acknowledged','submitted','confirmed','rejected','closed')),
  risk_level text not null default 'green'
    check (risk_level in ('red','yellow','green')),
  assigned_to uuid references public.profiles(id) on delete set null,
  dispatch_note text,
  dispatched_at timestamptz,
  acknowledged_at timestamptz,
  field_outcome text
    check (field_outcome is null or field_outcome in ('found','not_found','unable_to_inspect')),
  field_notes text,
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists reports_zone_idx on public.reports (zone_id);
create index if not exists reports_station_idx on public.reports (station_id);
create index if not exists reports_status_idx on public.reports (status);
create index if not exists reports_risk_idx on public.reports (risk_level);
create index if not exists reports_location_idx on public.reports using gist (location);

-- 5. REPORT AUDIO
create table if not exists public.report_audio (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  file_url text not null,
  file_name text,
  duration_seconds numeric,
  uploaded_at timestamptz default now()
);

create index if not exists report_audio_report_idx on public.report_audio (report_id);

-- 6. AI CLASSIFICATIONS (ผลวิเคราะห์จากโมเดล AudioCNN 9 คลาส + ช่วงเวลา)
create table if not exists public.ai_classifications (
  id uuid primary key default gen_random_uuid(),
  report_audio_id uuid not null references public.report_audio(id) on delete cascade,
  predicted_label text not null,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  raw_response jsonb default '{}'::jsonb,
  model_version text default 'rakforest-audiocnn-multilabel-v1',
  processed_at timestamptz default now()
);

create index if not exists ai_classifications_audio_idx on public.ai_classifications (report_audio_id);

-- 7. REPORT EVIDENCE (รูป/วิดีโอหลักฐาน)
create table if not exists public.report_evidence (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  file_url text not null,
  file_name text,
  file_type text not null default 'image' check (file_type in ('image','video')),
  uploaded_by uuid references public.profiles(id) on delete set null,
  uploaded_at timestamptz default now()
);

create index if not exists report_evidence_report_idx on public.report_evidence (report_id);

-- 8. NOTIFICATION RULES
create table if not exists public.notification_rules (
  id uuid primary key default gen_random_uuid(),
  risk_level text unique not null check (risk_level in ('red','yellow','green')),
  action_description text,
  channels text[] not null default '{}', -- ['telegram','sms','email','push']
  auto_dispatch boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz default now()
);

-- 9. NOTIFICATIONS LOG
create table if not exists public.notifications_log (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports(id) on delete cascade,
  channel text not null, -- 'telegram','sms','email','push'
  recipient text,
  message text not null,
  status text not null default 'sent' check (status in ('sent','failed','pending')),
  error_message text,
  sent_at timestamptz default now()
);

create index if not exists notifications_log_report_idx on public.notifications_log (report_id);

-- 10. AUDIT LOGS
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  action text not null,
  target_table text,
  target_id uuid,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists audit_logs_target_idx on public.audit_logs (target_table, target_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Sync geography Point from lat/lng on sensor_stations and reports
create or replace function public.fn_sync_point_geography()
returns trigger language plpgsql as $$
begin
  if new.lat is not null and new.lng is not null then
    new.location := ST_SetSRID(ST_MakePoint(new.lng, new.lat), 4326)::geography;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_sensor_stations_point on public.sensor_stations;
create trigger trg_sensor_stations_point
before insert or update on public.sensor_stations
for each row execute function public.fn_sync_point_geography();

drop trigger if exists trg_reports_point on public.reports;
create trigger trg_reports_point
before insert or update on public.reports
for each row execute function public.fn_sync_point_geography();

-- Threat-Priority Risk Level Calculation
create or replace function public.fn_calculate_risk_level(
  p_label text,
  p_confidence numeric,
  p_raw_response jsonb default '{}'::jsonb
)
returns text language plpgsql as $$
declare
  v_fire numeric := 0;
  v_chainsaw numeric := 0;
  v_tactical numeric := 0;
  v_vehicle numeric := 0;
  v_human numeric := 0;
  v_item jsonb;
begin
  if p_raw_response is not null and jsonb_typeof(p_raw_response->'scores') = 'array' then
    for v_item in select * from jsonb_array_elements(p_raw_response->'scores')
    loop
      case v_item->>'classId'
        when 'fire' then v_fire := greatest(v_fire, coalesce((v_item->>'score')::numeric, 0));
        when 'chainsaw' then v_chainsaw := greatest(v_chainsaw, coalesce((v_item->>'score')::numeric, 0));
        when 'threat_tactical' then v_tactical := greatest(v_tactical, coalesce((v_item->>'score')::numeric, 0));
        when 'vehicle' then v_vehicle := greatest(v_vehicle, coalesce((v_item->>'score')::numeric, 0));
        when 'human_activity' then v_human := greatest(v_human, coalesce((v_item->>'score')::numeric, 0));
        else null;
      end case;
    end loop;
  else
    case p_label
      when 'fire' then v_fire := p_confidence;
      when 'chainsaw' then v_chainsaw := p_confidence;
      when 'threat_tactical' then v_tactical := p_confidence;
      when 'vehicle' then v_vehicle := p_confidence;
      when 'human_activity' then v_human := p_confidence;
      else null;
    end case;
  end if;

  if greatest(v_fire, v_chainsaw, v_tactical) >= 0.75 then
    return 'red';
  elsif greatest(v_fire, v_chainsaw, v_tactical) >= 0.45 or greatest(v_vehicle, v_human) >= 0.60 then
    return 'yellow';
  else
    return 'green';
  end if;
end;
$$;

-- Trigger after AI classification insert -> update reports.risk_level and forest_zones.current_risk_level
create or replace function public.fn_after_ai_classification()
returns trigger language plpgsql security definer as $$
declare
  v_report_id uuid;
  v_zone_id uuid;
  v_risk text;
begin
  select report_id into v_report_id from public.report_audio where id = new.report_audio_id;
  if v_report_id is null then
    return new;
  end if;

  v_risk := public.fn_calculate_risk_level(new.predicted_label, new.confidence, new.raw_response);

  update public.reports
  set risk_level = v_risk,
      updated_at = now()
  where id = v_report_id
  returning zone_id into v_zone_id;

  if v_zone_id is not null and v_risk = 'red' then
    update public.forest_zones
    set current_risk_level = 'red',
        updated_at = now()
    where id = v_zone_id;
  elsif v_zone_id is not null and v_risk = 'yellow' then
    update public.forest_zones
    set current_risk_level = 'yellow',
        updated_at = now()
    where id = v_zone_id and current_risk_level = 'green';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_after_ai_classification on public.ai_classifications;
create trigger trg_after_ai_classification
after insert on public.ai_classifications
for each row execute function public.fn_after_ai_classification();


-- ============================================================================
-- RakForest Migration 02: Row Level Security (RLS), Storage Buckets & Realtime
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.forest_zones enable row level security;
alter table public.sensor_stations enable row level security;
alter table public.reports enable row level security;
alter table public.report_audio enable row level security;
alter table public.ai_classifications enable row level security;
alter table public.report_evidence enable row level security;
alter table public.notification_rules enable row level security;
alter table public.notifications_log enable row level security;
alter table public.audit_logs enable row level security;

-- Helper function to read current user's role safely
create or replace function public.fn_current_user_role()
returns text language sql stable security definer as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'super_admin'
  );
$$;

-- Read/write policies (allowing authenticated users and anon/service access for smooth operation)
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles for select using (true);

drop policy if exists "profiles_write_all" on public.profiles;
create policy "profiles_write_all" on public.profiles for all using (true) with check (true);

drop policy if exists "forest_zones_select_all" on public.forest_zones;
create policy "forest_zones_select_all" on public.forest_zones for select using (true);

drop policy if exists "forest_zones_write_all" on public.forest_zones;
create policy "forest_zones_write_all" on public.forest_zones for all using (true) with check (true);

drop policy if exists "sensor_stations_select_all" on public.sensor_stations;
create policy "sensor_stations_select_all" on public.sensor_stations for select using (true);

drop policy if exists "sensor_stations_write_all" on public.sensor_stations;
create policy "sensor_stations_write_all" on public.sensor_stations for all using (true) with check (true);

drop policy if exists "reports_select_all" on public.reports;
create policy "reports_select_all" on public.reports for select using (true);

drop policy if exists "reports_write_all" on public.reports;
create policy "reports_write_all" on public.reports for all using (true) with check (true);

drop policy if exists "report_audio_all" on public.report_audio;
create policy "report_audio_all" on public.report_audio for all using (true) with check (true);

drop policy if exists "ai_classifications_all" on public.ai_classifications;
create policy "ai_classifications_all" on public.ai_classifications for all using (true) with check (true);

drop policy if exists "report_evidence_all" on public.report_evidence;
create policy "report_evidence_all" on public.report_evidence for all using (true) with check (true);

drop policy if exists "notification_rules_all" on public.notification_rules;
create policy "notification_rules_all" on public.notification_rules for all using (true) with check (true);

drop policy if exists "notifications_log_all" on public.notifications_log;
create policy "notifications_log_all" on public.notifications_log for all using (true) with check (true);

drop policy if exists "audit_logs_all" on public.audit_logs;
create policy "audit_logs_all" on public.audit_logs for all using (true) with check (true);

-- Storage Buckets
insert into storage.buckets (id, name, public)
values
  ('audio-reports', 'audio-reports', true),
  ('evidence-files', 'evidence-files', true),
  ('employee-ids', 'employee-ids', false),
  ('zone-thumbnails', 'zone-thumbnails', true)
on conflict (id) do nothing;

drop policy if exists "storage_public_read" on storage.objects;
create policy "storage_public_read" on storage.objects for select using (bucket_id in ('audio-reports', 'evidence-files', 'zone-thumbnails', 'employee-ids'));

drop policy if exists "storage_authenticated_insert" on storage.objects;
create policy "storage_authenticated_insert" on storage.objects for insert with check (bucket_id in ('audio-reports', 'evidence-files', 'zone-thumbnails', 'employee-ids'));

drop policy if exists "storage_authenticated_update" on storage.objects;
create policy "storage_authenticated_update" on storage.objects for update using (bucket_id in ('audio-reports', 'evidence-files', 'zone-thumbnails', 'employee-ids'));

-- Enable Realtime on operational tables
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'reports'
  ) then
    alter publication supabase_realtime add table public.reports;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'ai_classifications'
  ) then
    alter publication supabase_realtime add table public.ai_classifications;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'forest_zones'
  ) then
    alter publication supabase_realtime add table public.forest_zones;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'sensor_stations'
  ) then
    alter publication supabase_realtime add table public.sensor_stations;
  end if;
exception when others then
  null;
end $$;


-- ============================================================================
-- RakForest Migration 03: Seed Data (Zones, Sensor Stations, Notification Rules)
-- ============================================================================

-- 1. Forest Zones (4 โซนป่าอนุรักษ์สำคัญของไทย)
insert into public.forest_zones (id, zone_code, name, province, district, area_rai, polygon_coords, current_risk_level, description)
values
  (
    '11111111-1111-4111-8111-111111111101',
    'ZN-CM-01',
    'เขตอนุรักษ์ป่าแม่ริม–สะเมิง ตอนบน',
    'เชียงใหม่',
    'แม่ริม',
    18450,
    '[[98.7450,18.1450],[98.7920,18.1450],[98.7950,18.1050],[98.7420,18.1020],[98.7450,18.1450]]'::jsonb,
    'red',
    'พื้นที่เฝ้าระวังพิเศษแนวรอยต่อป่าไม้สักและป่าเบญจพรรณ มีความเสี่ยงการลักลอบตัดไม้และไฟป่าช่วงแล้ง'
  ),
  (
    '11111111-1111-4111-8111-111111111102',
    'ZN-CM-02',
    'ป่าสงวนแห่งชาติแม่แตง–ห้วยตึงเฒ่า',
    'เชียงใหม่',
    'แม่แตง',
    24600,
    '[[98.8100,18.1950],[98.8650,18.1950],[98.8680,18.1520],[98.8120,18.1500],[98.8100,18.1950]]'::jsonb,
    'yellow',
    'พื้นที่ป่ารอยต่อชุมชนและเส้นทางลำเลียง มีการติดตั้งเสาไมโครโฟนตรวจจับเสียงยานพาหนะและกิจกรรมมนุษย์'
  ),
  (
    '11111111-1111-4111-8111-111111111103',
    'ZN-KJ-03',
    'แนวกันชนอุทยานแห่งชาติเขาใหญ่ โซนตะวันออก',
    'นครราชสีมา',
    'ปากช่อง',
    31200,
    '[[101.3500,14.4650],[101.4150,14.4650],[101.4150,14.4100],[101.3500,14.4100],[101.3500,14.4650]]'::jsonb,
    'green',
    'แนวกันชนผืนป่าดงพญาเย็น–เขาใหญ่ เฝ้าระวังการล่าสัตว์และเสียงปืนในเวลากลางคืน'
  ),
  (
    '11111111-1111-4111-8111-111111111104',
    'ZN-UT-04',
    'เขตรักษาพันธุ์สัตว์ป่าห้วยขาแข้ง โซนใต้',
    'อุทัยธานี',
    'บ้านไร่',
    42800,
    '[[99.2600,15.5800],[99.3300,15.5800],[99.3300,15.5200],[99.2600,15.5200],[99.2600,15.5800]]'::jsonb,
    'green',
    'พื้นที่มรดกโลกทางธรรมชาติ มีความหลากหลายทางชีวภาพสูง ติดตั้งเสารับเสียงระยะไกล'
  )
on conflict (id) do update set
  name = excluded.name,
  current_risk_level = excluded.current_risk_level,
  polygon_coords = excluded.polygon_coords;

-- 2. Sensor Stations (เสาไมค์ตรวจจับเสียงประจำโซน)
insert into public.sensor_stations (id, station_code, name, zone_id, lat, lng, radius_meters, status, battery_percent, notes)
values
  (
    '22222222-2222-4222-8222-222222222201',
    'ST-01',
    'เสาไมค์ห้วยแม่ริม A (สันเขาตะวันตก)',
    '11111111-1111-4111-8111-111111111101',
    18.1234,
    98.7654,
    350,
    'online',
    94,
    'ติดตั้งใกล้ทางลำเลียงไม้เก่า โซลาร์เซลล์ทำงานปกติ'
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    'ST-02',
    'เสาไมค์ห้วยแม่ริม B (ด่านตรวจชั้นใน)',
    '11111111-1111-4111-8111-111111111101',
    18.1275,
    98.7772,
    300,
    'online',
    88,
    'จุดเฝ้าระวังเสียงเลื่อยยนต์และรถบรรทุก'
  ),
  (
    '22222222-2222-4222-8222-222222222203',
    'ST-03',
    'เสาไมค์ผาดำ C (จุดเฝ้าระวังไฟป่า)',
    '11111111-1111-4111-8111-111111111101',
    18.1119,
    98.7615,
    400,
    'online',
    91,
    'พื้นที่ป่าเต็งรังแห้งเสี่ยงไฟป่า'
  ),
  (
    '22222222-2222-4222-8222-222222222204',
    'ST-04',
    'เสาไมค์แม่แตง เหนืออ่างเก็บน้ำ',
    '11111111-1111-4111-8111-111111111102',
    18.1720,
    98.8380,
    350,
    'online',
    79,
    'ตรวจจับเสียงยานพาหนะเข้าออกพื้นที่วิกาล'
  ),
  (
    '22222222-2222-4222-8222-222222222205',
    'ST-05',
    'เสาไมค์คลองปลากั้ง เขาใหญ่',
    '11111111-1111-4111-8111-111111111103',
    14.4380,
    101.3820,
    450,
    'online',
    97,
    'ไมโครโฟนความไวสูงตรวจจับเสียงปืนและกับดัก'
  ),
  (
    '22222222-2222-4222-8222-222222222206',
    'ST-06',
    'เสาไมค์ซับฟ้าผ่า ห้วยขาแข้ง',
    '11111111-1111-4111-8111-111111111104',
    15.5510,
    99.2950,
    400,
    'maintenance',
    42,
    'รอทีมช่างเปลี่ยนแบตเตอรี่สำรองประจำไตรมาส'
  )
on conflict (station_code) do update set
  name = excluded.name,
  lat = excluded.lat,
  lng = excluded.lng,
  radius_meters = excluded.radius_meters,
  status = excluded.status;

-- 3. Notification Rules
insert into public.notification_rules (risk_level, action_description, channels, auto_dispatch)
values
  (
    'red',
    'แจ้งเตือนด่วนสูงสุดผ่าน Telegram ทันที พร้อมสร้างใบงานส่งเจ้าหน้าที่ชุดเคลื่อนที่เร็วเข้าตรวจสอบพื้นที่รอบเสาไมค์',
    array['telegram','sms','push'],
    true
  ),
  (
    'yellow',
    'แจ้งเตือนเฝ้าระวังผ่าน Telegram ไปยังเจ้าหน้าที่ประจำโซนเพื่อตรวจสอบสัญญาณเสียงซ้ำ',
    array['telegram','email'],
    false
  ),
  (
    'green',
    'บันทึกผลวิเคราะห์เสียงลงฐานข้อมูลเพื่อการวิเคราะห์แนวโน้มโดยไม่ส่งเสียงเตือนฉุกเฉิน',
    array[]::text[],
    false
  )
on conflict (risk_level) do update set
  action_description = excluded.action_description,
  channels = excluded.channels,
  auto_dispatch = excluded.auto_dispatch;
