import {
  DAYLIGHT_SAFETY_MARGIN_MINUTES,
  type ClearWindow,
  type ClearanceFactor,
  type ClearanceLevel,
  type DaylightWarning,
  type EpochMillis,
} from '@/core/coach';

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

/**
 * ประโยคเตือนเรื่องแสง พร้อมทางเลือกที่ทำได้จริงเสมอ
 *
 * ต้องเสนอสิ่งที่ผู้ใช้ลงมือทำได้ตอนนี้ ไม่ใช่แค่บอกว่าเวลาไม่พอแล้วปล่อยให้คิดเอง ทางเลือกต่างกัน
 * ตามสถานการณ์ ก่อนฟ้าสว่างมีทางเลือกที่ดีที่สุดคือรออีกไม่นาน ซึ่งไม่มีในกรณีหลังพระอาทิตย์ตก
 *
 * บอกระยะเผื่อเป็นตัวเลขด้วย ไม่งั้นผู้ใช้เอา "เหลืออีกกี่นาที" ไปลบกับเวลาพระอาทิตย์ตกที่แสดงคู่กัน
 * แล้วได้ไม่ตรง ดูเหมือนแอปคำนวณผิดทั้งที่ตั้งใจเผื่อไว้
 */
export function daylightWarningSentence(warning: DaylightWarning, sunset: EpochMillis): string {
  switch (warning.kind) {
    case 'beforeSunrise':
      return `ตอนนี้ฟ้ายังไม่สว่าง อีกราว ${warning.minutesUntilSunrise} นาทีพระอาทิตย์จะขึ้น รออีกหน่อยแล้วค่อยออกไปวิ่งจะปลอดภัยกว่า ถ้าจะวิ่งตอนนี้ควรเลือกที่วิ่งที่มีไฟส่องสว่างและใส่เสื้อสีสว่างหรือมีแถบสะท้อนแสง`;

    case 'afterSunset':
      return `ตอนนี้ฟ้ามืดแล้ว (พระอาทิตย์ตก ${formatTime(sunset)}) ถ้าจะวิ่งควรเลือกที่วิ่งที่มีไฟส่องสว่างและใส่เสื้อสีสว่างหรือมีแถบสะท้อนแสง`;

    case 'notEnoughTime': {
      const left = Math.max(0, warning.minutesLeft);
      return `เหลือเวลาอีกราว ${left} นาทีก่อนควรวิ่งให้จบ (เผื่อไว้ ${DAYLIGHT_SAFETY_MARGIN_MINUTES} นาทีก่อนพระอาทิตย์ตก ${formatTime(sunset)}) แต่เป้าหมายรอบนี้น่าจะใช้เวลาราว ${warning.estimatedMinutes} นาที ลองลดเป้าหมายรอบนี้ลง หรือเลือกที่วิ่งที่มีไฟส่องสว่าง`;
    }
  }
}

/** หัวข้อสั้น ๆ ของคำเตือน ไม่ซ้ำกับประโยคเต็มด้านล่าง */
export function daylightWarningTitle(warning: DaylightWarning): string {
  switch (warning.kind) {
    case 'beforeSunrise':
      return 'ฟ้ายังไม่สว่าง';
    case 'afterSunset':
      return 'ฟ้ามืดแล้ว';
    case 'notEnoughTime':
      // เลี่ยงคำที่ฟันธง เพราะเวลาที่คาดว่าจะใช้วิ่งมาจาก pace มาตรฐาน ไม่ใช่ pace จริงของผู้ใช้คนนี้
      return 'แสงกลางวันอาจไม่พอ';
  }
}
