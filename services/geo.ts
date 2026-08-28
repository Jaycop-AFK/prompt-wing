export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** พิกัดพร้อมเวลาที่บันทึกจุดนี้ หน่วย ms (เทียบกันเองในทริปเดียวได้ ไม่ใช่เวลาปฏิทินเสมอไป) */
export interface TrackPoint extends Coordinates {
  at: number;
}

/** สถิติของหนึ่งกิโลเมตรที่วิ่งครบเต็ม กิโลเมตรที่ยังไม่ครบท้าย Session จะไม่มี Split ของตัวเอง */
export interface Split {
  /** ลำดับกิโลเมตร เริ่มที่ 1 */
  km: number;
  paceSecPerKm: number;
}

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** ระยะทางเป็นกิโลเมตรระหว่างสองพิกัด ตามสูตร haversine */
export function distanceKm(from: Coordinates, to: Coordinates): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLon / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * ระยะทางรวมของเส้นทางที่ลากผ่านจุดเรียงตามลำดับ บวกระยะห่างระหว่างจุดที่ติดกันไปเรื่อย ๆ
 *
 * ไม่กรองจุดที่ใกล้กันมากออก เพราะตัวเรียก (useLiveRunTracker) ตั้งค่า distanceInterval
 * ของ watchPositionAsync ไว้แล้วว่าต้องขยับอย่างน้อยกี่เมตรถึงจะได้จุดใหม่ ระบบปฏิบัติการกรอง
 * สัญญาณ GPS กระตุกเล็กน้อยให้ตั้งแต่ต้นทางแล้ว ฟังก์ชันนี้จึงแค่บวกระยะรวมตรง ๆ
 */
export function trackDistanceKm(points: readonly Coordinates[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distanceKm(points[i - 1], points[i]);
  }
  return total;
}

/**
 * แบ่งเส้นทางเป็น Split รายกิโลเมตรเต็ม ๆ เท่านั้น กิโลเมตรสุดท้ายที่วิ่งไม่ครบจะไม่ถูกนับ
 * (ตัวเลขระยะทางรวมที่หน้าจออื่นแสดงอยู่แล้วไม่ทำให้ระยะที่เหลือหายไปไหน แค่ไม่มี Split แยกของมันเอง)
 *
 * หาเวลาที่ผ่านกิโลเมตรถัดไปด้วยการประมาณเชิงเส้นระหว่างสองจุดที่คร่อมเส้นแบ่งอยู่ แทนที่จะปัดไปใช้
 * เวลาของจุด GPS จุดใดจุดหนึ่งตรง ๆ เพราะจุด GPS อาจห่างกันหลายสิบเมตรทำให้ Split คลาดเคลื่อนได้มาก
 */
export function computeSplits(points: readonly TrackPoint[]): Split[] {
  const splits: Split[] = [];
  if (points.length < 2) return splits;

  let cumulativeKm = 0;
  let splitStartAt = points[0].at;
  let nextBoundary = 1;

  for (let i = 1; i < points.length; i++) {
    const segmentKm = distanceKm(points[i - 1], points[i]);
    const segmentStartCum = cumulativeKm;
    const segmentEndCum = cumulativeKm + segmentKm;

    while (segmentKm > 0 && nextBoundary <= segmentEndCum) {
      const fraction = (nextBoundary - segmentStartCum) / segmentKm;
      const crossedAt = points[i - 1].at + fraction * (points[i].at - points[i - 1].at);

      splits.push({ km: nextBoundary, paceSecPerKm: (crossedAt - splitStartAt) / 1000 });

      splitStartAt = crossedAt;
      nextBoundary += 1;
    }

    cumulativeKm = segmentEndCum;
  }

  return splits;
}
