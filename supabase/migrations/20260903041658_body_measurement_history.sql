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

create policy "จัดการประวัติร่างกายของตัวเอง"
  on public.body_measurements for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.body_measurements to authenticated;
