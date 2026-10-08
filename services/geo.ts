export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** พิกัดพร้อมเวลาที่บันทึกจุดนี้ หน่วย ms (เทียบกันเองในทริปเดียวได้ ไม่ใช่เวลาปฏิทินเสมอไป) */
export interface TrackPoint extends Coordinates {
  at: number;
  /** ความคลาดเคลื่อนแนวนอนที่ระบบปฏิบัติการรายงาน หน่วยเมตร null เมื่ออุปกรณ์ไม่รายงาน */
  accuracyMeters?: number | null;
}

/** สถิติของหนึ่งกิโลเมตรที่วิ่งครบเต็ม กิโลเมตรที่ยังไม่ครบท้าย Session จะไม่มี Split ของตัวเอง */
export interface Split {
  /** ลำดับกิโลเมตร เริ่มที่ 1 */
  km: number;
  paceSecPerKm: number;
}

const EARTH_RADIUS_KM = 6371;
const MAX_GPS_ACCURACY_METERS = 35;
const MAX_RUNNING_SPEED_METERS_PER_SECOND = 8;
const MIN_PACE_DISTANCE_KM = 0.03;
const MIN_RUN_DURATION_SECONDS = 10;
const CURRENT_PACE_WINDOW_MS = 30_000;
const MIN_CURRENT_PACE_DURATION_SECONDS = 6;
const MIN_CURRENT_PACE_DISTANCE_KM = 0.02;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export type RunSaveReadiness = 'ready' | 'tooShort' | 'waitingForGps';

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
 * รับเฉพาะจุด GPS ที่มีรูปร่างถูกต้อง ความแม่นยำพอใช้ และไม่กระโดดเร็วเกินมนุษย์วิ่ง
 * distanceInterval ของระบบปฏิบัติการช่วยลด callback แต่ไม่ได้รับประกันว่าจุดที่ส่งมาจะไม่กระตุก
 */
export function isTrackPointUsable(candidate: TrackPoint, previous?: TrackPoint): boolean {
  if (
    !Number.isFinite(candidate.latitude) ||
    !Number.isFinite(candidate.longitude) ||
    !Number.isFinite(candidate.at) ||
    candidate.latitude < -90 ||
    candidate.latitude > 90 ||
    candidate.longitude < -180 ||
    candidate.longitude > 180
  ) {
    return false;
  }

  if (
    candidate.accuracyMeters !== null &&
    candidate.accuracyMeters !== undefined &&
    (!Number.isFinite(candidate.accuracyMeters) ||
      candidate.accuracyMeters < 0 ||
      candidate.accuracyMeters > MAX_GPS_ACCURACY_METERS)
  ) {
    return false;
  }

  if (!previous) return true;

  const seconds = (candidate.at - previous.at) / 1000;
  if (seconds <= 0) return false;
  const speedMetersPerSecond = (distanceKm(previous, candidate) * 1000) / seconds;
  return speedMetersPerSecond <= MAX_RUNNING_SPEED_METERS_PER_SECOND;
}

/** pace ช่วงเริ่มต้นไม่นิ่งมาก จึงไม่แสดงจนมีอย่างน้อย 30 เมตรและ 10 วินาที */
export function averagePaceSecPerKm(distance: number, elapsedSeconds: number): number | null {
  if (
    !Number.isFinite(distance) ||
    !Number.isFinite(elapsedSeconds) ||
    distance < MIN_PACE_DISTANCE_KM ||
    elapsedSeconds < MIN_RUN_DURATION_SECONDS
  ) {
    return null;
  }
  return elapsedSeconds / distance;
}

function paceBetween(points: readonly TrackPoint[], fromIndex: number, toIndex: number): number | null {
  const from = points[fromIndex];
  const to = points[toIndex];
  if (!from || !to || to.at <= from.at) return null;

  const durationSeconds = (to.at - from.at) / 1000;
  const distance = trackDistanceKm(points.slice(fromIndex, toIndex + 1));
  if (
    durationSeconds < MIN_CURRENT_PACE_DURATION_SECONDS ||
    distance < MIN_CURRENT_PACE_DISTANCE_KM
  ) {
    return null;
  }
  return durationSeconds / distance;
}

/** pace ปัจจุบันใช้ GPS สูงสุด 30 วินาทีล่าสุด เพื่อให้ตอบสนองต่อความเร็วตอนนี้แต่ไม่ไวต่อ spike */
export function currentPaceSecPerKm(points: readonly TrackPoint[]): number | null {
  if (points.length < 2) return null;
  const latestAt = points[points.length - 1].at;
  const fromIndex = Math.max(
    0,
    points.findIndex((point) => point.at >= latestAt - CURRENT_PACE_WINDOW_MS)
  );
  return paceBetween(points, fromIndex, points.length - 1);
}

/** pace ที่ดีที่สุดจากหน้าต่างต่อเนื่อง 10–30 วินาที ไม่ใช้ความเร็วจาก GPS เพียงช่วงสั้นจุดเดียว */
export function bestPaceSecPerKm(points: readonly TrackPoint[]): number | null {
  let best: number | null = null;
  for (let end = 1; end < points.length; end += 1) {
    for (let start = end - 1; start >= 0; start -= 1) {
      const durationMs = points[end].at - points[start].at;
      if (durationMs > CURRENT_PACE_WINDOW_MS) break;
      if (durationMs < MIN_RUN_DURATION_SECONDS * 1000) continue;
      const pace = paceBetween(points, start, end);
      if (pace !== null && (best === null || pace < best)) best = pace;
    }
  }
  return best;
}

/** ป้องกันการบันทึก session สองสามวินาทีหรือยังไม่มีเส้น GPS จริงลงประวัติถาวร */
export function runSaveReadiness(
  distance: number,
  elapsedSeconds: number,
  pointCount: number
): RunSaveReadiness {
  if (elapsedSeconds < MIN_RUN_DURATION_SECONDS) return 'tooShort';
  if (pointCount < 2 || distance < MIN_PACE_DISTANCE_KM) return 'waitingForGps';
  return 'ready';
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
