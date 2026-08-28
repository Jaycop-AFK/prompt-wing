import { evaluateFormScore, type FormSample, type FormScore } from '@/core/coach';

import { distanceKm, type TrackPoint } from './geo';

/** รูปร่างเดียวกับ CadenceSample ใน hooks/use-cadence-sensor.ts ไม่ import ข้ามมาโดยตรง เพราะไฟล์
 * นี้เป็น services/ ต้องไม่ผูกกับ hook ที่ import expo-sensors รูปร่างเหมือนกันพอที่จะส่งต่อกันได้
 * โดยอาศัย structural typing ของ TypeScript */
interface CadencePoint {
  cadenceSpm: number;
  at: number;
}

/**
 * ประกอบ FormSample ตลอด Session จากเส้นทาง GPS ที่มีเวลาแต่ละจุด กับ cadence ที่ตรวจจับได้
 *
 * ใช้จุด GPS เป็นเส้นเวลาหลัก (มาสม่ำเสมอกว่า และเป็นตัวที่ต้องใช้คำนวณระยะทางอยู่แล้ว) แล้วผูก
 * cadence ล่าสุดที่รู้ ณ เวลานั้นเข้ากับแต่ละจุดแบบ carry-forward (ไม่ประดิษฐ์ค่าระหว่างสองตัวอย่าง
 * cadence ขึ้นมาเอง) ส่วน pace คำนวณจากช่วงสั้น ๆ ระหว่างจุด GPS ที่ติดกันเท่านั้น ไม่ใช่ค่าเฉลี่ย
 * สะสมทั้ง Session เพราะ evaluateFormScore ต้องการเห็นการช้าลงจริงช่วงท้าย ถ้าใช้ค่าเฉลี่ยสะสม
 * สัญญาณนี้จะถูกค่าเฉลี่ยของช่วงต้นที่เร็วกว่ากลบไปเกือบหมด
 *
 * คืนอาร์เรย์ว่างถ้ายังไม่มี cadence เลยตลอด Session (ไม่มีเซนเซอร์ หรือ Session สั้นจนตรวจจับก้าว
 * ไม่ทัน) ผู้เรียกต้องแยกกรณีนี้เอง ไม่ควรส่งอาร์เรย์ว่างเข้า evaluateFormScore ตรง ๆ เพราะข้อความ
 * "สั้นเกินไป" ของมันจะผิดถ้าจริง ๆ แล้ว Session ยาวพอแต่แค่ไม่มีข้อมูล cadence
 */
export function buildFormSamples(
  points: readonly TrackPoint[],
  cadenceSamples: readonly CadencePoint[]
): FormSample[] {
  if (points.length < 2 || cadenceSamples.length === 0) return [];

  const result: FormSample[] = [];
  let cumulativeKm = 0;
  let cadenceIndex = 0;
  let lastKnownCadence: number | null = null;

  for (let i = 1; i < points.length; i++) {
    const segmentKm = distanceKm(points[i - 1], points[i]);
    cumulativeKm += segmentKm;

    while (cadenceIndex < cadenceSamples.length && cadenceSamples[cadenceIndex].at <= points[i].at) {
      lastKnownCadence = cadenceSamples[cadenceIndex].cadenceSpm;
      cadenceIndex++;
    }
    if (lastKnownCadence === null) continue;

    const segmentMs = points[i].at - points[i - 1].at;
    if (segmentKm <= 0 || segmentMs <= 0) continue;

    result.push({
      distanceKm: cumulativeKm,
      cadenceSpm: lastKnownCadence,
      paceSecPerKm: segmentMs / 1000 / segmentKm,
    });
  }

  return result;
}

/**
 * ประเมิน FormScore ของ Session หนึ่งครั้ง จากเส้นทาง GPS และ cadence ที่ตรวจจับได้ตลอดการวิ่ง
 *
 * แยกกรณี "ไม่มีข้อมูล cadence เลย" ออกจากกรณี "Session สั้นเกินไป" ของ evaluateFormScore เอง
 * เพราะข้อความสองอย่างนี้มีสาเหตุคนละเรื่อง ถ้าไม่มีเซนเซอร์ cadence (หรืออุปกรณ์นี้ไม่มีเซนเซอร์เลย
 * ดู hooks/use-cadence-sensor.ts) ต้องบอกผู้ใช้ตรง ๆ ว่าไม่มีข้อมูล ไม่ใช่บอกว่าวิ่งสั้นไปทั้งที่อาจ
 * วิ่งมายาวมากแล้วก็ได้
 */
export function evaluateSessionFormScore(
  points: readonly TrackPoint[],
  cadenceSamples: readonly CadencePoint[]
): FormScore {
  if (cadenceSamples.length === 0) {
    return {
      hasEnoughData: false,
      cadenceDropped: false,
      paceDropped: false,
      summary: 'ไม่มีข้อมูล cadence จากเซนเซอร์ในการวิ่งครั้งนี้ เลยยังประเมินฟอร์มไม่ได้',
    };
  }

  return evaluateFormScore(buildFormSamples(points, cadenceSamples));
}
