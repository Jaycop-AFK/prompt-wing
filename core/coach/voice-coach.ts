/**
 * ห่างจาก pace แนะนำได้กี่วินาทีต่อกิโลเมตรก่อนถือว่า "หลุดช่วง"
 *
 * ไม่ได้อิงมาตรฐานไหน เป็นดุลพินิจที่เลือกให้กว้างพอไม่จู้จี้จนน่ารำคาญทุกครั้งที่ pace แกว่งเล็กน้อย
 * ตามธรรมชาติของการวิ่ง แต่แคบพอให้เตือนได้จริงเมื่อ pace เปลี่ยนไปอย่างมีนัย ปรับได้จากค่าคงที่นี้
 * ที่เดียวถ้าทดสอบจริงแล้วรู้สึกถี่หรือห่างเกินไป
 */
export const PACE_DRIFT_TOLERANCE_SEC_PER_KM = 30;

export type PaceDriftLevel = 'onPace' | 'tooFast' | 'tooSlow';

/**
 * เทียบ pace ปัจจุบันกับ pace ที่แนะนำ คืนว่าหลุดช่วงไปทางเร็วหรือช้า หรือยังอยู่ในช่วงที่ดี
 *
 * รับ pace แบบเฉลี่ยสะสมตั้งแต่เริ่มวิ่ง (ตัวเดียวกับที่แสดงบนจอ) ไม่ใช่ pace ช่วงล่าสุด เพื่อให้สิ่งที่
 * โค้ชพูดตรงกับตัวเลขที่ผู้ใช้เห็นบนจอเสมอ ข้อเสียคือช่วงท้ายการวิ่งยาว ค่าเฉลี่ยจะนิ่งขึ้นเรื่อย ๆ
 * และตอบสนองต่อการเปลี่ยน pace ช้าลง แต่ยังดีกว่าใช้เลขคนละตัวกับที่แสดงผลจนผู้ใช้สับสน
 *
 * pace เป็น null (ยังไม่มีระยะทางพอให้คำนวณ) ถือว่า onPace เสมอ เพราะยังไม่มีข้อมูลพอจะตัดสิน
 * ไม่ใช่เดาว่าหลุดช่วง
 */
export function classifyPaceDrift(
  currentPaceSecPerKm: number | null,
  recommendedPaceSecPerKm: number
): PaceDriftLevel {
  if (currentPaceSecPerKm === null) return 'onPace';

  const diff = currentPaceSecPerKm - recommendedPaceSecPerKm;
  if (diff <= -PACE_DRIFT_TOLERANCE_SEC_PER_KM) return 'tooFast';
  if (diff >= PACE_DRIFT_TOLERANCE_SEC_PER_KM) return 'tooSlow';
  return 'onPace';
}

/**
 * เลขกิโลเมตรที่เพิ่งวิ่งครบ ถ้ายังไม่ครบกิโลเมตรใหม่คืน null
 *
 * lastAnnouncedKm เริ่มที่ 0 เสมอ (ยังไม่เคยประกาศ) คืนค่าปัดเศษลงของระยะทางปัจจุบันตรง ๆ
 * ถ้าระยะทางกระโดดข้ามมากกว่าหนึ่งกิโลเมตรในจังหวะเดียว (เช่น GPS หลุดแล้วกลับมาไกลผิดปกติ)
 * กิโลเมตรที่ถูกข้ามไปจะไม่ถูกประกาศย้อนหลัง เพราะผู้ใช้อยู่เกินจุดนั้นไปแล้วจริง การพูดแทรกซ้อน
 * หลายประโยคเพื่อไล่ประกาศกิโลเมตรที่ผ่านไปแล้วจะน่ารำคาญกว่าการข้ามไปเงียบ ๆ
 */
export function nextKmMilestone(distanceKm: number, lastAnnouncedKm: number): number | null {
  const flooredKm = Math.floor(distanceKm);
  return flooredKm > lastAnnouncedKm ? flooredKm : null;
}
