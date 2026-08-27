import { buildSessionTarget, type SessionTarget } from '@/core/coach';

type Kind = SessionTarget['kind'];

export const KIND_LABEL: Record<Kind, string> = {
  distance: 'ระยะทาง',
  time: 'เวลา',
  calories: 'แคลอรี',
};

export const KIND_ORDER: Kind[] = ['distance', 'time', 'calories'];

interface KindConfig {
  /** ค่าที่ตั้งไว้ให้เลือกอย่างรวดเร็ว */
  presets: number[];
  /** ค่าเริ่มต้นเมื่อสลับมาชนิดนี้ครั้งแรก เลือกค่ากลาง ๆ จาก presets ไม่ใช่ค่าสุดโต่ง */
  defaultMagnitude: number;
  /** ก้าวของปุ่ม +/- ตอนกรอกเอง */
  step: number;
  /** ค่าต่ำสุดที่กรอกเองได้ ป้องกันเป้าหมายรอบนี้ที่เล็กจนไม่มีความหมาย */
  minMagnitude: number;
}

/** ค่าปรับแต่งของตัวเลือก SessionTarget แต่ละชนิด รวมเป็นตารางเดียวเพื่อให้อ่านเป็นชุดต่อชนิด */
export const KIND_CONFIG: Record<Kind, KindConfig> = {
  distance: { presets: [3, 5, 7, 10], defaultMagnitude: 5, step: 0.5, minMagnitude: 1 },
  time: { presets: [15, 30, 45, 60], defaultMagnitude: 30, step: 5, minMagnitude: 5 },
  calories: { presets: [150, 250, 400, 500], defaultMagnitude: 250, step: 50, minMagnitude: 50 },
};

export { buildSessionTarget };

/** จัดรูปวินาทีต่อกิโลเมตรให้เป็น "นาที:วินาที" เช่น 450 -> "7:30" */
export function formatPace(secPerKm: number): string {
  const minutes = Math.floor(secPerKm / 60);
  const seconds = Math.round(secPerKm % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
