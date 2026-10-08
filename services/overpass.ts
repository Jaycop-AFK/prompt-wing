import type { Coordinates } from './geo';
import type { Availability, Venue, VenueAmenities, VenueKind } from './venue';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const OVERPASS_REQUEST_TIMEOUT_MS = 15_000;
const MEMORY_CACHE_TTL_MS = 15 * 60 * 1000;

interface MemoryCacheEntry {
  cachedAt: number;
  venues: Venue[];
}

const memoryCache = new Map<string, MemoryCacheEntry>();

function cacheKey(coordinates: Coordinates, radiusMeters: number): string {
  // ปัดประมาณ 110 เมตรเพื่อให้ GPS ที่แกว่งเล็กน้อยยังใช้ cache ชุดเดิมได้
  return `${coordinates.latitude.toFixed(3)}:${coordinates.longitude.toFixed(3)}:${radiusMeters}`;
}

/**
 * ป้าย OSM ที่ถือว่าเป็นที่วิ่งได้ เลือกจากป้ายที่คนวิ่งจริงไปใช้งาน ไม่รวม amenity อื่นที่ไม่เกี่ยว
 * landuse=recreation_ground ใส่ไว้เพราะพื้นที่ชนบท/ต่างจังหวัดในไทยมักแท็กสนามกีฬากลางแจ้งแบบนี้
 * แทนที่จะใช้ leisure=* ตามธรรมเนียมเมืองใหญ่ ถ้าตัดออกจะพลาดที่วิ่งจริงในพื้นที่แบบปราจีนบุรีไปเยอะ
 */
const OSM_TAG_TO_KIND: { key: string; value: string; kind: VenueKind }[] = [
  { key: 'leisure', value: 'park', kind: 'park' },
  { key: 'leisure', value: 'track', kind: 'track' },
  { key: 'leisure', value: 'sports_centre', kind: 'sportsCentre' },
  { key: 'leisure', value: 'stadium', kind: 'stadium' },
  { key: 'leisure', value: 'pitch', kind: 'field' },
  { key: 'landuse', value: 'recreation_ground', kind: 'field' },
];

export function buildQuery(coordinates: Coordinates, radiusMeters: number): string {
  const around = `around:${radiusMeters},${coordinates.latitude},${coordinates.longitude}`;
  const clauses = OSM_TAG_TO_KIND.map(
    ({ key, value }) => `nwr["${key}"="${value}"](${around});`
  ).join('\n  ');

  return `[out:json][timeout:25];\n(\n  ${clauses}\n);\nout center;`;
}

function kindOf(tags: Record<string, string>): VenueKind | null {
  for (const rule of OSM_TAG_TO_KIND) {
    if (tags[rule.key] === rule.value) return rule.kind;
  }
  return null;
}

/**
 * ป้ายบอกว่ามี/ไม่มีสิ่งอำนวยความสะดวก ต้องได้ 'unknown' เมื่อไม่มีป้ายนี้เลย ไม่ใช่ 'no' โดยปริยาย
 * เพราะการไม่มีป้ายใน OSM แปลว่า "ยังไม่มีใครกรอก" ไม่ใช่ "ยืนยันแล้วว่าไม่มี" สองอย่างนี้ต่างกัน
 * และตั๋วนี้กำหนดไว้ชัดว่าห้ามปนกัน
 */
function availabilityOf(tags: Record<string, string>, key: string): Availability {
  const value = tags[key];
  if (value === 'yes') return 'yes';
  if (value === 'no') return 'no';
  return 'unknown';
}

export function amenitiesFromTags(tags: Record<string, string>): VenueAmenities {
  return {
    restroom: availabilityOf(tags, 'toilets'),
    parking: availabilityOf(tags, 'parking'),
    lighting: availabilityOf(tags, 'lit'),
    waterPoint: availabilityOf(tags, 'drinking_water'),
    // shop ไม่มีธรรมเนียมป้าย "ไม่มีร้านค้า" ใน OSM (ไม่เหมือน toilets/lit/drinking_water ที่มีคนแท็ก
    // =no จริง) เจอป้าย shop=* ถือว่ามี ไม่เจอถือว่าไม่ทราบ ไม่มีทางได้ 'no' จากข้อมูล Overpass เอง
    shop: tags.shop !== undefined ? 'yes' : 'unknown',
  };
}

/** ค่าคะแนนความนิยมจำลอง คงที่ต่อ Venue เดียวกันทุกครั้ง (ไม่สุ่มใหม่ทุกครั้งที่โหลด) แต่เป็นเพียง
 * ตัวอย่างเสมอ ไม่ใช่ความนิยมจริง เพราะ OSM ไม่มีข้อมูลนี้ (ดู Venue.mockPopularity) */
function mockPopularityFrom(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return (hash % 10) + 1;
}

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** แปลงผลลัพธ์ดิบจาก Overpass เป็น Venue คืน null เมื่อไม่ใช่ที่วิ่งที่รู้จักหรือไม่มีพิกัด */
export function toVenue(element: OverpassElement): Venue | null {
  const tags = element.tags ?? {};
  const kind = kindOf(tags);
  if (kind === null) return null;

  const point = element.type === 'node' ? element : element.center;
  if (!point || point.lat === undefined || point.lon === undefined) return null;

  const id = `${element.type}/${element.id}`;

  return {
    id,
    name: tags.name ?? null,
    kind,
    coordinates: { latitude: point.lat, longitude: point.lon },
    amenities: amenitiesFromTags(tags),
    // ความยาวลู่วิ่งต้องคำนวณจากรูปทรงจริงของเส้นทาง ซึ่งต้องขอ out geom แทน out center และรับมือ
    // กรณีที่ way ไม่ได้เป็นวงปิดจริงด้วย เกินขอบเขตของตั๋วนี้ Venue จาก Overpass จึงไม่ทราบเสมอ
    loopLengthKm: null,
    mockPopularity: mockPopularityFrom(id),
    source: 'overpass',
  };
}

/**
 * ที่วิ่งรอบพิกัดที่ให้มา จาก Overpass API (ข้อมูล OpenStreetMap สาธารณะ ฟรี ไม่ต้องมี API key)
 *
 * คืนอาร์เรย์ว่างเมื่อไม่พบ ไม่ throw สำหรับกรณีนั้น แต่ throw จริงเมื่อเรียก API ไม่สำเร็จ (เน็ตหลุด,
 * เซิร์ฟเวอร์ล่ม) ให้ผู้เรียกจัดการแสดงข้อผิดพลาดเอง ตามแบบเดียวกับ services/open-meteo.ts
 */
export async function fetchNearbyVenues(
  coordinates: Coordinates,
  radiusMeters: number,
  signal?: AbortSignal,
  forceRefresh = false
): Promise<Venue[]> {
  const key = cacheKey(coordinates, radiusMeters);
  const cached = memoryCache.get(key);
  if (!forceRefresh && cached && Date.now() - cached.cachedAt < MEMORY_CACHE_TTL_MS) {
    return cached.venues;
  }

  const requestController = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => requestController.abort(signal?.reason);
  if (signal?.aborted) abortFromCaller();
  else signal?.addEventListener('abort', abortFromCaller, { once: true });

  const timeout = setTimeout(() => {
    timedOut = true;
    requestController.abort();
  }, OVERPASS_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(buildQuery(coordinates, radiusMeters))}`,
      // ต้องส่ง Accept กับ User-Agent เอง ยืนยันแล้วจากการยิงจริงว่าเซิร์ฟเวอร์นี้ (Apache) ปฏิเสธ
      // คำขอที่ไม่มีสอง header นี้ด้วย 406 Not Acceptable ทันที ไม่ใช่ปัญหาที่ query หรือ body เลย
      // ถ้าไม่มีสองบรรทัดนี้ ฟีเจอร์ทั้งตั๋วจะพังเงียบ ๆ ทุกครั้งจริง ไม่ใช่แค่บางกรณี
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: '*/*',
        'User-Agent': 'prompt-wing-prototype/1.0',
      },
      signal: requestController.signal,
    });
  } catch (error) {
    if (timedOut) {
      throw new Error('บริการค้นหาที่วิ่งใช้เวลานานเกิน 15 วินาที');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }

  if (!response.ok) throw new Error(`Overpass ตอบกลับผิดพลาด: ${response.status}`);

  const body: { elements: OverpassElement[] } = await response.json();

  const venues: Venue[] = [];
  for (const element of body.elements) {
    const venue = toVenue(element);
    if (venue) venues.push(venue);
  }
  memoryCache.set(key, { cachedAt: Date.now(), venues });
  return venues;
}
