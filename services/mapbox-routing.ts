import type { Coordinates } from './geo';
import { generateCircularRoute } from './route-generator';

const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

/** จำนวนจุดคร่าว ๆ รอบวงกลมที่ส่งให้ Mapbox ต่อเป็นเส้นทางจริง ไม่ต้องเยอะเหมือนตอนวาดวงกลมเรขาคณิต
 * ล้วน (36 จุด) เพราะ Mapbox เชื่อมจุดด้วยถนนจริงให้เองอยู่แล้ว ยิ่งจุดเยอะยิ่งบังคับเส้นทางให้วนซับซ้อน
 * ขึ้นโดยไม่จำเป็น และ Optimization API รับพิกัดได้สูงสุดแค่ 12 จุดต่อคำขอด้วย */
const WAYPOINT_COUNT = 5;

export interface StreetRoute {
  points: Coordinates[];
  /** ระยะทางจริงตามถนนที่ได้ ไม่ใช่ระยะที่ขอ เพราะต้องเดินตามถนนจริง ไม่ใช่เส้นตรงเรขาคณิต */
  actualDistanceKm: number;
}

/** หาเส้นทางไม่ได้เลย (เช่นแถวนั้นไม่มีถนน/ทางเดินให้ระบบจับคู่ได้) แยกชนิดจาก error อื่นเพื่อให้
 * ผู้เรียกแสดงข้อความที่ตรงประเด็นกว่า "เชื่อมต่อ API ไม่สำเร็จ" เฉย ๆ */
export class RouteNotFoundError extends Error {}

/**
 * เส้นทางวงกลมที่วิ่งตามถนน/ทางเดินจริง ผ่าน Mapbox Optimization API (ไม่ใช่เรขาคณิตล้วนแบบ
 * generateCircularRoute) ใช้ generateCircularRoute สร้างจุดคร่าว ๆ รอบวงกลมก่อน แล้วส่งให้ Mapbox
 * ต่อเป็นเส้นทางจริงที่เชื่อมจุดเหล่านั้นด้วยถนนจริง
 *
 * roundtrip=true (ค่าเริ่มต้นของ API นี้) หมายถึงพิกัดแรกเป็นทั้งจุดเริ่มและจุดจบของเส้นทางอยู่แล้ว
 * โดยนิยาม บวก source=first เพื่อล็อกว่าพิกัดแรก (ตำแหน่งจริงของผู้ใช้ ไม่ใช่จุดอื่นที่ระบบเลือกเอง)
 * ต้องเป็นจุดเริ่มเสมอ ไม่มีพารามิเตอร์ destination=first ให้ใช้คู่กัน (ตรวจกับเอกสารทางการแล้วว่า
 * destination รับแค่ any หรือ last เท่านั้น) แต่ไม่จำเป็นต้องมีอยู่แล้ว เพราะ roundtrip=true รับประกัน
 * จุดจบ = จุดเริ่มในตัวมันเองโดยไม่ต้องพึ่ง destination เพิ่ม
 */
export async function generateStreetRoute(start: Coordinates, distanceKm: number): Promise<StreetRoute> {
  if (!MAPBOX_ACCESS_TOKEN) {
    throw new Error(
      'ไม่พบ EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN — คัดลอก .env.example เป็น .env แล้วใส่ค่าจริงจาก Mapbox'
    );
  }

  const waypoints = generateCircularRoute(start, distanceKm, WAYPOINT_COUNT);
  // จุดสุดท้ายของ generateCircularRoute ซ้ำกับจุดแรกเสมอ (ปิดวงเรขาคณิต) ตัดทิ้งก่อนส่งให้ Mapbox
  // เพราะ API นี้ปิดวงเองอยู่แล้วด้วย roundtrip=true ส่งจุดซ้ำเข้าไปจะกลายเป็นสองจุดซ้อนตำแหน่งเดียวกัน
  // ในโจทย์ที่ Mapbox ต้องแก้ โดยไม่มีประโยชน์อะไรเพิ่ม
  const openWaypoints = waypoints.slice(0, -1);
  const coordinatesParam = openWaypoints
    .map((point) => `${point.longitude},${point.latitude}`)
    .join(';');

  const url =
    `https://api.mapbox.com/optimized-trips/v1/mapbox/walking/${coordinatesParam}` +
    `?roundtrip=true&source=first&geometries=geojson&overview=full` +
    `&access_token=${encodeURIComponent(MAPBOX_ACCESS_TOKEN)}`;

  const response = await fetch(url);
  const body = await response.json();

  if (body.code !== 'Ok' || !Array.isArray(body.trips) || body.trips.length === 0) {
    throw new RouteNotFoundError('หาเส้นทางวิ่งตามถนนจริงแถวนี้ไม่ได้ ลองพิกัดอื่นหรือระยะอื่นดู');
  }

  const trip = body.trips[0];
  const points: Coordinates[] = trip.geometry.coordinates.map(
    ([longitude, latitude]: [number, number]) => ({ latitude, longitude })
  );

  return { points, actualDistanceKm: trip.distance / 1000 };
}
