import type { NewSessionRecord, SessionRecord } from '@/services/session-record';
import { supabase } from '@/services/supabase';

// ส่งต่อชนิดข้อมูลให้จอที่ import จากไฟล์นี้อยู่แล้วใช้ต่อได้เหมือนเดิม ตัวนิยามจริงอยู่ใน services/
export type { NewSessionRecord, SessionRecord };

interface SessionRow {
  id: number;
  finished_at: string;
  distance_km: number;
  elapsed_seconds: number;
  moving_seconds?: number | null;
  pace_sec_per_km: number | null;
  best_pace_sec_per_km?: number | null;
  run_mode?: SessionRecord['runMode'] | null;
  program_name?: string | null;
  session_target?: SessionRecord['sessionTarget'];
  calories: number;
  form_score: SessionRecord['formScore'];
  splits: SessionRecord['splits'];
  route: SessionRecord['route'];
}

function rowToRecord(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    finishedAt: new Date(row.finished_at).getTime(),
    distanceKm: row.distance_km,
    elapsedSeconds: row.elapsed_seconds,
    movingSeconds: row.moving_seconds ?? row.elapsed_seconds,
    paceSecPerKm: row.pace_sec_per_km,
    bestPaceSecPerKm: row.best_pace_sec_per_km ?? null,
    runMode: row.run_mode ?? 'goal',
    programName: row.program_name ?? null,
    sessionTarget: row.session_target ?? null,
    calories: row.calories,
    formScore: row.form_score,
    splits: row.splits,
    route: row.route,
  };
}

/** บันทึก Session ที่เพิ่งจบ คืน id แถวที่เพิ่งสร้าง เรียกก่อนพาไปหน้าสรุปเสมอ
 *
 * ไม่ส่ง user_id มาเอง เพราะคอลัมน์นี้ตั้ง default เป็น auth.uid() ไว้แล้วที่ฝั่งฐานข้อมูล
 * (ดู supabase/schema.sql) การวิ่งจะบันทึกไม่ได้เลยถ้าไม่มี session ที่ล็อกอินอยู่ ซึ่งเป็นไปไม่ได้
 * อยู่แล้วในทางปฏิบัติ เพราะจอนี้ไปถึงได้ก็ต่อเมื่อผ่าน Stack.Protected ของ app/_layout.tsx มาแล้ว
 */
export async function saveSession(record: NewSessionRecord): Promise<number> {
  const baseRow = {
    finished_at: new Date(record.finishedAt).toISOString(),
    distance_km: record.distanceKm,
    elapsed_seconds: record.elapsedSeconds,
    pace_sec_per_km: record.paceSecPerKm,
    calories: record.calories,
    form_score: record.formScore,
    splits: record.splits,
    route: record.route,
  };
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      ...baseRow,
      moving_seconds: record.movingSeconds,
      best_pace_sec_per_km: record.bestPaceSecPerKm,
      run_mode: record.runMode,
      program_name: record.programName,
      session_target: record.sessionTarget,
    })
    .select('id')
    .single();

  if (!error) return data.id;

  // ช่วงที่ migration ใหม่ยังไม่ถูก deploy ให้บันทึกลง schema เดิมได้ก่อน ไม่ทำข้อมูลการวิ่งหาย
  // โดยเก็บ moving time ใน elapsed_seconds เหมือนเวอร์ชันก่อนหน้า แล้ว summary จะ fallback เป็นค่าเดียวกัน
  const missingNewColumn = error.code === 'PGRST204' || error.code === '42703';
  if (!missingNewColumn) throw error;
  const fallback = await supabase
    .from('sessions')
    .insert({ ...baseRow, elapsed_seconds: record.movingSeconds })
    .select('id')
    .single();
  if (fallback.error) throw fallback.error;
  return fallback.data.id;
}

/** Session เดียวตาม id null ถ้าไม่พบ (เช่น id ผิด ถูกลบไปแล้ว หรือเป็นของผู้ใช้อื่นที่ RLS กันไว้) */
export async function getSession(id: number): Promise<SessionRecord | null> {
  const { data, error } = await supabase.from('sessions').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? rowToRecord(data as SessionRow) : null;
}

/** Session ทั้งหมดของผู้ใช้ที่ล็อกอินอยู่ (RLS กรองให้เองแล้ว) เรียงจากล่าสุดไปเก่าสุด */
export async function listSessions(): Promise<SessionRecord[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('finished_at', { ascending: false });

  if (error) throw error;
  return (data as SessionRow[]).map(rowToRecord);
}
