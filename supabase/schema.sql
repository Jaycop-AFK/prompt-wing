-- สคีมาของ พร้อมวิ่ง สำหรับ Supabase (Postgres)
-- ใช้ supabase db push เพื่อ deploy migration ใน supabase/migrations แทนการวางไฟล์นี้ซ้ำด้วยมือ

create schema if not exists private;

-- ข้อมูลร่างกายเป็นข้อมูลส่วนตัว อ่าน/แก้ได้เฉพาะเจ้าของ
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  weight_kg numeric check (weight_kg is null or weight_kg between 20 and 300),
  height_cm numeric check (height_cm is null or height_cm between 80 and 250),
  age integer check (age is null or age between 5 and 120),
  sex text check (sex in ('male', 'female')),
  body_composition_method text not null default 'circumference'
    check (body_composition_method in ('circumference', 'bia')),
  waist_cm numeric check (waist_cm is null or waist_cm between 40 and 250),
  neck_cm numeric check (neck_cm is null or neck_cm between 20 and 80),
  hip_cm numeric check (hip_cm is null or hip_cm between 50 and 250),
  body_fat_percent numeric check (body_fat_percent is null or body_fat_percent between 2 and 70),
  muscle_mass_kg numeric check (muscle_mass_kg is null or muscle_mass_kg between 5 and 150),
  visceral_fat_level numeric check (visceral_fat_level is null or visceral_fat_level between 1 and 30),
  body_measured_at timestamptz,
  objective text not null default 'health'
    check (objective in ('loseWeight', 'health', 'marathon', 'endurance')),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "อ่านโปรไฟล์ส่วนตัวของตัวเอง" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "แก้โปรไฟล์ส่วนตัวของตัวเอง" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create table public.body_measurements (
  user_id uuid not null references auth.users (id) on delete cascade,
  measured_on date not null,
  measured_at timestamptz not null,
  weight_kg numeric check (weight_kg is null or weight_kg between 20 and 300),
  bmi numeric check (bmi is null or bmi between 5 and 100),
  body_fat_percent numeric check (body_fat_percent is null or body_fat_percent between 2 and 70),
  muscle_mass_kg numeric check (muscle_mass_kg is null or muscle_mass_kg between 5 and 150),
  visceral_fat_level numeric check (visceral_fat_level is null or visceral_fat_level between 1 and 30),
  primary key (user_id, measured_on)
);
alter table public.body_measurements enable row level security;
create policy "จัดการประวัติร่างกายของตัวเอง" on public.body_measurements for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- แยกข้อมูลที่ยอมให้คนอื่นเห็นออกจากข้อมูลร่างกาย เพื่อไม่ให้ RLS เปิดเผยทั้งแถวของ profiles
create table public.runner_directory (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 80),
  typical_pace_sec_per_km numeric
    check (typical_pace_sec_per_km is null or typical_pace_sec_per_km between 120 and 1800),
  typical_run_time text check (typical_run_time is null or char_length(typical_run_time) <= 80),
  visible_to_others boolean not null default false,
  email_confirmed boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.runner_directory enable row level security;
create policy "อ่านข้อมูลหาเพื่อนของตัวเอง" on public.runner_directory for select to authenticated
  using ((select auth.uid()) = id);
create policy "อ่านคนที่เปิดให้มองเห็น" on public.runner_directory for select to authenticated
  using (visible_to_others = true);
create policy "แก้ข้อมูลหาเพื่อนของตัวเอง" on public.runner_directory for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- ฟังก์ชันทริกเกอร์อยู่ใน schema ที่ไม่เปิดผ่าน Data API และไม่ให้ client เรียกตรง ๆ
create function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.runner_directory (id, email_confirmed)
  values (new.id, new.email_confirmed_at is not null);
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

create function private.handle_user_email_confirmed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is distinct from old.email_confirmed_at then
    update public.runner_directory
      set email_confirmed = new.email_confirmed_at is not null, updated_at = now()
      where id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.handle_user_email_confirmed() from public, anon, authenticated;
create trigger on_auth_user_email_confirmed after update on auth.users
  for each row execute function private.handle_user_email_confirmed();

-- บัญชีที่สมัครก่อน deploy schema ต้องมีแถวเหมือนบัญชีใหม่ด้วย
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;
insert into public.runner_directory (id, email_confirmed)
  select id, email_confirmed_at is not null from auth.users on conflict (id) do nothing;

create table public.sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  finished_at timestamptz not null,
  distance_km numeric not null check (distance_km >= 0),
  elapsed_seconds numeric not null check (elapsed_seconds >= 0),
  moving_seconds numeric not null check (moving_seconds >= 0 and moving_seconds <= elapsed_seconds),
  pace_sec_per_km numeric check (pace_sec_per_km is null or pace_sec_per_km >= 0),
  best_pace_sec_per_km numeric check (best_pace_sec_per_km is null or best_pace_sec_per_km >= 0),
  run_mode text not null default 'free' check (run_mode in ('free', 'goal', 'program')),
  program_name text check (program_name is null or char_length(program_name) <= 80),
  session_target jsonb,
  calories integer not null check (calories >= 0),
  form_score jsonb not null,
  splits jsonb not null,
  route jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.sessions enable row level security;
create policy "จัดการได้เฉพาะการวิ่งของตัวเอง" on public.sessions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create index sessions_user_finished_at_idx on public.sessions (user_id, finished_at desc);

create table public.venue_favorites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  venue_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, venue_id)
);
alter table public.venue_favorites enable row level security;
create policy "จัดการได้เฉพาะที่วิ่งที่ตัวเองบันทึก" on public.venue_favorites for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table public.race_events (
  id bigint generated always as identity primary key,
  name text not null,
  event_date timestamptz not null,
  distance_km numeric not null check (distance_km > 0),
  province text not null,
  fee_thb integer not null check (fee_thb >= 0)
);
alter table public.race_events enable row level security;
create policy "ทุกคนอ่านปฏิทินงานวิ่งได้" on public.race_events for select to anon, authenticated
  using (true);

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.body_measurements to authenticated;
grant select, update on public.runner_directory to authenticated;
grant select, insert, update, delete on public.sessions to authenticated;
grant usage, select on sequence public.sessions_id_seq to authenticated;
grant select, insert, update, delete on public.venue_favorites to authenticated;
grant select on public.race_events to anon, authenticated;

insert into public.race_events (name, event_date, distance_km, province, fee_thb) values
  ('มินิมาราธอนเมืองปราจีน', '2026-09-27', 10, 'ปราจีนบุรี', 350),
  ('วิ่งการกุศลสวนหลวง', '2026-10-11', 5, 'กรุงเทพมหานคร', 250),
  ('ฮาล์ฟมาราธอนริมโขง', '2026-10-25', 21.1, 'นครพนม', 690),
  ('เทรลดอยเชียงดาว', '2026-11-08', 15, 'เชียงใหม่', 890),
  ('ไนท์รันขอนแก่น', '2026-11-21', 10, 'ขอนแก่น', 400),
  ('มาราธอนหาดจอมเทียน', '2026-12-13', 42.2, 'ชลบุรี', 1200);
