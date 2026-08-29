import type { EpochMillis } from './types';

const MINUTE_MS = 60 * 1000;

/**
 * เผื่อเวลาให้วิ่งเสร็จก่อนพระอาทิตย์ตกจริงเท่านี้
 *
 * ไม่ควรให้ผู้ใช้วิ่งจบพอดีวินาทีที่พระอาทิตย์ตก เพราะยังต้องเดินกลับหรือยืดเหยียดต่ออีก และเมืองไทย
 * อยู่ใกล้เส้นศูนย์สูตร แสงหลังพระอาทิตย์ตกหมดเร็วกว่าประเทศเขตอบอุ่นมาก เตือนเร็วขึ้นนิดหน่อย
 * เสียหายน้อยกว่าเตือนช้าไปแล้วผู้ใช้ต้องวิ่งกลับในที่มืด
 *
 * ส่งออกไปด้วยเพราะข้อความบนจอต้องบอกผู้ใช้ตรง ๆ ว่าเผื่อไว้กี่นาที ไม่งั้นตัวเลข "เหลืออีกกี่นาที"
 * กับเวลาพระอาทิตย์ตกที่แสดงคู่กันจะบวกลบกันไม่ลงตัว แล้วดูเหมือนแอปคำนวณผิด
 */
export const DAYLIGHT_SAFETY_MARGIN_MINUTES = 15;

/**
 * ตอนนี้ฟ้ามืดหรือยัง สำหรับเวลา ณ ขณะหนึ่ง (ไม่ใช่ทั้งชั่วโมง)
 *
 * แยกมาไว้ที่เดียวเพราะทั้งใบอนุญาตวิ่งวันนี้และคำเตือนเรื่องแสงใช้กฎเดียวกันเป๊ะ ถ้าปล่อยให้ต่างคน
 * ต่างเขียน วันหนึ่งจะแก้ที่เดียวแล้วอีกที่ยังตัดสินคนละแบบ กลายเป็นสองจอบอกผู้ใช้ไม่ตรงกัน
 * (คนละตัวกับ isDarkHour ใน run-clearance.ts ซึ่งตัดสินทั้งชั่วโมง จึงต้องเผื่อขอบชั่วโมงต่างออกไป)
 */
export function isDarkAt(at: EpochMillis, sunrise: EpochMillis, sunset: EpochMillis): boolean {
  return at < sunrise || at >= sunset;
}

/**
 * เหตุผลที่ต้องเตือนเรื่องแสง แยกเป็นชนิดชัดเจนแทนการใส่ธงหลายตัวในก้อนเดียว
 *
 * แต่ละชนิดพกมาเฉพาะตัวเลขที่ข้อความของตัวเองต้องใช้จริง ตอนก่อนฟ้าสว่างไม่มีคำว่า "เหลือเวลากลางวัน
 * อีกกี่นาที" ที่มีความหมาย (ตีสี่จะได้เลขบวกหลายร้อยนาทีซึ่งอ่านแล้วขัดกับคำว่ามืด) การแยกชนิด
 * ทำให้จอหยิบตัวเลขที่ไม่มีความหมายไปแสดงไม่ได้ตั้งแต่ตอนคอมไพล์
 */
export type DaylightWarning =
  | { kind: 'beforeSunrise'; minutesUntilSunrise: number }
  | { kind: 'afterSunset' }
  | { kind: 'notEnoughTime'; minutesLeft: number; estimatedMinutes: number };

export interface EvaluateDaylightInput {
  now: EpochMillis;
  sunrise: EpochMillis;
  sunset: EpochMillis;
  /** เวลาที่คาดว่าจะใช้วิ่งจนจบ จาก estimateSessionSummary */
  estimatedMinutes: number;
}

/**
 * เตือนเมื่อแสงกลางวันที่เหลือไม่พอสำหรับการวิ่งรอบนี้ คืน null เมื่อเวลายังพอ
 *
 * ไม่อ่านนาฬิกาเอง ต้องส่ง now เข้ามาเสมอ เหมือนโมดูลตัดสินใจอื่นในโปรเจกต์นี้
 *
 * ครอบคลุมความมืดก่อนพระอาทิตย์ขึ้นด้วย ไม่ใช่แค่ตอนเย็น เพราะคนที่เปิดแอปตีสี่ก็อยู่ในที่มืด
 * เหมือนกัน ถ้าดูแค่พระอาทิตย์ตกจะเงียบสนิทในกรณีนั้นทั้งที่อันตรายเท่ากัน
 */
export function evaluateDaylightWarning({
  now,
  sunrise,
  sunset,
  estimatedMinutes,
}: EvaluateDaylightInput): DaylightWarning | null {
  if (now < sunrise) {
    return { kind: 'beforeSunrise', minutesUntilSunrise: Math.round((sunrise - now) / MINUTE_MS) };
  }

  if (now >= sunset) return { kind: 'afterSunset' };

  const deadline = sunset - DAYLIGHT_SAFETY_MARGIN_MINUTES * MINUTE_MS;
  const minutesLeft = Math.round((deadline - now) / MINUTE_MS);

  if (minutesLeft >= estimatedMinutes) return null;

  return { kind: 'notEnoughTime', minutesLeft, estimatedMinutes };
}
