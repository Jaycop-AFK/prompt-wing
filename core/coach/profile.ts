/**
 * ช่วงที่ยอมรับของแต่ละช่องตัวเลขในโปรไฟล์
 *
 * เป็นข้อความเกี่ยวกับร่างกายมนุษย์ที่เป็นไปได้จริง ไม่ใช่รายละเอียดของวิธีเก็บข้อมูล จึงอยู่ใน
 * core/coach ที่เดียว แล้วให้ทั้งตัวอ่านค่าจากที่เก็บและหน้าโปรไฟล์ใช้ร่วมกัน ไม่งั้นผู้ใช้กรอกค่า
 * ที่จอรับแต่ที่เก็บไม่รับ (เช่นน้ำหนัก 500) แล้วค่าจะหายไปเงียบ ๆ ตอนเปิดแอปใหม่
 */
export const PROFILE_FIELD_RANGE = {
  weightKg: { min: 20, max: 300 },
  heightCm: { min: 80, max: 250 },
  age: { min: 5, max: 120 },
  waistCm: { min: 40, max: 250 },
  neckCm: { min: 20, max: 80 },
  hipCm: { min: 50, max: 250 },
  bodyFatPercent: { min: 2, max: 70 },
  muscleMassKg: { min: 5, max: 150 },
  visceralFatLevel: { min: 1, max: 30 },
} as const;

export type ProfileNumericField = keyof typeof PROFILE_FIELD_RANGE;
