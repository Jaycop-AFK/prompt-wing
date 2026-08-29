import type { Availability, VenueSort } from '@/services/venue';

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  yes: 'มี',
  no: 'ไม่มี',
  unknown: 'ไม่ทราบ',
};

export const AMENITY_LABEL = {
  restroom: 'ห้องน้ำ',
  parking: 'ที่จอดรถ',
  lighting: 'ไฟส่องสว่าง',
  waterPoint: 'จุดน้ำดื่ม',
  shop: 'ร้านค้า',
} as const;

export const SORT_ORDER: VenueSort[] = ['nearest', 'popularity', 'saved'];

export const SORT_LABEL: Record<VenueSort, string> = {
  nearest: 'ใกล้ที่สุด',
  popularity: 'ความนิยม',
  saved: 'ที่บันทึกไว้',
};

/**
 * ระยะห่างจากผู้ใช้ (distanceFromUser) แสดงเป็นเมตรถ้าใกล้ กิโลเมตรถ้าไกล ตาม CONTEXT.md
 *
 * ปัดเป็นเมตรก่อนแล้วค่อยตัดสินว่าจะใช้หน่วยไหน ไม่ใช่เทียบค่าดิบกับ 1 กม. ตรง ๆ เพราะ 0.9996 กม.
 * เทียบกับ 1 ผ่านเป็น "ใกล้" แต่ปัดเป็นเมตรแล้วได้ 1000 ม. พอดี ซึ่งควรแสดงเป็น "1.0 กม." ไม่ใช่
 * "1000 ม." ที่ดูเหมือนขีดจำกัดของหน่วยเมตรหลุดออกไปเกินพัน
 */
export function formatDistanceFromUser(km: number): string {
  const meters = Math.round(km * 1000);
  if (meters < 1000) return `ห่างจากคุณ ${meters} ม.`;
  return `ห่างจากคุณ ${km.toFixed(1)} กม.`;
}

/** ความยาวลู่วิ่งหนึ่งรอบ (loopLength) คนละความหมายกับระยะห่างจากผู้ใช้ ห้ามใช้ตัวจัดรูปแบบร่วมกัน */
export function formatLoopLength(km: number): string {
  return `ลู่วิ่งยาว ${km.toFixed(1)} กม.`;
}
