/**
 * ตัวจัดรูปแบบตัวเลขที่ใช้ร่วมกันหลายจอ
 *
 * ย้าย formatPace มาจาก components/session-target/copy.ts เพราะหน้าวิ่งจริง (ตั๋ว 11)
 * ต้องใช้ตัวเดียวกัน การอยู่ในไฟล์เฉพาะของ session-target ทำให้ดูเหมือนผูกกับฟีเจอร์นั้น
 * ทั้งที่จริงเป็นตัวจัดรูปแบบตัวเลขทั่วไป ไม่เกี่ยวกับ SessionTarget โดยตรง
 */

/** จัดรูปวินาทีต่อกิโลเมตรให้เป็น "นาที:วินาที" เช่น 450 -> "7:30" */
export function formatPace(secPerKm: number): string {
  const rounded = Math.max(0, Math.round(secPerKm));
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** จัดรูปวินาทีทั้งหมดให้เป็น "ชั่วโมง:นาที:วินาที" เช่น 750 -> "00:12:30" */
export function formatDuration(totalSeconds: number): string {
  const whole = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const seconds = whole % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}

/** จัดรูป cadence ให้เป็น "ก้าว/นาที" ปัดเป็นจำนวนเต็ม เช่น 172.4 -> "172 ก้าว/นาที" */
export function formatCadence(cadenceSpm: number): string {
  return `${Math.round(cadenceSpm)} ก้าว/นาที`;
}

/** จัดรูประยะทางให้เป็น "กม." ทศนิยมสองตำแหน่งเสมอ เช่น 5.2 -> "5.20 กม." */
export function formatDistance(km: number): string {
  return `${km.toFixed(2)} กม.`;
}

const THAI_MONTH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/** ตัวย่อวันในสัปดาห์ เรียงตาม Date.getDay() คือเริ่มที่วันอาทิตย์ */
export const THAI_WEEKDAY_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

/** ชื่อเต็มของวันในสัปดาห์ ใช้กับ accessibilityLabel ที่ตัวย่ออ่านออกเสียงไม่รู้เรื่อง */
export const THAI_WEEKDAY_NAME = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

/**
 * วันที่แบบไทยพร้อมปี พ.ศ. เช่น "16 ก.ย. 2569"
 *
 * จัดรูปเองไม่ใช้ Intl ด้วยเหตุผลเดียวกับ formatTime ใน components/clearance/copy.ts
 * คือ Hermes บนแอนดรอยด์บางเครื่องรองรับภาษาไทยไม่ครบ
 */
export function formatThaiDate(at: number): string {
  const date = new Date(at);
  return `${date.getDate()} ${THAI_MONTH_SHORT[date.getMonth()]} ${date.getFullYear() + 543}`;
}

/** วันในสัปดาห์กับวันที่แบบสั้น ไม่มีปี เช่น "พ. 16 ก.ย." */
export function formatThaiDay(at: number): string {
  const date = new Date(at);
  return `${THAI_WEEKDAY_SHORT[date.getDay()]}. ${date.getDate()} ${THAI_MONTH_SHORT[date.getMonth()]}`;
}

/** จำนวนเงินบาทพร้อมคั่นหลักพัน ทศนิยมสองตำแหน่งเมื่อไม่ลงตัว เช่น 1188 -> "1,188", 82.5 -> "82.50" */
export function formatBaht(amount: number): string {
  const fixed = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  const [whole, fraction] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}
