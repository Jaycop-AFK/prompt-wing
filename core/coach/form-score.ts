import type { FormSample, FormScore } from './types';

/** ต้องวิ่งอย่างน้อยเท่านี้ถึงจะแบ่ง "ก่อนกิโลสุดท้าย" กับ "กิโลสุดท้าย" ได้อย่างมีความหมาย */
const MIN_TOTAL_DISTANCE_KM = 2;
const FINAL_SEGMENT_KM = 1;

/** ต้องตกอย่างน้อยเท่านี้ถึงจะถือว่า "ตก" ไม่ใช่แค่ความคลาดเคลื่อนปกติของเซ็นเซอร์ */
const CADENCE_DROP_RATIO = 0.05;
const PACE_DROP_RATIO = 0.05;

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function notEnoughData(): FormScore {
  return {
    hasEnoughData: false,
    cadenceDropped: false,
    paceDropped: false,
    summary: 'การวิ่งครั้งนี้สั้นเกินไป ยังประเมินฟอร์มไม่ได้ วิ่งให้ยาวขึ้นอีกหน่อยแล้วลองใหม่',
  };
}

interface Segments {
  earlierCadence: number;
  finalCadence: number;
  earlierPace: number;
  finalPace: number;
}

function buildSummary(cadenceDropped: boolean, paceDropped: boolean, segments: Segments): string {
  if (cadenceDropped) {
    const from = Math.round(segments.earlierCadence);
    const to = Math.round(segments.finalCadence);
    return `cadence คุณตกจาก ${from} เหลือ ${to} ก้าวต่อนาทีในกิโลสุดท้าย ซึ่งมักหมายถึงเริ่มลงส้น เสี่ยงเจ็บน่องและหน้าแข้ง ลองวิ่งช้าลงเล็กน้อยช่วงท้ายในครั้งหน้า`;
  }

  if (paceDropped) {
    return 'pace ของคุณช้าลงในกิโลสุดท้าย น่าจะออกตัวเร็วเกินไปช่วงแรก ลองคุมจังหวะให้สม่ำเสมอกว่านี้ในครั้งหน้า';
  }

  return 'ฟอร์มการวิ่งครั้งนี้ดี คุมจังหวะก้าวได้สม่ำเสมอตลอดการวิ่ง';
}

/**
 * ประเมินฟอร์มการวิ่งจากชุดตัวอย่าง cadence และ pace ตลอด Session
 *
 * ใช้สามสัญญาณที่มือถือวัดได้แม่นจริงเท่านั้น cadence โดยรวม cadence ที่ตกช่วงท้าย
 * และ pace ที่ตกช่วงท้าย ไม่ใช้ ground contact time หรือความสมมาตรซ้ายขวา เพราะมือถือ
 * ในกระเป๋าวัดสองอย่างหลังนี้ไม่ได้แม่นพอ
 */
export function evaluateFormScore(samples: FormSample[]): FormScore {
  if (samples.length === 0) return notEnoughData();

  const totalDistanceKm = Math.max(...samples.map((sample) => sample.distanceKm));
  if (totalDistanceKm < MIN_TOTAL_DISTANCE_KM) return notEnoughData();

  const finalSegment = samples.filter(
    (sample) => sample.distanceKm >= totalDistanceKm - FINAL_SEGMENT_KM
  );
  const earlierSegment = samples.filter(
    (sample) => sample.distanceKm < totalDistanceKm - FINAL_SEGMENT_KM
  );

  if (finalSegment.length === 0 || earlierSegment.length === 0) return notEnoughData();

  const earlierCadence = average(earlierSegment.map((s) => s.cadenceSpm));
  const finalCadence = average(finalSegment.map((s) => s.cadenceSpm));
  const cadenceDropped = (earlierCadence - finalCadence) / earlierCadence >= CADENCE_DROP_RATIO;

  const earlierPace = average(earlierSegment.map((s) => s.paceSecPerKm));
  const finalPace = average(finalSegment.map((s) => s.paceSecPerKm));
  const paceDropped = (finalPace - earlierPace) / earlierPace >= PACE_DROP_RATIO;

  return {
    hasEnoughData: true,
    cadenceDropped,
    paceDropped,
    summary: buildSummary(cadenceDropped, paceDropped, {
      earlierCadence,
      finalCadence,
      earlierPace,
      finalPace,
    }),
  };
}
