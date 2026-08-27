import { distanceKm, type Coordinates } from '@/services/geo';

/**
 * ตัวเชื่อม Air4Thai ของกรมควบคุมมลพิษ
 *
 * ฟรี ไม่ต้องมี API key และมีสถานีตรวจวัดจริง 173 แห่งทั่วประเทศ
 * ค่าจากสถานีจริงน่าเชื่อถือกว่าค่าจากแบบจำลอง จึงใช้ทับค่าของชั่วโมงปัจจุบัน
 */

const STATIONS_URL = 'https://air4thai.pcd.go.th/services/getNewAQI_JSON.php';

/** Air4Thai ใช้ค่านี้แทน "ไม่มีข้อมูล" ไม่ใช่ null และไม่ใช่ค่าว่าง */
const NO_DATA = '-1';

interface RawStation {
  stationID: string;
  nameTH: string;
  areaTH: string;
  lat: string;
  long: string;
  AQILast?: {
    date?: string;
    time?: string;
    PM25?: { value?: string };
  };
}

export interface Air4ThaiReading {
  stationId: string;
  /** ชื่อสถานี เช่น ศาลาประชาคมบ้านบุยายใบ */
  nameTH: string;
  /** ตำบล อำเภอ จังหวัด ของสถานี */
  areaTH: string;
  pm25: number;
  /** ระยะห่างจากตำแหน่งผู้ใช้ไปถึงสถานี หน่วยกิโลเมตร */
  distanceFromUserKm: number;
  /** เวลาที่สถานีวัดค่านี้ เป็นเวลาไทยตามที่ Air4Thai ส่งมา */
  observedAt: string;
}

/** ค่าที่ใช้ได้ต้องแปลงเป็นตัวเลขได้และไม่ใช่ตัวแทนของ "ไม่มีข้อมูล" */
function readPm25(station: RawStation): number | null {
  const raw = station.AQILast?.PM25?.value;
  if (raw === undefined || raw === '' || raw === NO_DATA) return null;

  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * สถานีที่ใกล้ที่สุดซึ่งยังส่งค่า PM2.5 อยู่
 *
 * ข้ามสถานีที่ดับไปโดยไม่หยุด เพราะสถานีไทยดับเป็นเรื่องปกติ
 * และค่าจากสถานีถัดไปที่ห่างออกไปยังมีประโยชน์กว่าการไม่มีค่าเลย
 * ผู้ใช้จะเห็นชื่อสถานีกับระยะห่างเสมอ จึงประเมินความน่าเชื่อถือเองได้
 */
export function nearestReportingStation(
  stations: RawStation[],
  at: Coordinates
): Air4ThaiReading | null {
  let best: Air4ThaiReading | null = null;

  for (const station of stations) {
    const pm25 = readPm25(station);
    if (pm25 === null) continue;

    const latitude = Number(station.lat);
    const longitude = Number(station.long);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    const distance = distanceKm(at, { latitude, longitude });
    if (best !== null && distance >= best.distanceFromUserKm) continue;

    best = {
      stationId: station.stationID,
      nameTH: station.nameTH,
      areaTH: station.areaTH,
      pm25,
      distanceFromUserKm: distance,
      observedAt: `${station.AQILast?.date ?? ''} ${station.AQILast?.time ?? ''}`.trim(),
    };
  }

  return best;
}

export async function fetchNearestPm25(
  at: Coordinates,
  signal?: AbortSignal
): Promise<Air4ThaiReading | null> {
  const response = await fetch(STATIONS_URL, { signal });
  if (!response.ok) throw new Error(`Air4Thai ตอบกลับด้วยสถานะ ${response.status}`);

  const body = (await response.json()) as { stations?: RawStation[] };
  return nearestReportingStation(body.stations ?? [], at);
}
