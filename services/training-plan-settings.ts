import {
  isValidRunDays,
  type EpochMillis,
  type PlanGoal,
  type TrainingPlanSettings,
} from '@/core/coach';

/**
 * การตั้งค่าแผนซ้อมที่เก็บในบัญชี
 *
 * เก็บใน user_metadata ของบัญชี Supabase คู่กับแพ็กเกจสมาชิก (ดู docs/adr/0006) จึงตามผู้ใช้ไปทุกเครื่อง
 * ไฟล์นี้แปลงไปมาระหว่างรูปที่เก็บกับชนิดข้อมูลของแผนซ้อมเท่านั้น ไม่รู้จัก Supabase
 */

export const TRAINING_PLAN_METADATA_KEY = 'training_plan';

export interface TrainingPlanMetadata {
  goal: PlanGoal;
  run_days: number[];
  /** "HH:MM" แบบ 24 ชั่วโมง */
  preferred_time: string;
  started_at: string;
}

const MINUTES_PER_DAY = 24 * 60;

/** นาทีนับจากเที่ยงคืนเป็น "HH:MM" */
export function formatMinuteOfDay(minuteOfDay: number): string {
  const normalized = ((Math.round(minuteOfDay) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = String(Math.floor(normalized / 60)).padStart(2, '0');
  const minutes = String(normalized % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** "HH:MM" เป็นนาทีนับจากเที่ยงคืน null เมื่อรูปแบบหรือค่าไม่ถูก */
export function parseMinuteOfDay(text: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * อ่านแผนซ้อมจาก user_metadata ของบัญชี null เมื่อยังไม่ได้ตั้งแผนหรือข้อมูลใช้ไม่ได้
 *
 * ข้อมูลที่ใช้ไม่ได้ถือว่ายังไม่มีแผน ให้ผู้ใช้ตั้งใหม่ ดีกว่าเดาค่าที่อาจพาไปซ้อมผิดระดับ
 */
export function trainingPlanFromMetadata(
  metadata: Readonly<Record<string, unknown>> | null | undefined
): TrainingPlanSettings | null {
  const raw = metadata?.[TRAINING_PLAN_METADATA_KEY];
  if (typeof raw !== 'object' || raw === null) return null;

  const { goal, run_days: runDays, preferred_time: preferredTime, started_at: startedAt } =
    raw as Record<string, unknown>;
  if (goal !== '5k' && goal !== '10k') return null;
  if (!Array.isArray(runDays) || !isValidRunDays(runDays)) return null;

  const preferredMinuteOfDay = typeof preferredTime === 'string' ? parseMinuteOfDay(preferredTime) : null;
  const started: EpochMillis = typeof startedAt === 'string' ? Date.parse(startedAt) : Number.NaN;
  if (preferredMinuteOfDay === null || !Number.isFinite(started)) return null;

  return {
    goal,
    runDays: [...runDays].sort((a, b) => a - b),
    preferredMinuteOfDay,
    startedAt: started,
  };
}

export function trainingPlanToMetadata(settings: TrainingPlanSettings): TrainingPlanMetadata {
  return {
    goal: settings.goal,
    run_days: [...settings.runDays].sort((a, b) => a - b),
    preferred_time: formatMinuteOfDay(settings.preferredMinuteOfDay),
    started_at: new Date(settings.startedAt).toISOString(),
  };
}
