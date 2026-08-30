import type { Coordinates } from './geo';

const GRAPHHOPPER_API_KEY = process.env.EXPO_PUBLIC_GRAPHHOPPER_API_KEY;

export interface StreetRoute {
  points: Coordinates[];
  /** ระยะทางจริงตามถนนที่ได้ ไม่ใช่ระยะที่ขอ เพราะต้องเดินตามถนนจริง ไม่ใช่เส้นตรงเรขาคณิต */
  actualDistanceKm: number;
}

/** หาเส้นทางไม่ได้เลย (เช่นแถวนั้นไม่มีถนน/ทางเดินให้ระบบจับคู่ได้) แยกชนิดจาก error อื่นเพื่อให้
 * ผู้เรียกแสดงข้อความที่ตรงประเด็นกว่า "เชื่อมต่อ API ไม่สำเร็จ" เฉย ๆ */
export class RouteNotFoundError extends Error {}

/**
 * เส้นทางวงกลมที่วิ่งตามถนน/ทางเดินจริง ผ่าน GraphHopper Directions API (สมัครฟรีไม่ต้องผูกบัตร
 * เครดิต ต่างจาก Mapbox ที่ใช้ก่อนหน้านี้ — ดู docs/adr/0005 ส่วนอัปเดต)
 *
 * ใช้ algorithm=round_trip ซึ่งเป็นฟีเจอร์ built-in ของ GraphHopper เอง รับแค่จุดเริ่มต้นจุดเดียว
 * (point) กับระยะโดยประมาณที่ต้องการ (round_trip.distance หน่วยเมตร) แล้วสร้างเส้นวนตามถนน/ทางเดิน
 * กลับมาจุดเดิมให้เองทั้งหมด ไม่ต้องคำนวณจุดรอบวงกลมส่งไปล่วงหน้าแบบที่ต้องทำกับ Mapbox Optimization
 * API (ซึ่งรับแค่ "จุดที่ต้องแวะ" แต่ไม่รู้จักแนวคิด "ระยะทางเป้าหมาย" เลย)
 *
 * points_encoded=false ให้พิกัดเป็น GeoJSON ตรง ๆ (paths[0].points.coordinates) แทนที่จะเป็น
 * polyline เข้ารหัสที่ต้องถอดรหัสเอง
 */
export async function generateStreetRoute(start: Coordinates, distanceKm: number): Promise<StreetRoute> {
  if (!GRAPHHOPPER_API_KEY) {
    throw new Error(
      'ไม่พบ EXPO_PUBLIC_GRAPHHOPPER_API_KEY — คัดลอก .env.example เป็น .env แล้วใส่ค่าจริงจาก GraphHopper'
    );
  }

  const url =
    `https://graphhopper.com/api/1/route?point=${start.latitude},${start.longitude}` +
    `&profile=foot&algorithm=round_trip&round_trip.distance=${Math.round(distanceKm * 1000)}` +
    `&points_encoded=false&key=${encodeURIComponent(GRAPHHOPPER_API_KEY)}`;

  const response = await fetch(url);
  const body = await response.json();

  if (!response.ok || !Array.isArray(body.paths) || body.paths.length === 0) {
    throw new RouteNotFoundError('หาเส้นทางวิ่งตามถนนจริงแถวนี้ไม่ได้ ลองพิกัดอื่นหรือระยะอื่นดู');
  }

  const path = body.paths[0];
  const points: Coordinates[] = path.points.coordinates.map(
    ([longitude, latitude]: [number, number]) => ({ latitude, longitude })
  );

  return { points, actualDistanceKm: path.distance / 1000 };
}
