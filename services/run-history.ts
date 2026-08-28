import type { SessionRecord } from './session-record';

/** ช่วงเวลาที่ผู้ใช้สลับดูได้ในหน้าประวัติการวิ่ง */
export type HistoryRange = 'week' | 'month' | 'year';

/** หนึ่งแท่งในกราฟ วันเดียวสำหรับรายสัปดาห์/รายเดือน หรือเดือนเดียวสำหรับรายปี */
export interface HistoryBucket {
  /** ป้ายใต้แท่ง สั้นที่สุดเท่าที่ยังอ่านออก เพราะแท่งรายเดือนมีได้ถึง 31 อัน */
  label: string;
  distanceKm: number;
  /** เวลาเริ่มต้นของช่วงที่แท่งนี้แทน */
  startsAt: number;
  /** แท่งนี้คือวันนี้ (รายสัปดาห์/รายเดือน) หรือเดือนนี้ (รายปี) ให้จอเน้นได้โดยไม่ต้องรู้ว่าแท่ง
   * เรียงยังไงหรือคำนวณขอบเขตของช่วงซ้ำเอง */
  isCurrent: boolean;
}

export interface HistorySummary {
  range: HistoryRange;
  /** เฉพาะ Session ที่อยู่ในช่วงนี้ เรียงจากล่าสุดไปเก่าสุด */
  sessions: SessionRecord[];
  buckets: HistoryBucket[];
  totalDistanceKm: number;
  /** ระยะทางที่ควรได้ตลอดช่วงนี้ จากเป้าหมายรายวันคูณจำนวนวันในช่วง
   * ไม่ใช้คำว่า target ในชื่อ เพราะ CONTEXT.md จองคำนั้นไว้ให้ SessionTarget (เป้าหมายรอบนี้)
   * ซึ่งเป็นคนละเรื่องกับ DailyGoal (เป้าหมายรายวัน) ที่ตัวเลขนี้มาจาก */
  goalDistanceKm: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** ตัวย่อวันในสัปดาห์ เรียงตาม Date.getDay() คือเริ่มที่วันอาทิตย์ */
const WEEKDAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

const MONTH_LABELS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

/**
 * เที่ยงคืนของวันที่ระบุ ตามเขตเวลาของเครื่อง
 *
 * ใช้ตัวสร้าง Date จากปี/เดือน/วัน แทนการลบมิลลิวินาทีตรง ๆ เพราะการลบจะเพี้ยนในวันที่มีการ
 * ปรับเวลาตามฤดูกาล (ไทยไม่มี แต่ผู้ใช้อาจตั้งเขตเวลาอื่นไว้ และเทสต์รันบนเครื่องเขตเวลาใดก็ได้)
 */
function startOfDay(at: number): number {
  const d = new Date(at);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function startOfMonth(at: number): number {
  const d = new Date(at);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

/**
 * ขอบเขตของช่วงที่กำลังดูอยู่ นับถึงสิ้นวันนี้เสมอ ไม่ใช่ถึงวินาทีนี้
 *
 * รายสัปดาห์ = เจ็ดวันล่าสุดรวมวันนี้ (ไม่ใช่สัปดาห์ตามปฏิทินที่เริ่มวันจันทร์) เพราะผู้ใช้เปิดดู
 * เพื่อประเมินความสม่ำเสมอของตัวเองล่าสุด ไม่ได้ดูเพื่อสรุปสัปดาห์ปฏิทิน ถ้าเริ่มวันจันทร์
 * ผู้ใช้ที่เปิดดูวันจันทร์เช้าจะเห็นกราฟเกือบว่างเปล่าทั้งที่เพิ่งวิ่งมาทั้งสัปดาห์
 * รายเดือนและรายปีใช้ตามปฏิทินจริง เพราะคนพูดถึง "เดือนนี้" กับ "ปีนี้" ตามปฏิทินเสมอ
 */
export function rangeBounds(range: HistoryRange, now: number): { start: number; end: number } {
  const d = new Date(now);
  // ทุกจุดตัดสร้างด้วยตัวสร้าง Date เสมอ ห้ามบวกลบมิลลิวินาที ด้วยเหตุผลเดียวกับ startOfDay ด้านบน
  // ในเขตเวลาที่มีการปรับเวลาตามฤดูกาล วันหนึ่งอาจยาว 23 หรือ 25 ชั่วโมง การบวก DAY_MS จะทำให้
  // จุดจบไปตกที่ 23:00 ของวันนี้แทนที่จะเป็นเที่ยงคืน แล้ว Session ที่จบหลังจากนั้นจะหายไปทั้งจากยอดรวม
  // กราฟ และรายการ ส่วนจุดเริ่มที่เพี้ยนจะทำให้ startsAt ของทุกแท่งไม่ตรงกับวันของ Session สักอัน
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();

  switch (range) {
    case 'week':
      return { start: new Date(d.getFullYear(), d.getMonth(), d.getDate() - 6).getTime(), end };
    case 'month':
      return { start: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), end };
    case 'year':
      return { start: new Date(d.getFullYear(), 0, 1).getTime(), end };
  }
}

/** แท่งเปล่าทั้งหมดของช่วงนี้ ก่อนเอาระยะทางจริงไปใส่ */
function emptyBuckets(range: HistoryRange, now: number): HistoryBucket[] {
  const { start } = rangeBounds(range, now);

  if (range === 'year') {
    const d = new Date(now);
    const year = d.getFullYear();
    // ตัดเดือนที่ยังมาไม่ถึงออก ให้ตรงกับ daysInRange ที่นับเฉพาะวันที่ผ่านมาแล้ว ไม่งั้นครึ่งหนึ่ง
    // ของกราฟจะเป็นแท่งว่างของอนาคต ซึ่งดูเหมือนผู้ใช้ขาดซ้อมทั้งที่ยังไม่ถึงเวลา
    return MONTH_LABELS.slice(0, d.getMonth() + 1).map((label, month) => ({
      label,
      distanceKm: 0,
      startsAt: new Date(year, month, 1).getTime(),
      isCurrent: month === d.getMonth(),
    }));
  }

  const buckets: HistoryBucket[] = [];
  const today = startOfDay(now);
  const cursor = new Date(start);

  while (cursor.getTime() <= today) {
    buckets.push({
      // รายสัปดาห์ใช้ตัวย่อวันในสัปดาห์ อ่านออกทันทีว่าวันไหนขาด รายเดือนใช้เลขวันที่
      // เพราะมีถึง 31 แท่ง ตัวย่อวันจะซ้ำกันสี่ห้ารอบจนแยกไม่ออกว่าแท่งไหนคือวันไหน
      label: range === 'week' ? WEEKDAY_LABELS[cursor.getDay()] : String(cursor.getDate()),
      distanceKm: 0,
      startsAt: cursor.getTime(),
      isCurrent: cursor.getTime() === today,
    });
    // เดินวันด้วย setDate แทนการบวกมิลลิวินาที เพื่อให้ข้ามวันที่มีการปรับเวลาตามฤดูกาลได้ถูกต้อง
    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
}

/**
 * สรุปประวัติการวิ่งของช่วงที่เลือก พร้อมข้อมูลกราฟแท่ง
 *
 * ไม่อ่านนาฬิกาเอง ต้องส่ง now เข้ามาเสมอ เหมือนโมดูลตัดสินใจอื่นในโปรเจกต์นี้ เพื่อให้เทสต์
 * ได้ผลเดิมทุกครั้งไม่ว่าจะรันตอนไหน
 */
export function summarizeHistory(
  sessions: readonly SessionRecord[],
  range: HistoryRange,
  now: number,
  dailyGoalKm: number
): HistorySummary {
  const { start, end } = rangeBounds(range, now);
  const inRange = sessions
    .filter((s) => s.finishedAt >= start && s.finishedAt < end)
    .sort((a, b) => b.finishedAt - a.finishedAt);

  const buckets = emptyBuckets(range, now);

  for (const session of inRange) {
    const key = range === 'year' ? startOfMonth(session.finishedAt) : startOfDay(session.finishedAt);
    const bucket = buckets.find((b) => b.startsAt === key);
    if (bucket) bucket.distanceKm += session.distanceKm;
  }

  return {
    range,
    sessions: inRange,
    buckets,
    totalDistanceKm: inRange.reduce((sum, s) => sum + s.distanceKm, 0),
    goalDistanceKm: dailyGoalKm * daysInRange(range, now),
  };
}

/** จำนวนวันที่ผ่านไปแล้วในช่วงนี้ นับวันนี้ด้วย ไม่นับวันในอนาคตของเดือน/ปีที่ยังไม่จบ */
export function daysInRange(range: HistoryRange, now: number): number {
  const { start } = rangeBounds(range, now);
  // ปัดเศษ ไม่ใช่ปัดลง เพราะเดือนที่มีการปรับเวลาตามฤดูกาลจะมีวันหนึ่งสั้นหรือยาวกว่า 24 ชั่วโมง
  // ผลหารจึงออกมาเป็น 14.96 แทนที่จะเป็น 15 พอดี ปัดลงจะได้จำนวนวันขาดไปหนึ่งวัน
  return Math.round((startOfDay(now) - start) / DAY_MS) + 1;
}

/** ผลสรุปฟอร์มของ Session หนึ่งครั้ง ย่อให้เหลือสิ่งที่กราฟแนวโน้มต้องใช้ */
export type FormTrendPoint = 'good' | 'cadenceDropped' | 'paceDropped' | 'notEnoughData';

export interface FormTrend {
  /** เรียงจากเก่าไปใหม่ เพื่อให้อ่านจากซ้ายไปขวาเป็นเส้นเวลาได้ตรงตัว */
  points: FormTrendPoint[];
  goodCount: number;
  /** จำนวนครั้งที่ประเมินฟอร์มได้จริง (ไม่นับครั้งที่ข้อมูลไม่พอ) */
  ratedCount: number;
}

function classifyForm(session: SessionRecord): FormTrendPoint {
  if (!session.formScore.hasEnoughData) return 'notEnoughData';
  if (session.formScore.cadenceDropped) return 'cadenceDropped';
  if (session.formScore.paceDropped) return 'paceDropped';
  return 'good';
}

/**
 * แนวโน้มฟอร์มการวิ่งย้อนหลัง
 *
 * FormScore ตาม CONTEXT.md เป็นประโยคกับธงบอกว่าอะไรตก ไม่ใช่ตัวเลข จึงวาดเป็นเส้นกราฟขึ้นลง
 * ไม่ได้โดยไม่ประดิษฐ์คะแนนตัวเลขขึ้นมาเองซึ่งจะขัดกับนิยามในโดเมน แนวโน้มที่นี่จึงเป็นลำดับของ
 * ผลแต่ละครั้งเรียงตามเวลาแทน ผู้ใช้ยังเห็นได้ว่าดีขึ้นหรือแย่ลงจากความถี่ของผลแต่ละแบบ
 */
export function formTrend(sessions: readonly SessionRecord[], limit = 10): FormTrend {
  const recent = [...sessions].sort((a, b) => a.finishedAt - b.finishedAt).slice(-limit);
  const points = recent.map(classifyForm);

  return {
    points,
    goodCount: points.filter((p) => p === 'good').length,
    ratedCount: points.filter((p) => p !== 'notEnoughData').length,
  };
}
