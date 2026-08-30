import type { NewSessionRecord, SessionRecord } from '@/services/session-record';
import { supabase } from '@/services/supabase';

// ส่งต่อชนิดข้อมูลให้จอที่ import จากไฟล์นี้อยู่แล้วใช้ต่อได้เหมือนเดิม ตัวนิยามจริงอยู่ใน services/
export type { NewSessionRecord, SessionRecord };

interface SessionRow {
  id: number;
  finished_at: string;
  distance_km: number;
  elapsed_seconds: number;
  pace_sec_per_km: number | null;
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
    paceSecPerKm: row.pace_sec_per_km,
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
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      finished_at: new Date(record.finishedAt).toISOString(),
      distance_km: record.distanceKm,
      elapsed_seconds: record.elapsedSeconds,
      pace_sec_per_km: record.paceSecPerKm,
      calories: record.calories,
      form_score: record.formScore,
      splits: record.splits,
      route: record.route,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
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
