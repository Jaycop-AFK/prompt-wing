import { calculateBmi, calculateNavyBodyFat, type RunnerProfile } from '@/core/coach';
import { supabase } from '@/services/supabase';

export interface BodyMeasurementHistoryEntry {
  measuredOn: string;
  bmi: number | null;
  bodyFatPercent: number | null;
}

function localDateKey(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function saveBodyMeasurement(profile: RunnerProfile): Promise<void> {
  if (!profile.bodyMeasuredAt) return;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('ไม่พบเซสชันสำหรับบันทึกข้อมูลร่างกาย');

  const navyBodyFat = calculateNavyBodyFat({
    sex: profile.sex,
    heightCm: profile.heightCm,
    waistCm: profile.waistCm,
    neckCm: profile.neckCm,
    hipCm: profile.hipCm,
  });
  const bodyFatPercent =
    profile.bodyCompositionMethod === 'bia' ? profile.bodyFatPercent : navyBodyFat;

  const { error } = await supabase.from('body_measurements').upsert(
    {
      user_id: session.user.id,
      measured_on: localDateKey(profile.bodyMeasuredAt),
      measured_at: profile.bodyMeasuredAt,
      weight_kg: profile.weightKg,
      bmi: calculateBmi(profile.weightKg, profile.heightCm),
      body_fat_percent: bodyFatPercent,
      muscle_mass_kg: profile.muscleMassKg,
      visceral_fat_level: profile.visceralFatLevel,
    },
    { onConflict: 'user_id,measured_on' }
  );
  if (error) throw error;
}

export async function loadBodyMeasurementHistory(): Promise<BodyMeasurementHistoryEntry[]> {
  const { data, error } = await supabase
    .from('body_measurements')
    .select('measured_on, bmi, body_fat_percent')
    .order('measured_on', { ascending: false })
    .limit(30);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    measuredOn: String(row.measured_on),
    bmi: typeof row.bmi === 'number' ? row.bmi : null,
    bodyFatPercent: typeof row.body_fat_percent === 'number' ? row.body_fat_percent : null,
  })).reverse();
}
