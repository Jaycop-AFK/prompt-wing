-- สคีมาของ พร้อมวิ่ง สำหรับ Supabase (Postgres)
-- วิธีใช้: เปิด Supabase Dashboard > SQL Editor > New query แล้ววางไฟล์นี้ทั้งหมด กด Run ครั้งเดียว
--
-- ทุกตารางเปิด Row Level Security (RLS) เสมอ เพราะ EXPO_PUBLIC_SUPABASE_ANON_KEY ที่ฝังในแอป
-- เป็น key สาธารณะที่ใครก็อ่านได้จากตัวแอป ตัวป้องกันข้อมูลจริงคือ policy ด้านล่างนี้เท่านั้น
-- ไม่ใช่การซ่อน key


-- ===== profiles: ข้อมูลตัวผู้ใช้ หนึ่งแถวต่อหนึ่งบัญชี =====

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  weight_kg numeric,
  height_cm numeric,
  age integer,
  sex text check (sex in ('male', 'female')),
  objective text not null default 'health'
    check (objective in ('loseWeight', 'health', 'marathon', 'endurance')),

  -- ช่องด้านล่างนี้เพิ่มใหม่สำหรับหาเพื่อนวิ่งของจริง (ตั๋ว 19 เดิมเป็นข้อมูลจำลอง)

  -- ชื่อที่ตั้งเองให้คนอื่นเห็นในหน้าหาเพื่อนวิ่ง ไม่ใช่อีเมล เพราะอีเมลเปิดเผยตัวตนจริงมากเกินไป
  -- สำหรับฟีเจอร์จับคู่คนแปลกหน้า null ได้ถ้ายังไม่ได้ตั้ง (แอปจะแสดงชื่อทั่วไปแทนแทน)
  display_name text,
  typical_pace_sec_per_km numeric,
  typical_run_time text,
  -- ต้องเปิดเองถึงจะถูกคนอื่นเห็นในหน้าหาเพื่อนวิ่ง ปิดไว้เป็นค่าเริ่มต้นเสมอ (opt-in ไม่ใช่ opt-out)
  visible_to_others boolean not null default false,
  -- อีเมลยืนยันแล้วจริงหรือยัง คัดลอกมาจาก auth.users.email_confirmed_at ผ่านทริกเกอร์ด้านล่าง
  -- เพราะตาราง auth.users เข้าถึงตรง ๆ จาก REST API ของไคลเอนต์ไม่ได้ (เป็น schema ที่สงวนไว้)
  email_confirmed boolean not null default false,

  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "อ่าน/แก้ไขโปรไฟล์ตัวเองได้เสมอ"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- หาเพื่อนวิ่งต้องอ่านโปรไฟล์ "คนอื่น" ที่เปิด visible_to_others ไว้ได้ด้วย (แยก policy อ่านต่างหาก
-- จาก policy ด้านบนซึ่งจำกัดแค่แถวของตัวเอง ไม่งั้นจะมองไม่เห็นใครเลยนอกจากตัวเอง)
create policy "เห็นโปรไฟล์คนอื่นที่เปิดให้มองเห็นได้"
  on public.profiles for select
  using (visible_to_others = true);

-- สร้างแถวโปรไฟล์ว่างให้อัตโนมัติทันทีที่มีผู้ใช้สมัครใหม่ ไม่งั้นแอปต้องมีขั้นตอนแยก "สร้างโปรไฟล์"
-- หลังสมัครเสร็จ ซึ่งถ้าขั้นตอนนั้นล้มเหลวจะเหลือผู้ใช้ที่ล็อกอินได้แต่ไม่มีโปรไฟล์เลย
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- คัดลอกสถานะยืนยันอีเมลมาไว้ใน profiles ทุกครั้งที่เปลี่ยนจาก "ยังไม่ยืนยัน" เป็น "ยืนยันแล้ว"
-- (เช่นตอนผู้ใช้กดลิงก์ในอีเมลยืนยันบัญชี) เพื่อให้หน้าหาเพื่อนวิ่งอ่านค่านี้ผ่านตาราง profiles ได้
-- โดยไม่ต้องเข้าถึง auth.users ตรง ๆ
create function public.handle_user_email_confirmed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.profiles set email_confirmed = true where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_confirmed
  after update on auth.users
  for each row execute function public.handle_user_email_confirmed();


-- ===== sessions: ประวัติการวิ่ง แทนที่ expo-sqlite เดิม =====

create table public.sessions (
  id bigint generated always as identity primary key,
  -- default เป็น auth.uid() เอง ฝั่งแอปไม่ต้องส่ง user_id มาเองตอน insert เลย with check ด้านล่าง
  -- ยังป้องกันไว้อยู่ดีถ้ามีใครพยายามส่ง user_id อื่นมาแทน
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  finished_at timestamptz not null,
  distance_km numeric not null,
  elapsed_seconds numeric not null,
  pace_sec_per_km numeric,
  calories integer not null,
  form_score jsonb not null,
  splits jsonb not null,
  route jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.sessions enable row level security;

create policy "เห็นและแก้ไขได้เฉพาะการวิ่งของตัวเอง"
  on public.sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ===== venue_favorites: ที่วิ่งที่บันทึกไว้ แทนที่ AsyncStorage เดิม =====

create table public.venue_favorites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  venue_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, venue_id)
);

alter table public.venue_favorites enable row level security;

create policy "เห็นและแก้ไขได้เฉพาะรายการที่บันทึกของตัวเอง"
  on public.venue_favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ===== race_events: ปฏิทินงานวิ่ง อ่านได้ทุกคน แก้ไขผ่าน Table Editor ของ Supabase เท่านั้น =====

create table public.race_events (
  id bigint generated always as identity primary key,
  name text not null,
  event_date timestamptz not null,
  distance_km numeric not null,
  province text not null,
  fee_thb integer not null
);

alter table public.race_events enable row level security;

create policy "ทุกคนอ่านปฏิทินงานวิ่งได้"
  on public.race_events for select
  using (true);

-- ข้อมูลตั้งต้นให้มีอะไรให้ดูตั้งแต่รันครั้งแรก ไม่ต้องรอมีคนกรอกก่อน (ชื่องานตั้งขึ้นเอง ไม่ใช่งานจริง
-- เหมือนกับตอนเป็นข้อมูลจำลอง แค่ตอนนี้เป็นแถวจริงในตารางจริงที่แก้ไขได้จริงผ่าน Table Editor)
insert into public.race_events (name, event_date, distance_km, province, fee_thb) values
  ('มินิมาราธอนเมืองปราจีน', '2026-09-27', 10, 'ปราจีนบุรี', 350),
  ('วิ่งการกุศลสวนหลวง', '2026-10-11', 5, 'กรุงเทพมหานคร', 250),
  ('ฮาล์ฟมาราธอนริมโขง', '2026-10-25', 21.1, 'นครพนม', 690),
  ('เทรลดอยเชียงดาว', '2026-11-08', 15, 'เชียงใหม่', 890),
  ('ไนท์รันขอนแก่น', '2026-11-21', 10, 'ขอนแก่น', 400),
  ('มาราธอนหาดจอมเทียน', '2026-12-13', 42.2, 'ชลบุรี', 1200);
