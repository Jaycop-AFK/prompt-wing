-- แยกเวลารวมออกจากเวลาเคลื่อนไหว และเก็บบริบทของวิ่งอิสระ/ตั้งเป้า/โปรแกรม
alter table public.sessions
  add column if not exists moving_seconds numeric,
  add column if not exists best_pace_sec_per_km numeric,
  add column if not exists run_mode text not null default 'goal',
  add column if not exists program_name text,
  add column if not exists session_target jsonb;

update public.sessions
set moving_seconds = elapsed_seconds
where moving_seconds is null;

alter table public.sessions
  alter column moving_seconds set not null,
  add constraint sessions_moving_seconds_check
    check (moving_seconds >= 0 and moving_seconds <= elapsed_seconds),
  add constraint sessions_best_pace_check
    check (best_pace_sec_per_km is null or best_pace_sec_per_km >= 0),
  add constraint sessions_run_mode_check
    check (run_mode in ('free', 'goal', 'program')),
  add constraint sessions_program_name_check
    check (program_name is null or char_length(program_name) <= 80);
