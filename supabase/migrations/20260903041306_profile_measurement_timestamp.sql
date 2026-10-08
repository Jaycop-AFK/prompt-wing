alter table public.profiles
  add column if not exists body_measured_at timestamptz;

-- ให้ข้อจำกัดฐานข้อมูลตรงกับ validation กลางของแอป ป้องกันหน้าจอรับค่าได้แต่บันทึกถูกปฏิเสธ
alter table public.profiles
  drop constraint if exists profiles_height_cm_check,
  drop constraint if exists profiles_age_check;

alter table public.profiles
  add constraint profiles_height_cm_check
    check (height_cm is null or height_cm between 80 and 250),
  add constraint profiles_age_check
    check (age is null or age between 5 and 120);
