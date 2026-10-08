alter table public.profiles
  add column if not exists body_composition_method text not null default 'circumference'
    check (body_composition_method in ('circumference', 'bia')),
  add column if not exists waist_cm numeric check (waist_cm is null or waist_cm between 40 and 250),
  add column if not exists neck_cm numeric check (neck_cm is null or neck_cm between 20 and 80),
  add column if not exists hip_cm numeric check (hip_cm is null or hip_cm between 50 and 250),
  add column if not exists body_fat_percent numeric check (body_fat_percent is null or body_fat_percent between 2 and 70),
  add column if not exists muscle_mass_kg numeric check (muscle_mass_kg is null or muscle_mass_kg between 5 and 150),
  add column if not exists visceral_fat_level numeric check (visceral_fat_level is null or visceral_fat_level between 1 and 30);
