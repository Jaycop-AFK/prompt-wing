import { describe, expect, it } from 'vitest';

import type { Coordinates } from './geo';
import {
  distanceFromUser,
  mergeCuratedVenues,
  sortVenues,
  UNKNOWN_AMENITIES,
  venueDisplayName,
  withinSearchRadius,
  type Venue,
} from './venue';

const USER: Coordinates = { latitude: 14.164, longitude: 101.3452 };

function venue(overrides: Partial<Venue> & { id: string; coordinates: Coordinates }): Venue {
  return {
    name: null,
    kind: 'other',
    amenities: UNKNOWN_AMENITIES,
    loopLengthKm: null,
    mockPopularity: 0,
    source: 'overpass',
    ...overrides,
  };
}

/** พิกัดที่ห่างจาก USER ไปทางเหนือประมาณ N องศาละติจูด (มากพอที่จะไม่ใกล้กันโดยบังเอิญ) */
const at = (latOffset: number, lonOffset = 0): Coordinates => ({
  latitude: USER.latitude + latOffset,
  longitude: USER.longitude + lonOffset,
});

describe('venueDisplayName', () => {
  it('มีชื่อ แสดงชื่อ', () => {
    expect(venueDisplayName(venue({ id: '1', coordinates: USER, name: 'สวนเฉลิมพระเกียรติ' }))).toBe(
      'สวนเฉลิมพระเกียรติ'
    );
  });

  it('ไม่มีชื่อ แสดงประเภทแทน ไม่ใช่ค่าว่าง', () => {
    const name = venueDisplayName(venue({ id: '1', coordinates: USER, name: null, kind: 'park' }));
    expect(name).toBe('สวนสาธารณะ');
    expect(name.length).toBeGreaterThan(0);
  });

  it('ชื่อเป็นสตริงว่างหรือช่องว่างล้วน ถือว่าไม่มีชื่อเหมือนกัน', () => {
    expect(venueDisplayName(venue({ id: '1', coordinates: USER, name: '', kind: 'track' }))).toBe(
      'ลู่วิ่ง'
    );
    expect(venueDisplayName(venue({ id: '1', coordinates: USER, name: '   ', kind: 'track' }))).toBe(
      'ลู่วิ่ง'
    );
  });
});

describe('distanceFromUser', () => {
  it('จุดเดียวกับผู้ใช้ ระยะเป็นศูนย์', () => {
    expect(distanceFromUser(venue({ id: '1', coordinates: USER }), USER)).toBeCloseTo(0, 5);
  });
});

describe('mergeCuratedVenues', () => {
  it('พิกัดตรงกัน ข้อมูลที่กรอกเองทับทุกฟิลด์ของ Overpass', () => {
    const fromOverpass = venue({ id: 'osm/1', coordinates: USER, name: null, kind: 'other' });
    const curated = venue({
      id: 'curated/1',
      coordinates: USER,
      name: 'สนามกีฬา มจพ.',
      kind: 'sportsCentre',
      amenities: { ...UNKNOWN_AMENITIES, restroom: 'yes' },
    });

    const merged = mergeCuratedVenues([fromOverpass], [curated]);

    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe('สนามกีฬา มจพ.');
    expect(merged[0].amenities.restroom).toBe('yes');
    // id ยังคงเป็นของ Overpass เพื่อให้ระบบบันทึกที่ชอบ (ผูกกับ id เดิม) ไม่หลุดถ้าข้อมูลกรอกเองเปลี่ยน
    expect(merged[0].id).toBe('osm/1');
  });

  it('พิกัดไม่ตรงกันเลย ทั้งสองฝั่งยังปรากฏแยกกัน ไม่มีใครถูกทิ้ง', () => {
    const fromOverpass = venue({ id: 'osm/1', coordinates: at(0.01), name: null });
    const curated = venue({ id: 'curated/1', coordinates: at(-0.01), name: 'ที่วิ่งลับ' });

    const merged = mergeCuratedVenues([fromOverpass], [curated]);

    expect(merged).toHaveLength(2);
    expect(merged.some((v) => v.id === 'osm/1')).toBe(true);
    expect(merged.some((v) => v.id === 'curated/1')).toBe(true);
  });

  it('พิกัดใกล้กันมากแต่ยังไม่ถึงระยะจับคู่ ต้องไม่ถูกทับกัน', () => {
    // ~0.2 องศาละติจูด ห่างกันหลายสิบกิโลเมตร ไกลเกินระยะจับคู่ 50 เมตรไปมาก
    const fromOverpass = venue({ id: 'osm/1', coordinates: USER });
    const curated = venue({ id: 'curated/1', coordinates: at(0.2) });

    const merged = mergeCuratedVenues([fromOverpass], [curated]);

    expect(merged).toHaveLength(2);
  });

  it('Overpass คืนสองชิ้นใกล้ Venue ที่กรอกเองแห่งเดียวกัน จับคู่ได้แค่ชิ้นแรก ไม่ก็อปข้อมูลไปทับซ้ำสองใบ', () => {
    // สถานการณ์จริง: node กับ way ของสถานที่เดียวกันอยู่ใกล้กันมาก หรือมีสองสิ่งก่อสร้างในย่านเดียวกัน
    const first = venue({ id: 'osm/1', coordinates: USER, name: null });
    const second = venue({ id: 'osm/2', coordinates: at(0.0002), name: null }); // ~20ม. จาก USER
    const curated = venue({ id: 'curated/1', coordinates: USER, name: 'สนามกีฬา มจพ.' });

    const merged = mergeCuratedVenues([first, second], [curated]);

    const namedCount = merged.filter((v) => v.name === 'สนามกีฬา มจพ.').length;
    expect(namedCount).toBe(1);
    expect(merged).toHaveLength(2);
  });

  it('ไม่มีข้อมูล Overpass เลย ข้อมูลที่กรอกเองยังต้องปรากฏ', () => {
    const curated = venue({ id: 'curated/1', coordinates: USER, name: 'ที่วิ่งลับ' });
    expect(mergeCuratedVenues([], [curated])).toEqual([curated]);
  });

  it('พิกัดจริงของศูนย์กีฬา มจพ. ปราจีนบุรี ต้องจับคู่กัน (ยืนยันจากการยิง Overpass จริงระหว่างพัฒนา)', () => {
    // way/1156848812 คือ "อาคารศูนย์กีฬาเฉลิมพระเกียรติ" ตัว OSM จริงที่ยิงเจอ ห่างจากพิกัดที่กรอกเอง
    // ใน services/curated-venues.ts ไม่ถึง 10 เมตร ถ้าใครมาแก้ MERGE_DISTANCE_KM แคบลงในอนาคตจนคู่นี้
    // จับกันไม่ติด เทสต์นี้จะจับได้ทันที ไม่ต้องรอไปเจอตอนเดโมสด
    const realOverpassResult = venue({
      id: 'way/1156848812',
      coordinates: { latitude: 14.1640787, longitude: 101.3452219 },
      name: 'อาคารศูนย์กีฬาเฉลิมพระเกียรติ',
      kind: 'sportsCentre',
    });
    const curated = venue({
      id: 'curated/kmutnb-prachinburi-sports-centre',
      coordinates: { latitude: 14.1640787, longitude: 101.3452219 },
      name: 'อาคารศูนย์กีฬาเฉลิมพระเกียรติ',
      kind: 'sportsCentre',
      amenities: { ...UNKNOWN_AMENITIES, restroom: 'yes', parking: 'yes' },
    });

    const merged = mergeCuratedVenues([realOverpassResult], [curated]);

    expect(merged).toHaveLength(1);
    expect(merged[0].amenities.restroom).toBe('yes');
  });
});

describe('sortVenues', () => {
  const near = venue({ id: 'near', coordinates: at(0.001), mockPopularity: 1 });
  const far = venue({ id: 'far', coordinates: at(0.05), mockPopularity: 9 });

  it('เรียงตามระยะใกล้ ใกล้ก่อนไกล', () => {
    const sorted = sortVenues([far, near], 'nearest', USER, new Set());
    expect(sorted.map((v) => v.id)).toEqual(['near', 'far']);
  });

  it('เรียงตามความนิยม มากก่อนน้อย', () => {
    const sorted = sortVenues([near, far], 'popularity', USER, new Set());
    expect(sorted.map((v) => v.id)).toEqual(['far', 'near']);
  });

  it('เรียงตามที่บันทึกไว้ ที่บันทึกแล้วขึ้นก่อนเสมอ แต่ที่ยังไม่บันทึกยังอยู่ในรายการ', () => {
    const sorted = sortVenues([near, far], 'saved', USER, new Set(['far']));
    expect(sorted.map((v) => v.id)).toEqual(['far', 'near']);
    expect(sorted).toHaveLength(2);
  });

  it('ไม่มีอะไรถูกบันทึกเลย เรียงตามที่บันทึกไว้ก็ยังคืนครบทุกรายการ (ใช้ระยะใกล้ตัดสินรอง)', () => {
    const sorted = sortVenues([far, near], 'saved', USER, new Set());
    expect(sorted.map((v) => v.id)).toEqual(['near', 'far']);
  });

  it('ไม่แก้ไขอาร์เรย์ต้นฉบับ', () => {
    const input = [far, near];
    sortVenues(input, 'nearest', USER, new Set());
    expect(input).toEqual([far, near]);
  });
});

describe('withinSearchRadius', () => {
  it('เก็บเฉพาะ Venue ที่อยู่ในระยะที่กำหนด ตัด Venue ที่ไกลเกินทิ้ง', () => {
    const near = venue({ id: 'near', coordinates: at(0.001) }); // ~110 ม.
    const far = venue({ id: 'far', coordinates: at(1) }); // ~111 กม.

    const result = withinSearchRadius([near, far], USER, 5);

    expect(result.map((v) => v.id)).toEqual(['near']);
  });

  it('ป้องกันไม่ให้ Venue ที่กรอกเองรอบ มจพ. ปราจีนบุรี โผล่ในรายการของผู้ใช้ทุกจังหวัดทั่วประเทศ', () => {
    // จำลองผู้ใช้ที่กรุงเทพ ห่างจากปราจีนบุรีจริงหลายสิบกิโลเมตร
    const bangkok: Coordinates = { latitude: 13.7563, longitude: 100.5018 };
    const kmutnbPrachinburi = venue({
      id: 'curated/kmutnb',
      coordinates: { latitude: 14.164, longitude: 101.3452 },
    });

    expect(withinSearchRadius([kmutnbPrachinburi], bangkok, 5)).toEqual([]);
  });

  it('ระยะเท่ากับขอบเขตพอดี ยังนับว่าอยู่ในระยะ', () => {
    const venueAtExactDistance = venue({ id: '1', coordinates: at(0.001) });
    const exactRadiusKm = distanceFromUser(venueAtExactDistance, USER);

    expect(withinSearchRadius([venueAtExactDistance], USER, exactRadiusKm)).toHaveLength(1);
  });

  it('ไม่มี Venue เลย คืนอาร์เรย์ว่าง', () => {
    expect(withinSearchRadius([], USER, 5)).toEqual([]);
  });
});
