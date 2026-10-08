import { PROFILE_FIELD_RANGE, type BodyCompositionMethod, type Objective, type RunnerProfile, type Sex } from '@/core/coach';
import { supabase } from '@/services/supabase';
import { saveBodyMeasurement } from '@/storage/body-measurement-storage';

const OBJECTIVES: Objective[] = ['loseWeight', 'health', 'marathon', 'endurance'];
const SEXES: Sex[] = ['male', 'female'];
const BODY_METHODS: BodyCompositionMethod[] = ['circumference', 'bia'];

/** โปรไฟล์ของผู้ใช้ใหม่ที่ยังไม่ได้กรอกอะไรเลย เป้าหมายระยะยาวต้องมีค่าเสมอเพราะ DailyGoal ต้องใช้ */
export const EMPTY_PROFILE: RunnerProfile = {
  weightKg: null,
  heightCm: null,
  age: null,
  sex: null,
  bodyCompositionMethod: 'circumference',
  waistCm: null,
  neckCm: null,
  hipCm: null,
  bodyFatPercent: null,
  muscleMassKg: null,
  visceralFatLevel: null,
  bodyMeasuredAt: null,
  objective: 'health',
};

interface ProfileRow {
  weight_kg: number | null;
  height_cm: number | null;
  age: number | null;
  sex: string | null;
  body_composition_method?: string | null;
  waist_cm?: number | null;
  neck_cm?: number | null;
  hip_cm?: number | null;
  body_fat_percent?: number | null;
  muscle_mass_kg?: number | null;
  visceral_fat_level?: number | null;
  body_measured_at?: string | null;
  objective: string;
}

/** ตัวเลขที่อ่านจากฐานข้อมูลถ้าอยู่ในช่วงที่เป็นไปได้จริง ไม่งั้นคืน null */
function numberInRange(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value >= min && value <= max ? value : null;
}

/**
 * แปลงแถวที่อ่านจากฐานข้อมูลให้เป็นโปรไฟล์ที่ใช้งานได้เสมอ
 *
 * ตรวจทีละช่องแทนที่จะเชื่อว่าเป็นรูปร่างที่ถูกต้อง เผื่อ constraint ของตารางเปลี่ยนไปในอนาคต
 * หรือมีแถวที่หลงเหลือจากสคีมาเวอร์ชันเก่า ช่องที่อ่านไม่ได้จะกลายเป็นค่าว่างให้ผู้ใช้กรอกใหม่
 */
function rowToProfile(row: ProfileRow): RunnerProfile {
  return {
    weightKg: numberInRange(row.weight_kg, PROFILE_FIELD_RANGE.weightKg.min, PROFILE_FIELD_RANGE.weightKg.max),
    heightCm: numberInRange(row.height_cm, PROFILE_FIELD_RANGE.heightCm.min, PROFILE_FIELD_RANGE.heightCm.max),
    age: numberInRange(row.age, PROFILE_FIELD_RANGE.age.min, PROFILE_FIELD_RANGE.age.max),
    sex: SEXES.includes(row.sex as Sex) ? (row.sex as Sex) : null,
    bodyCompositionMethod: BODY_METHODS.includes(row.body_composition_method as BodyCompositionMethod)
      ? (row.body_composition_method as BodyCompositionMethod)
      : EMPTY_PROFILE.bodyCompositionMethod,
    waistCm: numberInRange(row.waist_cm, PROFILE_FIELD_RANGE.waistCm.min, PROFILE_FIELD_RANGE.waistCm.max),
    neckCm: numberInRange(row.neck_cm, PROFILE_FIELD_RANGE.neckCm.min, PROFILE_FIELD_RANGE.neckCm.max),
    hipCm: numberInRange(row.hip_cm, PROFILE_FIELD_RANGE.hipCm.min, PROFILE_FIELD_RANGE.hipCm.max),
    bodyFatPercent: numberInRange(row.body_fat_percent, PROFILE_FIELD_RANGE.bodyFatPercent.min, PROFILE_FIELD_RANGE.bodyFatPercent.max),
    muscleMassKg: numberInRange(row.muscle_mass_kg, PROFILE_FIELD_RANGE.muscleMassKg.min, PROFILE_FIELD_RANGE.muscleMassKg.max),
    visceralFatLevel: numberInRange(row.visceral_fat_level, PROFILE_FIELD_RANGE.visceralFatLevel.min, PROFILE_FIELD_RANGE.visceralFatLevel.max),
    bodyMeasuredAt:
      typeof row.body_measured_at === 'string' && Number.isFinite(Date.parse(row.body_measured_at))
        ? row.body_measured_at
        : null,
    objective: OBJECTIVES.includes(row.objective as Objective)
      ? (row.objective as Objective)
      : EMPTY_PROFILE.objective,
  };
}

/**
 * โปรไฟล์ที่บันทึกไว้ของผู้ใช้ที่ล็อกอินอยู่ คืนค่าว่างเมื่ออ่านไม่ได้
 *
 * ปกติจะเจอแถวเสมอ เพราะทริกเกอร์ on_auth_user_created ใน supabase/schema.sql สร้างแถวโปรไฟล์
 * ว่างให้อัตโนมัติทันทีที่สมัครสมาชิก แต่ยังกันไว้เผื่อแถวหายไปด้วยเหตุผลอื่น ไม่ให้จอโปรไฟล์พังทั้งจอ
 */
export async function loadProfile(): Promise<RunnerProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('weight_kg, height_cm, age, sex, objective, body_composition_method, waist_cm, neck_cm, hip_cm, body_fat_percent, muscle_mass_kg, visceral_fat_level, body_measured_at')
    .maybeSingle();

  if (error || !data) return EMPTY_PROFILE;
  return rowToProfile(data);
}

/** บันทึกโปรไฟล์ทับของเดิม เฉพาะช่องข้อมูลร่างกาย ไม่แตะช่องหาเพื่อนวิ่ง (ดู run-preferences-storage.ts)
 *
 * ใช้ getSession() (อ่านจากเครื่อง ไม่ยิงเน็ต) ไม่ใช่ getUser() (ยืนยันกับเซิร์ฟเวอร์ทุกครั้ง) เพราะ
 * .eq('id', ...) เป็นแค่ตัวกรองให้ query ตรงเป้าเร็วขึ้น ตัวป้องกันจริงคือ RLS policy ที่ auth.uid()
 * ต้องตรงกับ id อยู่แล้วไม่ว่าจะส่ง id ผิดมาหรือไม่
 */
export async function saveProfile(profile: RunnerProfile): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  const { data, error } = await supabase
    .from('profiles')
    .update({
      weight_kg: profile.weightKg,
      height_cm: profile.heightCm,
      age: profile.age,
      sex: profile.sex,
      body_composition_method: profile.bodyCompositionMethod,
      waist_cm: profile.waistCm,
      neck_cm: profile.neckCm,
      hip_cm: profile.hipCm,
      body_fat_percent: profile.bodyFatPercent,
      muscle_mass_kg: profile.muscleMassKg,
      visceral_fat_level: profile.visceralFatLevel,
      body_measured_at: profile.bodyMeasuredAt,
      objective: profile.objective,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.user.id)
    .select('id')
    .single();

  if (error || !data) throw error ?? new Error('ไม่พบโปรไฟล์สำหรับบันทึก');
  await saveBodyMeasurement(profile);
}
