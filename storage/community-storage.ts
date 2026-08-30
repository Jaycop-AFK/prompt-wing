import type { MyRunVisibility, RaceEvent, RunBuddy } from '@/services/community';
import { supabase } from '@/services/supabase';

interface RaceEventRow {
  id: number;
  name: string;
  event_date: string;
  distance_km: number;
  province: string;
  fee_thb: number;
}

/** ปฏิทินงานวิ่งทั้งหมด เรียงจากวันที่ใกล้ที่สุดก่อน อ่านได้ทุกคนไม่ว่าจะล็อกอินหรือไม่ */
export async function listRaceEvents(): Promise<RaceEvent[]> {
  const { data, error } = await supabase
    .from('race_events')
    .select('*')
    .order('event_date', { ascending: true });

  if (error || !data) return [];

  return (data as RaceEventRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    dateAt: new Date(row.event_date).getTime(),
    distanceKm: row.distance_km,
    province: row.province,
    feeThb: row.fee_thb,
  }));
}

interface ProfileMatchRow {
  id: string;
  display_name: string | null;
  typical_pace_sec_per_km: number | null;
  typical_run_time: string | null;
  email_confirmed: boolean;
}

/**
 * คนอื่นที่เปิดให้มองเห็นและกรอก pace ของตัวเองไว้แล้ว เรียงจาก pace ใกล้เคียงของฉันเองไปหาไกล
 * ถ้าฉันยังไม่ได้กรอก pace ของตัวเอง (myPaceSecPerKm เป็น null) เรียงตามชื่อแทน เพราะไม่มีอะไรให้
 * เทียบระยะห่างได้อย่างมีความหมาย
 */
export async function listRunBuddies(myPaceSecPerKm: number | null): Promise<RunBuddy[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, typical_pace_sec_per_km, typical_run_time, email_confirmed')
    .eq('visible_to_others', true)
    .not('typical_pace_sec_per_km', 'is', null)
    .neq('id', session.user.id);

  if (error || !data) return [];

  const buddies: RunBuddy[] = (data as ProfileMatchRow[]).map((row) => ({
    id: row.id,
    displayName: row.display_name?.trim() ? row.display_name : `นักวิ่ง ${row.id.slice(0, 4)}`,
    paceSecPerKm: row.typical_pace_sec_per_km as number,
    runTime: row.typical_run_time ?? 'ยังไม่ได้ระบุเวลาที่มักวิ่ง',
    emailConfirmed: row.email_confirmed,
  }));

  if (myPaceSecPerKm === null) {
    return buddies.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  return buddies.sort(
    (a, b) => Math.abs(a.paceSecPerKm - myPaceSecPerKm) - Math.abs(b.paceSecPerKm - myPaceSecPerKm)
  );
}

const EMPTY_VISIBILITY: MyRunVisibility = {
  displayName: null,
  typicalPaceSecPerKm: null,
  typicalRunTime: null,
  visibleToOthers: false,
};

/** การตั้งค่าหาเพื่อนวิ่งของตัวเอง คืนค่าว่างเมื่ออ่านไม่ได้ */
export async function loadMyRunVisibility(): Promise<MyRunVisibility> {
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, typical_pace_sec_per_km, typical_run_time, visible_to_others')
    .maybeSingle();

  if (error || !data) return EMPTY_VISIBILITY;

  return {
    displayName: data.display_name,
    typicalPaceSecPerKm: data.typical_pace_sec_per_km,
    typicalRunTime: data.typical_run_time,
    visibleToOthers: data.visible_to_others,
  };
}

export async function saveMyRunVisibility(visibility: MyRunVisibility): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: visibility.displayName,
      typical_pace_sec_per_km: visibility.typicalPaceSecPerKm,
      typical_run_time: visibility.typicalRunTime,
      visible_to_others: visibility.visibleToOthers,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.user.id);

  if (error) throw error;
}
