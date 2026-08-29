import { describe, expect, it } from 'vitest';

import { amenitiesFromTags, buildQuery, toVenue, type OverpassElement } from './overpass';

describe('buildQuery', () => {
  it('ใส่พิกัดและรัศมีลงในตัวกรอง around ของทุกป้ายที่ค้นหา', () => {
    const query = buildQuery({ latitude: 14.164, longitude: 101.3452 }, 5000);

    expect(query).toContain('around:5000,14.164,101.3452');
    expect(query).toContain('leisure"="park"');
    expect(query).toContain('leisure"="track"');
    expect(query).toContain('out center;');
  });
});

describe('amenitiesFromTags', () => {
  it('ป้าย =yes ชัดเจน ได้ yes', () => {
    const amenities = amenitiesFromTags({ toilets: 'yes', lit: 'yes', drinking_water: 'yes' });
    expect(amenities.restroom).toBe('yes');
    expect(amenities.lighting).toBe('yes');
    expect(amenities.waterPoint).toBe('yes');
  });

  it('ป้าย =no ชัดเจน ได้ no ไม่ใช่ unknown', () => {
    const amenities = amenitiesFromTags({ toilets: 'no', lit: 'no' });
    expect(amenities.restroom).toBe('no');
    expect(amenities.lighting).toBe('no');
  });

  it('ไม่มีป้ายเลย (กรณีทั่วไปของข้อมูล OSM จริงรอบปราจีนบุรี) ต้องได้ unknown ไม่ใช่ no', () => {
    // นี่คือใจกลางของ AC "ข้อมูลที่ไม่มีต้องแสดงว่าไม่ทราบ ไม่ใช่แสดงว่าไม่มี"
    const amenities = amenitiesFromTags({});
    expect(amenities.restroom).toBe('unknown');
    expect(amenities.parking).toBe('unknown');
    expect(amenities.lighting).toBe('unknown');
    expect(amenities.waterPoint).toBe('unknown');
    expect(amenities.shop).toBe('unknown');
  });

  it('ป้ายมีค่าอื่นที่ไม่ใช่ yes/no (เช่น toilets=composting) ยังถือว่าไม่ทราบสถานะ yes/no ไม่ใช่เดา', () => {
    const amenities = amenitiesFromTags({ toilets: 'composting' });
    expect(amenities.restroom).toBe('unknown');
  });

  it('shop ไม่มีธรรมเนียม =no ใน OSM เจอป้ายถือว่ามี ไม่เจอถือว่าไม่ทราบ ไม่มีทางได้ no', () => {
    expect(amenitiesFromTags({ shop: 'convenience' }).shop).toBe('yes');
    expect(amenitiesFromTags({}).shop).toBe('unknown');
  });
});

describe('toVenue', () => {
  it('node ที่มีป้ายที่รู้จัก แปลงเป็น Venue ได้ถูกต้อง', () => {
    const element: OverpassElement = {
      type: 'node',
      id: 123,
      lat: 14.1,
      lon: 101.3,
      tags: { leisure: 'park', name: 'สวนสาธารณะทดสอบ' },
    };

    const venue = toVenue(element);

    expect(venue).not.toBeNull();
    expect(venue!.id).toBe('node/123');
    expect(venue!.name).toBe('สวนสาธารณะทดสอบ');
    expect(venue!.kind).toBe('park');
    expect(venue!.coordinates).toEqual({ latitude: 14.1, longitude: 101.3 });
    expect(venue!.source).toBe('overpass');
    expect(venue!.loopLengthKm).toBeNull();
  });

  it('way ใช้พิกัดจาก center ไม่ใช่ lat/lon ตรง ๆ เพราะ way ไม่มี lat/lon ของตัวเอง', () => {
    const element: OverpassElement = {
      type: 'way',
      id: 456,
      center: { lat: 14.2, lon: 101.4 },
      tags: { leisure: 'track' },
    };

    const venue = toVenue(element);

    expect(venue!.id).toBe('way/456');
    expect(venue!.coordinates).toEqual({ latitude: 14.2, longitude: 101.4 });
  });

  it('ไม่มีชื่อ (ปกติมากในข้อมูลจริงแถบนี้) name เป็น null ไม่ใช่สตริงว่างหรือ undefined', () => {
    const venue = toVenue({ type: 'node', id: 1, lat: 14, lon: 101, tags: { leisure: 'park' } });
    expect(venue!.name).toBeNull();
  });

  it('ไม่มีป้ายที่รู้จักเลย คืน null ไม่ใช่ Venue ประเภท other ทุกอย่างที่ดึงมา', () => {
    const venue = toVenue({ type: 'node', id: 1, lat: 14, lon: 101, tags: { amenity: 'post_box' } });
    expect(venue).toBeNull();
  });

  it('ไม่มี tags เลย คืน null ไม่ throw', () => {
    expect(toVenue({ type: 'node', id: 1, lat: 14, lon: 101 })).toBeNull();
  });

  it('way ไม่มี center (ข้อมูลไม่ครบ) คืน null แทนที่จะสร้าง Venue พิกัดเพี้ยน', () => {
    const venue = toVenue({ type: 'way', id: 1, tags: { leisure: 'park' } });
    expect(venue).toBeNull();
  });

  it('Venue เดียวกัน เรียก toVenue กี่ครั้งก็ได้ mockPopularity เท่าเดิม ไม่สุ่มใหม่ทุกครั้ง', () => {
    const element: OverpassElement = { type: 'node', id: 1, lat: 14, lon: 101, tags: { leisure: 'park' } };
    const first = toVenue(element)!.mockPopularity;
    const second = toVenue(element)!.mockPopularity;
    expect(first).toBe(second);
  });
});
