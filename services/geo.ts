export interface Coordinates {
  latitude: number;
  longitude: number;
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
