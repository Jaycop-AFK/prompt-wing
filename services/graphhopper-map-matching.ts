import { distanceKm, type Coordinates, type TrackPoint } from './geo';

const GRAPHHOPPER_API_KEY = process.env.EXPO_PUBLIC_GRAPHHOPPER_API_KEY;
const MAP_MATCH_URL = 'https://graphhopper.com/api/1/match';
const MAX_SEAM_DISTANCE_METERS = 100;
const REQUEST_TIMEOUT_MS = 6000;

type Fetcher = typeof fetch;

type MapMatchingResponse = {
  paths?: {
    points?: { coordinates?: unknown };
  }[];
  message?: string;
};

export class MapMatchingError extends Error {}

/** GraphHopper Map Matching รับ track เป็น GPX และใช้เวลาเพื่อแยกลำดับ/ความเร็วของจุด GPS */
export function buildGpxTrace(points: readonly TrackPoint[]): string {
  const trackPoints = points
    .map(
      (point) =>
        `<trkpt lat="${point.latitude}" lon="${point.longitude}">` +
        `<time>${new Date(point.at).toISOString()}</time></trkpt>`
    )
    .join('');

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<gpx version="1.1" creator="Prompt Wing" xmlns="http://www.topografix.com/GPX/1/1">' +
    `<trk><name>live-run</name><trkseg>${trackPoints}</trkseg></trk></gpx>`
  );
}

function parseCoordinates(body: MapMatchingResponse): Coordinates[] {
  const coordinates = body.paths?.[0]?.points?.coordinates;
  if (!Array.isArray(coordinates)) return [];

  return coordinates.flatMap((coordinate) => {
    if (
      !Array.isArray(coordinate) ||
      coordinate.length < 2 ||
      !Number.isFinite(coordinate[0]) ||
      !Number.isFinite(coordinate[1])
    ) {
      return [];
    }
    return [{ latitude: Number(coordinate[1]), longitude: Number(coordinate[0]) }];
  });
}

/** ส่งกลุ่ม GPS สั้น ๆ ไปจับกับโครงข่ายถนน/ทางเดินจริง ใช้ profile=foot สำหรับนักวิ่ง */
export async function matchTrackToRoad(
  points: readonly TrackPoint[],
  fetcher: Fetcher = fetch,
  apiKey = GRAPHHOPPER_API_KEY
): Promise<Coordinates[]> {
  if (!apiKey) throw new MapMatchingError('ยังไม่ได้ตั้งค่า GraphHopper API key');
  if (points.length < 2) return points.map(({ latitude, longitude }) => ({ latitude, longitude }));

  const url =
    `${MAP_MATCH_URL}?profile=foot&type=json&points_encoded=false&gps_accuracy=35` +
    `&key=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/gpx+xml' },
      body: buildGpxTrace(points),
      signal: controller.signal,
    });
  } catch (error) {
    throw new MapMatchingError(
      error instanceof Error && error.name === 'AbortError'
        ? 'จับเส้นเข้าถนนใช้เวลานานเกินไป'
        : 'เชื่อมต่อบริการจับเส้นเข้าถนนไม่ได้'
    );
  } finally {
    clearTimeout(timeout);
  }

  const body = (await response.json()) as MapMatchingResponse;
  const matched = parseCoordinates(body);

  if (!response.ok || matched.length < 2) {
    throw new MapMatchingError(body.message ?? 'จับเส้น GPS เข้าถนนไม่สำเร็จ');
  }
  return matched;
}

/**
 * แต่ละ request ส่ง GPS ซ้ำสองจุดจาก batch ก่อนหน้าเพื่อให้ GraphHopper รู้ทิศทาง จึงต้องหา seam
 * ที่ใกล้ปลายเส้นเดิมที่สุดแล้วต่อเฉพาะส่วนใหม่ มิฉะนั้น Polyline จะย้อนกลับเป็นรูปสามเหลี่ยม
 */
export function mergeMatchedRoute(
  existing: readonly Coordinates[],
  next: readonly Coordinates[]
): Coordinates[] {
  if (existing.length === 0) return [...next];
  if (next.length === 0) return [...existing];

  const existingEnd = existing[existing.length - 1];
  let seamIndex = 0;
  let seamDistanceKm = Number.POSITIVE_INFINITY;
  next.forEach((point, index) => {
    const candidateDistance = distanceKm(existingEnd, point);
    if (candidateDistance < seamDistanceKm) {
      seamDistanceKm = candidateDistance;
      seamIndex = index;
    }
  });

  if (seamDistanceKm * 1000 > MAX_SEAM_DISTANCE_METERS) return [...existing];
  return [...existing, ...next.slice(seamIndex + 1)];
}
