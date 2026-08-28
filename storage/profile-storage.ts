import AsyncStorage from '@react-native-async-storage/async-storage';

import { PROFILE_FIELD_RANGE, type Objective, type RunnerProfile, type Sex } from '@/core/coach';

const STORAGE_KEY = 'promptwing.profile';

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

/** ตัวเลขที่อ่านจากที่เก็บถ้าอยู่ในช่วงที่เป็นไปได้จริง ไม่งั้นคืน null */
function numberInRange(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value >= min && value <= max ? value : null;
}

/**
 * แปลงสิ่งที่อ่านได้จากที่เก็บให้เป็นโปรไฟล์ที่ใช้งานได้เสมอ
 *
 * ตรวจทีละช่องแทนที่จะเชื่อว่าเป็นรูปร่างที่ถูกต้อง เพราะข้อมูลที่เก็บไว้อาจมาจากแอปเวอร์ชันเก่า
 * ที่มีโครงสร้างต่างไป หรือถูกแก้จนเพี้ยน ถ้าเชื่อทั้งก้อนแล้วรูปร่างไม่ตรง จอโปรไฟล์จะพังทั้งจอ
 * ช่องที่อ่านไม่ได้จะกลายเป็นค่าว่างให้ผู้ใช้กรอกใหม่ ดีกว่าทำให้แอปเปิดไม่ขึ้น
 */
function parseProfile(raw: string): RunnerProfile {
  const stored: unknown = JSON.parse(raw);
  if (typeof stored !== 'object' || stored === null) return EMPTY_PROFILE;

  const value = stored as Record<string, unknown>;
  const objective = value.objective;
  const sex = value.sex;

  return {
    weightKg: numberInRange(value.weightKg, PROFILE_FIELD_RANGE.weightKg.min, PROFILE_FIELD_RANGE.weightKg.max),
    heightCm: numberInRange(value.heightCm, PROFILE_FIELD_RANGE.heightCm.min, PROFILE_FIELD_RANGE.heightCm.max),
    age: numberInRange(value.age, PROFILE_FIELD_RANGE.age.min, PROFILE_FIELD_RANGE.age.max),
    sex: SEXES.includes(sex as Sex) ? (sex as Sex) : null,
    objective: OBJECTIVES.includes(objective as Objective)
      ? (objective as Objective)
      : EMPTY_PROFILE.objective,
  };
}

/** โปรไฟล์ที่บันทึกไว้ คืนค่าว่างเมื่อยังไม่เคยกรอกหรืออ่านไม่ได้ */
export async function loadProfile(): Promise<RunnerProfile> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw === null ? EMPTY_PROFILE : parseProfile(raw);
  } catch {
    return EMPTY_PROFILE;
  }
}

/** บันทึกโปรไฟล์ทับของเดิมทั้งก้อน */
export async function saveProfile(profile: RunnerProfile): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}
