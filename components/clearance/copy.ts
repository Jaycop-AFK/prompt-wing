import type { ClearWindow, ClearanceFactor, ClearanceLevel, EpochMillis } from '@/core/coach';

/**
 * ข้อความภาษาไทยของใบอนุญาตวิ่ง
 *
 * แยกออกมาจากคอมโพเนนต์เพราะทั้งหน้าแรกและหน้าอากาศต้องใช้ถ้อยคำชุดเดียวกัน
 * ถ้าสองจอเรียกสิ่งเดียวกันคนละชื่อ ผู้ใช้จะคิดว่าเป็นคนละเรื่อง
 */

export const LEVEL_LABEL: Record<ClearanceLevel, string> = {
  green: 'วิ่งได้เต็มที่',
  yellow: 'วิ่งได้ แต่ควรลดความหนัก',
  red: 'งดวิ่งกลางแจ้ง',
};

export const FACTOR_LABEL: Record<ClearanceFactor, string> = {
  heat: 'อากาศร้อน',
  pm25: 'ฝุ่น PM2.5',
  uv: 'แดดแรง',
  storm: 'พายุฝนฟ้าคะนอง',
  dark: 'ฟ้ามืดแล้ว',
};

/**
 * เวลาแบบ 24 ชั่วโมงตามเขตเวลาของเครื่อง
 *
 * ไม่ใช้ Intl เพราะ Hermes บนแอนดรอยด์รองรับไม่ครบทุกเครื่อง
 * และการจัดรูปแบบเองให้ผลเหมือนกันทุกที่ ซึ่งสำคัญตอนเดโม
 */
export function formatTime(at: EpochMillis): string {
  const date = new Date(at);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * ประโยคเดียวที่บอกว่าวันนี้วิ่งได้ช่วงไหน
 *
 * ตั้งใจให้เป็นประโยคที่ผู้ใช้เอาไปทำอะไรต่อได้ ไม่ใช่ตัวเลขให้ตีความเอง
 * นี่คือความต่างระหว่างแอปนี้กับแอปอากาศทั่วไป
 */
export function clearWindowSentence(window: ClearWindow | null, now: EpochMillis): string {
  if (window === null) return 'วันนี้ไม่มีช่วงเวลาที่เหมาะกับการวิ่งกลางแจ้งแล้ว';

  const startsLater = window.start > now;
  if (startsLater) return `วิ่งได้ ${formatTime(window.start)} ถึง ${formatTime(window.end)}`;

  return `วิ่งได้ถึง ${formatTime(window.end)}`;
}

/** เหตุผลว่าทำไมวันนี้ไม่เขียว คืนค่าว่างเมื่อเป็นสีเขียว */
export function reasonSentence(factors: ClearanceFactor[]): string {
  if (factors.length === 0) return '';
  return factors.map((factor) => FACTOR_LABEL[factor]).join(' และ ');
}
