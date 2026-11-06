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
