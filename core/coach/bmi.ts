import type { BmiCategory } from './types';

/**
 * เกณฑ์แบ่งช่วง BMI ของกรมอนามัย กระทรวงสาธารณสุข ไม่ใช่เกณฑ์สากล
 *
 * คนเอเชียมีความเสี่ยงโรคหัวใจและเบาหวานชนิดที่ 2 ตั้งแต่ BMI ต่ำกว่าคนยุโรป และที่ BMI เท่ากัน
 * มีสัดส่วนไขมันในร่างกายสูงกว่า เกณฑ์ที่ไทยใช้จึงต่ำกว่าเกณฑ์สากล (ซึ่งเริ่มน้ำหนักเกินที่ 25
 * และอ้วนที่ 30) ถ้าใช้เกณฑ์สากลกับผู้ใช้ชาวไทย คนที่ควรได้รับคำเตือนแล้วจะถูกบอกว่าน้ำหนักปกติ
 *
 * ระวังอย่าสับสนกับ "action points" 23/27.5 ของรายงานองค์การอนามัยโลกปี 2004 ซึ่งเป็นคนละชุดกับ
 * เกณฑ์แบ่งระดับที่ใช้ในคลินิกไทยจริง ถ้าใช้ 27.5 เป็นจุดเริ่มของอ้วน คนที่ BMI 26 จะถูกบอกว่า
 * แค่น้ำหนักเกิน ทั้งที่เกณฑ์ไทยจัดว่าอ้วนระดับ 1 แล้ว ซึ่งเป็นการเตือนน้อยกว่าที่ควร
 */
const NORMAL_MIN = 18.5;
const OVERWEIGHT_MIN = 23;
const OBESE_1_MIN = 25;
const OBESE_2_MIN = 30;

/** ค่า BMI จากน้ำหนักและส่วนสูง null เมื่อข้อมูลไม่ครบหรือไม่สมเหตุสมผล */
export function calculateBmi(weightKg: number | null, heightCm: number | null): number | null {
  if (weightKg === null || heightCm === null) return null;
  if (weightKg <= 0 || heightCm <= 0) return null;

  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/** ช่วงที่ค่า BMI นี้ตกอยู่ ตามเกณฑ์กรมอนามัยด้านบน */
export function bmiCategoryOf(bmi: number): BmiCategory {
  if (bmi < NORMAL_MIN) return 'underweight';
  if (bmi < OVERWEIGHT_MIN) return 'normal';
  if (bmi < OBESE_1_MIN) return 'overweight';
  if (bmi < OBESE_2_MIN) return 'obese1';
  return 'obese2';
}

/**
 * ขอบเขตของแต่ละช่วง ไว้ให้จอวาดแถบบอกช่วงและป้ายตัวเลขโดยไม่ต้องรู้ตัวเลขเกณฑ์เอง
 *
 * ช่วงสุดท้ายไม่มีขอบบน (Infinity) เพราะ bmiCategoryOf ก็ไม่มีขอบบนเหมือนกัน ถ้าใส่ตัวเลขปลอมไว้
 * ตารางนี้จะบรรยาย bmiCategoryOf ได้ไม่ครบ จอที่วาดกราฟต้องตัดช่วงแสดงผลของตัวเองต่างหาก
 */
export const BMI_BANDS: { category: BmiCategory; min: number; max: number }[] = [
  { category: 'underweight', min: 0, max: NORMAL_MIN },
  { category: 'normal', min: NORMAL_MIN, max: OVERWEIGHT_MIN },
  { category: 'overweight', min: OVERWEIGHT_MIN, max: OBESE_1_MIN },
  { category: 'obese1', min: OBESE_1_MIN, max: OBESE_2_MIN },
  { category: 'obese2', min: OBESE_2_MIN, max: Infinity },
];

/**
 * แคลอรีที่เผาผลาญต่อหนึ่งกิโลเมตร จากน้ำหนักตัว
 *
 * ใช้ค่าประมาณที่ใช้กันทั่วไปคือราวหนึ่งกิโลแคลอรีต่อน้ำหนักหนึ่งกิโลกรัมต่อระยะหนึ่งกิโลเมตร
 * ไม่ได้แยกตามความเร็ว ความชัน หรือประสิทธิภาพการวิ่งของแต่ละคน ซึ่งมีผลจริงแต่ต้องใช้ข้อมูล
 * ที่แอปนี้ยังไม่มี ถือเป็นค่าประมาณคร่าว ๆ ต้องกำกับให้ผู้ใช้เห็นเสมอว่าเป็นค่าประมาณ
 */
const KCAL_PER_KG_PER_KM = 1;
/** น้ำหนักสมมติเมื่อผู้ใช้ยังไม่ได้กรอก ให้ตัวเลขเดิมก่อนมีโปรไฟล์ (60 แคลอรีต่อกิโลเมตร) ไม่เปลี่ยน */
const DEFAULT_WEIGHT_KG = 60;

/** ปัดค่าที่เป็นไปไม่ได้ทิ้งเหมือน calculateBmi เพราะผู้เรียกบางรายเอาไปหาร ถ้าคืนศูนย์จะได้ Infinity */
export function kcalPerKm(weightKg: number | null): number {
  const weight = weightKg !== null && weightKg > 0 ? weightKg : DEFAULT_WEIGHT_KG;
  return weight * KCAL_PER_KG_PER_KM;
}
