import { PROFILE_FIELD_RANGE, type Objective, type RunnerProfile, type Sex } from '@/core/coach';
import { supabase } from '@/services/supabase';

const OBJECTIVES: Objective[] = ['loseWeight', 'health', 'marathon', 'endurance'];
const SEXES: Sex[] = ['male', 'female'];

/** โปรไฟล์ของผู้ใช้ใหม่ที่ยังไม่ได้กรอกอะไรเลย เป้าหมายระยะยาวต้องมีค่าเสมอเพราะ DailyGoal ต้องใช้ */
export const EMPTY_PROFILE: RunnerProfile = {
  weightKg: null,
  heightCm: null,
  age: null,
  sex: null,
  objective: 'health',
};

interface ProfileRow {
  weight_kg: number | null;
  height_cm: number | null;
  age: number | null;
  sex: string | null;
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
    .select('weight_kg, height_cm, age, sex, objective')
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

  const { error } = await supabase
    .from('profiles')
    .update({
      weight_kg: profile.weightKg,
      height_cm: profile.heightCm,
      age: profile.age,
      sex: profile.sex,
      objective: profile.objective,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.user.id);

  if (error) throw error;
}
