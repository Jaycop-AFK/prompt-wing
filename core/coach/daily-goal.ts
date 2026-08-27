import type { DailyGoal, EpochMillis, Objective, RunHistoryEntry } from './types';

/**
 * ค่าคงที่ของแต่ละเป้าหมายระยะยาว
 *
 * ตัวเลขเป็นค่าเริ่มต้นที่ปลอดภัยสำหรับ prototype ไม่ได้อ้างอิงหลักโภชนาการหรือ
 * สรีรวิทยาที่แม่นยำ เป้าหมายคือให้แต่ละ Objective ให้ผลต่างกันจริงและไม่สูงเกินจริง
 */
const LOSE_WEIGHT_DAILY_KM = 4;

/**
 * ตั๋วนี้บอกว่าเป้าหมายสุขภาพควรเป็น "สามวันต่อสัปดาห์ระยะสั้นคงที่" แต่ DailyGoal
 * ตามที่ CONTEXT.md นิยามไว้มีแค่ตัวเลขระยะทางของวันนี้วันเดียว ไม่มีที่เก็บความถี่รายสัปดาห์
 * จึงยังทำไม่ได้ตามตัวอักษร ตอนนี้คืนระยะทางคงที่ทุกวันแทน ความถี่สามวันต่อสัปดาห์ต้องรอ
 * แนวคิดตารางซ้อมรายสัปดาห์ซึ่งยังไม่มีในสเปกปัจจุบัน
 */
const HEALTH_DAILY_KM = 3;

const MARATHON_DEFAULT_DAILY_KM = 5;
/** สมมติฐานความถี่ซ้อมมาราธอนทั่วไป ใช้แปลงเป้าหมายรายสัปดาห์เป็นรายวัน */
const MARATHON_RUNS_PER_WEEK = 4;
/** ห้ามเพิ่มระยะเกิน 10% ต่อสัปดาห์ตามหลักป้องกันบาดเจ็บจากการเพิ่มภาระเร็วเกินไป */
const MARATHON_MAX_WEEKLY_GROWTH = 1.1;

const ENDURANCE_HEAVY_KM = 6;
// ตั้งใจไม่ให้เท่ากับ HEALTH_DAILY_KM แม้ตัวเลขจะใกล้กัน เพื่อให้แยกแยะได้ว่ามาจากเป้าหมายไหน
const ENDURANCE_LIGHT_KM = 3.5;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function recentWeek(history: RunHistoryEntry[], now: EpochMillis): RunHistoryEntry[] {
  return history.filter((entry) => entry.at <= now && entry.at > now - SEVEN_DAYS_MS);
}

/**
 * มาราธอน เอาระยะรวมของเจ็ดวันล่าสุดมาเพิ่ม 10% แล้วหารด้วยความถี่ซ้อมสมมติ
 * ไม่มีประวัติเลยได้ค่าเริ่มต้นที่ปลอดภัย ไม่ใช่พยายามคำนวณจากฐานว่างเปล่า
 */
function marathonDailyGoal(history: RunHistoryEntry[], now: EpochMillis): number {
  const recent = recentWeek(history, now);
  if (recent.length === 0) return MARATHON_DEFAULT_DAILY_KM;

  const weeklyTotal = recent.reduce((sum, entry) => sum + entry.distanceKm, 0);
  return (weeklyTotal * MARATHON_MAX_WEEKLY_GROWTH) / MARATHON_RUNS_PER_WEEK;
}

/**
 * เพิ่มความอึด สลับวันหนักกับวันเบา นับจากจำนวนครั้งที่วิ่งมาแล้วทั้งหมด
 * ไม่มีประวัติเลยเริ่มด้วยวันเบาก่อนเสมอ เพื่อให้ผู้ใช้ใหม่ไม่เจอวันหนักเป็นครั้งแรก
 */
function enduranceDailyGoal(history: RunHistoryEntry[]): number {
  const isHeavyDay = history.length % 2 === 1;
  return isHeavyDay ? ENDURANCE_HEAVY_KM : ENDURANCE_LIGHT_KM;
}

export interface ComputeDailyGoalInput {
  objective: Objective;
  /** ประวัติการวิ่งของผู้ใช้ ไม่ต้องเรียงลำดับ */
  history: RunHistoryEntry[];
  now: EpochMillis;
}

/**
 * เป้าหมายรายวันจากเป้าหมายระยะยาวที่ผู้ใช้เลือกไว้
 *
 * ฟังก์ชันนี้ไม่อ่านนาฬิกาเอง เวลาปัจจุบันต้องส่งเข้ามาทาง now เสมอ เหมือนโมดูลอื่นในไฟล์นี้
 */
export function computeDailyGoal({ objective, history, now }: ComputeDailyGoalInput): DailyGoal {
  switch (objective) {
    case 'loseWeight':
      return { distanceKm: LOSE_WEIGHT_DAILY_KM };
    case 'health':
      return { distanceKm: HEALTH_DAILY_KM };
    case 'marathon':
      return { distanceKm: marathonDailyGoal(history, now) };
    case 'endurance':
      return { distanceKm: enduranceDailyGoal(history) };
  }
}
