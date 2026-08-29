import { distanceKm, type Coordinates } from './geo';

/**
 * ประเภทของที่วิ่ง ใช้แสดงแทนชื่อเมื่อ Venue ไม่มีชื่อใน OSM (พบบ่อยมากในข้อมูลจริงรอบปราจีนบุรี)
 * และใช้เป็นไอคอน/ตัวกรองคร่าว ๆ บนแผนที่
 */
export type VenueKind = 'park' | 'track' | 'sportsCentre' | 'stadium' | 'field' | 'other';

export const VENUE_KIND_LABEL: Record<VenueKind, string> = {
  park: 'สวนสาธารณะ',
  track: 'ลู่วิ่ง',
  sportsCentre: 'ศูนย์กีฬา',
  stadium: 'สนามกีฬา',
  field: 'สนามกีฬากลางแจ้ง',
  other: 'ที่วิ่ง',
};

/**
 * มี / ไม่มี / ไม่ทราบ สามค่านี้ต้องแยกกันชัดเจน (ดูตั๋ว 15) ห้ามใช้ boolean ธรรมดาที่บีบให้
 * "ไม่ทราบ" กลายเป็น false ไปโดยปริยาย เพราะนั่นคือการบอกผู้ใช้ว่า "ไม่มี" ทั้งที่จริงแค่ไม่มีข้อมูล
 */
export type Availability = 'yes' | 'no' | 'unknown';

export interface VenueAmenities {
  restroom: Availability;
  parking: Availability;
  lighting: Availability;
  waterPoint: Availability;
  shop: Availability;
}

export const UNKNOWN_AMENITIES: VenueAmenities = {
  restroom: 'unknown',
  parking: 'unknown',
  lighting: 'unknown',
  waterPoint: 'unknown',
  shop: 'unknown',
};

export interface Venue {
  id: string;
  /** null เมื่อไม่มีชื่อใน OSM ต้องแสดง VENUE_KIND_LABEL[kind] แทน ห้ามปล่อยว่างหรือใส่ค่าว่าง '' */
  name: string | null;
  kind: VenueKind;
  coordinates: Coordinates;
  amenities: VenueAmenities;
  /** ความยาวลู่วิ่งหนึ่งรอบ กิโลเมตร null เมื่อไม่ทราบ (กรณีทั่วไปสำหรับ Venue จาก Overpass) */
  loopLengthKm: number | null;
  /**
   * คะแนนความนิยม เป็นข้อมูลตัวอย่างเสมอ ไม่ใช่ของจริง เพราะ OSM ไม่มีข้อมูลรีวิว/ความนิยม และแอปนี้
   * ยังไม่มีระบบรีวิวจริง (ดู ADR 0003 เรื่องไม่มี backend) ต้องกำกับให้ผู้ใช้เห็นเสมอว่าเป็นตัวอย่าง
   */
  mockPopularity: number;
  source: 'overpass' | 'curated';
}

/** ชื่อที่ควรแสดงจริง ๆ บนจอ ไม่มีวันเป็นสตริงว่าง เพราะ Venue ที่ไม่มีชื่อต้องแสดงประเภทแทนเสมอ */
export function venueDisplayName(venue: Venue): string {
  return venue.name && venue.name.trim().length > 0 ? venue.name : VENUE_KIND_LABEL[venue.kind];
}

/** ระยะห่างจากผู้ใช้ถึง Venue หน่วยกิโลเมตร (distanceFromUser ตาม CONTEXT.md) */
export function distanceFromUser(venue: Venue, userLocation: Coordinates): number {
  return distanceKm(userLocation, venue.coordinates);
}

/**
 * เก็บเฉพาะ Venue ที่อยู่ในระยะค้นหาจริงจากตำแหน่งผู้ใช้ ใช้กรอง Venue ที่กรอกเอง (curated) ก่อนส่งเข้า
 * mergeCuratedVenues เสมอ เพราะ curated เป็นรายการคงที่ทั้งประเทศ ไม่ได้ถูกจำกัดระยะแบบ Overpass ที่มี
 * ตัวกรอง around ในตัวอยู่แล้ว ถ้าไม่กรองซ้ำอีกชั้น Venue รอบ มจพ. ปราจีนบุรี จะโผล่ในรายการ "รอบตัว"
 * ของผู้ใช้ทุกจังหวัดทั่วประเทศ ขัดกับความหมายของคำว่า "รอบตัว" ที่จอนี้สัญญาไว้กับผู้ใช้โดยตรง
 */
export function withinSearchRadius(
  venues: readonly Venue[],
  userLocation: Coordinates,
  radiusKm: number
): Venue[] {
  return venues.filter((venue) => distanceKm(userLocation, venue.coordinates) <= radiusKm);
}

const MERGE_DISTANCE_KM = 0.05;

/**
 * ทับข้อมูล Overpass ด้วยข้อมูลที่กรอกเองด้วยการจับคู่พิกัด ไม่ใช่จับคู่ชื่อ เพราะ Venue จาก Overpass
 * มักไม่มีชื่อให้จับคู่ตั้งแต่แรก (คือปัญหาที่ตั๋วนี้ตั้งใจแก้) จุดที่ใกล้กันในระยะนี้ถือว่าเป็นที่เดียวกัน
 * ระยะ 50 เมตรเลือกจากขนาดทั่วไปของสวนสาธารณะ/ลู่วิ่งขนาดเล็ก กว้างพอจะจับคู่ศูนย์กลางที่ประมาณกันได้
 * คลาดเคลื่อนบ้าง แต่แคบพอจะไม่ทับ Venue คนละแห่งที่อยู่ใกล้กันโดยบังเอิญ
 *
 * ข้อมูลที่กรอกเองชนะทุกฟิลด์เมื่อจับคู่ได้ เพราะเป็นข้อมูลละเอียดที่ตั้งใจกรอกมาเสริม Overpass
 * ที่มักบางหรือไม่มีชื่อ Venue จาก Overpass ที่จับคู่ไม่ได้กับอะไรเลยยังคงอยู่ในผลลัพธ์ตามเดิม
 * และ Venue ที่กรอกเองที่ไม่มีพิกัดตรงกับ Overpass แห่งไหนเลยก็ยังต้องปรากฏ ไม่ใช่ถูกทิ้ง
 *
 * Venue ที่กรอกเองแต่ละแห่งจับคู่ได้แค่ครั้งเดียว (ตัดออกจากผู้สมัครทันทีที่จับคู่สำเร็จ) กันกรณี
 * Overpass คืนหลายชิ้นที่อยู่ใกล้ Venue กรอกเองแห่งเดียวกัน (เช่น node กับ way ซ้อนกันของสถานที่
 * เดียวกันจริง หรือสองสิ่งก่อสร้างในบริเวณเดียวกัน) ถ้าไม่ตัดออก ข้อมูลกรอกเองชุดเดียวจะถูกก็อปปี้
 * ไปทับซ้ำหลายใบพร้อมกัน กลายเป็นการ์ด/หมุดซ้ำที่มีชื่อและสิ่งอำนวยความสะดวกเหมือนกันเป๊ะบนจอ
 */
export function mergeCuratedVenues(overpassVenues: Venue[], curatedVenues: Venue[]): Venue[] {
  const matchedCuratedIds = new Set<string>();

  const merged = overpassVenues.map((venue) => {
    const curated = curatedVenues.find(
      (candidate) =>
        !matchedCuratedIds.has(candidate.id) &&
        distanceKm(candidate.coordinates, venue.coordinates) <= MERGE_DISTANCE_KM
    );
    if (!curated) return venue;

    matchedCuratedIds.add(curated.id);
    return { ...venue, ...curated, id: venue.id };
  });

  const unmatchedCurated = curatedVenues.filter((venue) => !matchedCuratedIds.has(venue.id));

  return [...merged, ...unmatchedCurated];
}

export type VenueSort = 'nearest' | 'popularity' | 'saved';

/**
 * เรียง Venue ตามโหมดที่เลือก ไม่กรองอะไรออก แค่จัดลำดับใหม่ (แม้เรียงตาม "ที่บันทึกไว้" ก็ยังเห็น
 * Venue ที่ยังไม่บันทึกอยู่ด้านล่าง ไม่ใช่หายไปจากรายการ)
 */
export function sortVenues(
  venues: readonly Venue[],
  sort: VenueSort,
  userLocation: Coordinates,
  savedIds: ReadonlySet<string>
): Venue[] {
  const result = [...venues];

  switch (sort) {
    case 'nearest':
      return result.sort(
        (a, b) => distanceFromUser(a, userLocation) - distanceFromUser(b, userLocation)
      );
    case 'popularity':
      return result.sort((a, b) => b.mockPopularity - a.mockPopularity);
    case 'saved':
      return result.sort((a, b) => {
        const aSaved = savedIds.has(a.id) ? 1 : 0;
        const bSaved = savedIds.has(b.id) ? 1 : 0;
        if (aSaved !== bSaved) return bSaved - aSaved;
        // อันดับรองภายในกลุ่มเดียวกัน (บันทึกไว้ทั้งคู่ หรือยังไม่บันทึกทั้งคู่) ใช้ระยะใกล้ตัดสิน
        // เพื่อให้ลำดับนิ่ง ไม่สลับไปมาแบบสุ่มทุกครั้งที่จัดเรียงใหม่
        return distanceFromUser(a, userLocation) - distanceFromUser(b, userLocation);
      });
  }
}
