import pg from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:fhqes6cwThgJEbi2@db.oigbuzijffxghwlbekwy.supabase.co:5432/postgres";

async function run() {
  console.log("Connecting to Supabase PostgreSQL at db.oigbuzijffxghwlbekwy.supabase.co...");
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected successfully!");

  try {
    console.log("1. Adding password_hash to profiles table if not exists...");
    await client.query(`
      alter table public.profiles
      add column if not exists password_hash text;
    `);

    console.log("2. Creating user_notifications table if not exists...");
    await client.query(`
      create table if not exists public.user_notifications (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references public.profiles(id) on delete cascade,
        title text not null,
        message text not null,
        type text not null default 'security_alert',
        is_read boolean not null default false,
        created_at timestamptz default now()
      );

      create index if not exists user_notifications_user_idx
      on public.user_notifications (user_id);
    `);

    console.log("3. Updating default password_hash for existing seed profiles...");
    // RakForest2026! default hash or fallback
    await client.query(`
      update public.profiles
      set password_hash = 'RakForest2026!'
      where password_hash is null;
    `);

    console.log("4. Enabling RLS and policies for user_notifications...");
    await client.query(`
      alter table public.user_notifications enable row level security;

      drop policy if exists "user_notifications_read_all" on public.user_notifications;
      create policy "user_notifications_read_all"
      on public.user_notifications for select
      using (true);

      drop policy if exists "user_notifications_modify_all" on public.user_notifications;
      create policy "user_notifications_modify_all"
      on public.user_notifications for all
      using (true)
      with check (true);
    `);

    console.log("Migration completed successfully!");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
