import type { Coordinates } from './geo';

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

/** จำนวนจุดรอบวงที่ใช้วาดเส้นวงกลม มากพอให้เส้นโค้งดูเนียนบนแผนที่ ไม่มากจนวาดช้าโดยไม่จำเป็น */
const DEFAULT_POINT_COUNT = 36;

/**
 * เส้นทางวงกลมแบบจำลองสำหรับตั๋ว 19 เป็นเรขาคณิตวงกลมล้วน ๆ ไม่ใช่เส้นทางจริงที่เดินตามถนนได้
 * (ไม่มีตรรกะจริงอยู่เบื้องหลังตามที่ตั๋วกำหนด ไม่ตรวจสอบกับถนน อาคาร หรือแหล่งน้ำใด ๆ ทั้งสิ้น)
 *
 * จุดเริ่มต้น (start) คือจุดบนเส้นรอบวงพอดี ไม่ใช่จุดศูนย์กลางของวงกลม เพราะ "เส้นทางที่กลับมาที่
 * จุดเดิม" ต้องเริ่มและจบที่ตำแหน่งจริงของผู้ใช้ ศูนย์กลางวงกลมจึงอยู่เหนือ start ขึ้นไปหนึ่งรัศมี
 * แล้ววนรอบจุดนั้นทวนเข็มนาฬิกากลับมาจบที่ start พอดี (ทิศทางการวนไม่มีผลต่อภาพที่เห็นบนแผนที่เลย
 * เพราะ Polyline วาดเหมือนกันไม่ว่าจะไล่จุดไปทางไหน)
 *
 * ระยะรอบวง (เส้นรอบวงจริงของวงกลมอุดมคติ = 2π * รัศมี) เท่ากับ distanceKm ที่ขอเป๊ะทางพีชคณิต
 * (รัศมีคำนวณย้อนกลับจากสูตรนี้ตรง ๆ) แต่เส้นที่วาดจริงเป็นรูปหลายเหลี่ยมประมาณวงกลม ความยาวเส้นตรง
 * หลายท่อนรวมกันจึงสั้นกว่าเส้นรอบวงอุดมคติเล็กน้อยเสมอ (ธรรมชาติของคอร์ดที่สั้นกว่าส่วนโค้งที่มันแทน)
 * ยิ่งจุดเยอะยิ่งใกล้เคียง ที่ 36 จุดคลาดเคลื่อนประมาณ 0.13%
 */
export function generateCircularRoute(
  start: Coordinates,
  distanceKm: number,
  pointCount: number = DEFAULT_POINT_COUNT
): Coordinates[] {
  const radiusKm = distanceKm / (2 * Math.PI);
  const latRad = toRadians(start.latitude);

  const points: Coordinates[] = [];
  for (let i = 0; i <= pointCount; i++) {
    const theta = (i / pointCount) * 2 * Math.PI;

    // ตำแหน่งเทียบกับศูนย์กลางวงกลม มุม 0 คือ start พอดี (ทิศใต้ของศูนย์กลาง)
    const eastKm = radiusKm * Math.sin(theta);
    const northKm = radiusKm * (1 - Math.cos(theta));

    const deltaLat = toDegrees(northKm / EARTH_RADIUS_KM);
    const deltaLng = toDegrees(eastKm / (EARTH_RADIUS_KM * Math.cos(latRad)));

    points.push({ latitude: start.latitude + deltaLat, longitude: start.longitude + deltaLng });
  }

  return points;
}
