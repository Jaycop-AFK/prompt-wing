import { kcalPerKm } from './bmi';
import type {
  ClearanceLevel,
  ReducedSessionTarget,
  SessionSummary,
  SessionTarget,
} from './types';

/** ตัวเลขดิบของ SessionTarget ไม่ว่าจะตั้งเป็นระยะทาง เวลา หรือแคลอรี ใช้เทียบขนาดข้ามหน่วยกัน */
export function magnitudeOf(target: SessionTarget): number {
  switch (target.kind) {
    case 'distance':
      return target.km;
    case 'time':
      return target.minutes;
    case 'calories':
      return target.kcal;
  }
}

/**
 * สร้าง SessionTarget จากชนิดและขนาด จุดสร้างเดียวของทั้งแอป
 *
 * ทั้งตัวลดเป้าหมายในไฟล์นี้และตัวเลือกหน้า UI (components/session-target/copy.ts)
 * เรียกฟังก์ชันนี้ตัวเดียวกัน แทนที่จะมี switch ประกอบอ็อบเจกต์แยกกันสองที่ ถ้าจะเพิ่มชนิดที่สี่
 * ของ SessionTarget ในอนาคต ต้องแก้ที่นี่ที่เดียว
 */
export function buildSessionTarget(kind: SessionTarget['kind'], magnitude: number): SessionTarget {
  switch (kind) {
    case 'distance':
      return { kind: 'distance', km: magnitude };
    case 'time':
      return { kind: 'time', minutes: magnitude };
    case 'calories':
      return { kind: 'calories', kcal: magnitude };
  }
}

const UNIT_LABEL: Record<SessionTarget['kind'], string> = {
  distance: 'กม.',
  time: 'นาที',
  calories: 'แคลอรี',
};

/** ประโยคสั้น ๆ บอกขนาดของ SessionTarget พร้อมหน่วย เช่น "5.0 กม." */
export function describeSessionTarget(target: SessionTarget): string {
  const magnitude = magnitudeOf(target);
  const rounded = target.kind === 'distance' ? magnitude.toFixed(1) : String(Math.round(magnitude));
  return `${rounded} ${UNIT_LABEL[target.kind]}`;
}

/** วันสีเหลือง ลดขนาดเป้าหมายรอบนี้เหลือสัดส่วนนี้ */
const YELLOW_REDUCTION_RATIO = 0.7;

/**
 * ลด SessionTarget ที่ผู้ใช้ตั้งไว้ ถ้าวันนี้ใบอนุญาตวิ่งเป็นสีเหลือง
 *
 * สีเขียวไม่ต้องลด สีแดงก็ไม่ลดเช่นกัน เพราะสีแดงควรได้คำเตือนที่ชัดเจนให้ผู้ใช้ตัดสินใจเอง
 * ว่าจะฝืนวิ่งหรือไม่ ไม่ใช่การปรับตัวเลขเงียบ ๆ ที่ทำให้ดูเหมือนระบบอนุญาตให้วิ่งได้ตามปกติ
 * มีแค่สีเหลืองเท่านั้นที่ระบบแนะนำการปรับให้แบบไม่ต้องถาม เพราะยังวิ่งได้แต่ควรเบาลง
 */
export function reduceSessionTargetForClearance(
  target: SessionTarget,
  level: ClearanceLevel
): ReducedSessionTarget {
  if (level !== 'yellow') return { target, reason: null };

  const reduced = buildSessionTarget(target.kind, magnitudeOf(target) * YELLOW_REDUCTION_RATIO);

  return {
    target: reduced,
    reason: `วันนี้ใบอนุญาตวิ่งเป็นสีเหลือง ลดเป้าหมายรอบนี้จาก ${describeSessionTarget(target)} เหลือ ${describeSessionTarget(reduced)} เพื่อไม่ให้ร่างกายรับภาระเพิ่มในสภาพอากาศที่ไม่เหมาะกับการซ้อมหนัก`,
  };
}

/**
 * pace แนะนำพื้นฐาน 7 นาที 30 วินาทีต่อกิโลเมตร ตามค่าที่ใช้ในแบบร่างต้นฉบับ
 * ยังไม่ปรับตามฟอร์มหรือความฟิตของผู้ใช้แต่ละคน ซึ่งต้องใช้ข้อมูลที่แอปนี้ยังไม่เก็บ
 */
const BASE_PACE_SEC_PER_KM = 450;
/** วันสีเหลืองแนะนำให้วิ่งช้าลงด้วย ไม่ใช่แค่ระยะสั้นลงอย่างเดียว */
const YELLOW_PACE_SLOWDOWN_SEC = 30;
/**
 * สรุปก่อนเริ่มวิ่ง คาดเวลาที่ใช้ แคลอรีที่เผาผลาญ และ pace ที่แนะนำ จาก SessionTarget เดียว
 *
 * รับ target ที่จะใช้จริง (ถ้าถูกลดเพราะสีเหลืองไปแล้ว ให้ส่ง target หลังลดเข้ามา ไม่ใช่ก่อนลด)
 * ใช้ pace เดียวกันทั้งตอนแปลงเป้าหมายรอบนี้เป็นระยะทางและตอนแปลงกลับเป็นเวลา/แคลอรี เพื่อให้ตัวเลข
 * ที่ผู้ใช้ตั้งไว้ (เช่น ตั้งเวลา 30 นาที) คำนวณย้อนกลับมาได้ใกล้เคียงของเดิมเสมอ
 */
export function estimateSessionSummary(
  target: SessionTarget,
  level: ClearanceLevel,
  weightKg: number | null = null
): SessionSummary {
  const paceSecPerKm = BASE_PACE_SEC_PER_KM + (level === 'yellow' ? YELLOW_PACE_SLOWDOWN_SEC : 0);
  const kcalPerKilometre = kcalPerKm(weightKg);

  let km: number;
  switch (target.kind) {
    case 'distance':
      km = target.km;
      break;
    case 'time':
      km = (target.minutes * 60) / paceSecPerKm;
      break;
    case 'calories':
      km = target.kcal / kcalPerKilometre;
      break;
  }

  return {
    estimatedMinutes: Math.round((km * paceSecPerKm) / 60),
    estimatedKcal: Math.round(km * kcalPerKilometre),
    recommendedPaceSecPerKm: paceSecPerKm,
  };
}

/**
 * แคลอรีที่เผาผลาญจริงจากระยะทางที่วิ่งได้จริงหลังจบ Session
 *
 * ใช้อัตราเดียวกับตอนประมาณการก่อนวิ่ง (kcalPerKm ใน bmi.ts) เพื่อไม่ให้ตัวเลขก่อนวิ่งกับหลังวิ่ง
 * ขัดกันเอง ผู้ใช้ที่ยังไม่กรอกน้ำหนักจะได้อัตราเริ่มต้นเท่าเดิมกับก่อนที่จะมีหน้าโปรไฟล์
 */
export function caloriesFromDistance(distanceKm: number, weightKg: number | null = null): number {
  return Math.round(distanceKm * kcalPerKm(weightKg));
}
