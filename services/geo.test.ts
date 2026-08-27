import { describe, expect, it } from 'vitest';

import { distanceKm, trackDistanceKm, type Coordinates } from './geo';

// กรุงเทพฯ กับเชียงใหม่ ระยะทางตรงจริงประมาณ 580-590 กม. ใช้เป็นค่าอ้างอิงตรวจสูตร haversine
const BANGKOK: Coordinates = { latitude: 13.7563, longitude: 100.5018 };
const CHIANG_MAI: Coordinates = { latitude: 18.7883, longitude: 98.9853 };

describe('distanceKm', () => {
  it('จุดเดียวกันมีระยะทางเป็นศูนย์', () => {
    expect(distanceKm(BANGKOK, BANGKOK)).toBeCloseTo(0, 5);
  });

  it('คำนวณระยะทางไกลได้ใกล้เคียงค่าจริงที่รู้อยู่แล้ว', () => {
    expect(distanceKm(BANGKOK, CHIANG_MAI)).toBeGreaterThan(580);
    expect(distanceKm(BANGKOK, CHIANG_MAI)).toBeLessThan(590);
  });

  it('เป็นไปทางเดียวกันไม่ว่าจะคำนวณจากทิศไหน', () => {
    expect(distanceKm(BANGKOK, CHIANG_MAI)).toBeCloseTo(distanceKm(CHIANG_MAI, BANGKOK), 6);
  });

  it('ระยะสั้นระดับวิ่งจริง ให้ผลใกล้เคียงระยะที่คำนวณด้วยมือ', () => {
    // ที่ละติจูดประมาณนี้ 1 องศาลองจิจูด (ตะวันออก-ตะวันตก) ยาวประมาณ 108.3 กม.
    // ขยับ 0.0001 องศา (ตะวันออก) ควรได้ระยะทางประมาณ 10.83 เมตร
    const a: Coordinates = { latitude: 14.05, longitude: 101.37 };
    const b: Coordinates = { latitude: 14.05, longitude: 101.3701 };

    const meters = distanceKm(a, b) * 1000;
    expect(meters).toBeGreaterThan(9);
    expect(meters).toBeLessThan(13);
  });
});

describe('trackDistanceKm', () => {
  it('ไม่มีจุดหรือมีจุดเดียว ระยะทางเป็นศูนย์', () => {
    expect(trackDistanceKm([])).toBe(0);
    expect(trackDistanceKm([BANGKOK])).toBe(0);
  });

  it('สองจุดเท่ากับ distanceKm ตรง ๆ ของสองจุดนั้น', () => {
    expect(trackDistanceKm([BANGKOK, CHIANG_MAI])).toBeCloseTo(distanceKm(BANGKOK, CHIANG_MAI), 9);
  });

  it('บวกระยะทุกช่วงต่อกันไปเรื่อย ๆ ไม่ใช่แค่จุดแรกกับจุดสุดท้าย', () => {
    // สามจุดที่ไม่เรียงเป็นเส้นตรง ผลรวมของแต่ละช่วงต้องมากกว่าระยะตรงจากจุดแรกถึงจุดสุดท้าย
    const a: Coordinates = { latitude: 14.05, longitude: 101.37 };
    const b: Coordinates = { latitude: 14.06, longitude: 101.37 };
    const c: Coordinates = { latitude: 14.05, longitude: 101.38 };

    const viaB = trackDistanceKm([a, b, c]);
    const direct = distanceKm(a, c);

    expect(viaB).toBeGreaterThan(direct);
  });

  it('จุดที่ซ้ำตำแหน่งเดิมไม่เพิ่มระยะทาง', () => {
    const a: Coordinates = { latitude: 14.05, longitude: 101.37 };
    expect(trackDistanceKm([a, a, a])).toBe(0);
  });
});
