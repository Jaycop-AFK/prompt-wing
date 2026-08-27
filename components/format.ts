/**
 * ตัวจัดรูปแบบตัวเลขที่ใช้ร่วมกันหลายจอ
 *
 * ย้าย formatPace มาจาก components/session-target/copy.ts เพราะหน้าวิ่งจริง (ตั๋ว 11)
 * ต้องใช้ตัวเดียวกัน การอยู่ในไฟล์เฉพาะของ session-target ทำให้ดูเหมือนผูกกับฟีเจอร์นั้น
 * ทั้งที่จริงเป็นตัวจัดรูปแบบตัวเลขทั่วไป ไม่เกี่ยวกับ SessionTarget โดยตรง
 */

/** จัดรูปวินาทีต่อกิโลเมตรให้เป็น "นาที:วินาที" เช่น 450 -> "7:30" */
export function formatPace(secPerKm: number): string {
  const minutes = Math.floor(secPerKm / 60);
  const seconds = Math.round(secPerKm % 60);
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
