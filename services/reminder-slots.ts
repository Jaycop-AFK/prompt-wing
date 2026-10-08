/**
 * เวลาเตือนซ้อมรายสัปดาห์ แยกจาก services/plan-reminders.ts ที่เรียก expo-notifications
 * เพื่อให้เทสต์เรื่องข้ามเที่ยงคืนได้โดยไม่ต้องโหลดโมดูล native
 */

export interface WeeklySlot {
  /** วันในสัปดาห์ตามแบบของ expo-notifications: 1 ถึง 7 โดย 1 คือวันอาทิตย์ ไม่ใช่ Date.getDay() */
  weekday: number;
  hour: number;
  minute: number;
}

const MINUTES_PER_DAY = 24 * 60;

/**
 * เวลาเตือนของทุกวันซ้อม ก่อนเวลาซ้อม leadMinutes นาที
 *
 * ถ้าเวลาซ้อมเช้ามากจนเวลาเตือนย้อนไปก่อนเที่ยงคืน ต้องเตือนในคืนของวันก่อนหน้า ไม่ใช่คืนของวันซ้อมเอง
 * ซึ่งจะเตือนหลังซ้อมไปเกือบหนึ่งวัน
 */
export function reminderSlots(
  runDays: readonly number[],
  minuteOfDay: number,
  leadMinutes: number
): WeeklySlot[] {
  return runDays.map((day) => {
    const raw = minuteOfDay - leadMinutes;
    const previousDay = raw < 0;
    const minute = ((raw % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
    const jsDay = previousDay ? (day + 6) % 7 : day;

    return { weekday: jsDay + 1, hour: Math.floor(minute / 60), minute: minute % 60 };
  });
}
