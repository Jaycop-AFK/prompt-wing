import { describe, expect, it } from 'vitest';

import {
  averagePaceSecPerKm,
  bestPaceSecPerKm,
  computeSplits,
  currentPaceSecPerKm,
  distanceKm,
  isTrackPointUsable,
  runSaveReadiness,
  trackDistanceKm,
  type Coordinates,
  type TrackPoint,
} from './geo';

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

describe('live run GPS guardrails', () => {
  it('กรณีจากภาพ 0.01 กม. ใน 2 วินาที ยังห้ามแสดง pace หรือบันทึกเป็นการวิ่งจริง', () => {
    expect(averagePaceSecPerKm(0.01, 2)).toBeNull();
    expect(runSaveReadiness(0.01, 2, 2)).not.toBe('ready');
  });

  it('เมื่อมีระยะ เวลา และจุด GPS เพียงพอ จึงคำนวณ pace และบันทึกได้', () => {
    expect(averagePaceSecPerKm(0.05, 20)).toBe(400);
    expect(runSaveReadiness(0.05, 20, 4)).toBe('ready');
  });

  it('ตัดจุด GPS ที่ความแม่นยำแย่หรือกระโดดเร็วเกินมนุษย์วิ่ง', () => {
    const first: TrackPoint = {
      latitude: 14.05,
      longitude: 101.37,
      at: 10_000,
      accuracyMeters: 5,
    };
    const inaccurate: TrackPoint = {
      latitude: 14.0501,
      longitude: 101.3701,
      at: 13_000,
      accuracyMeters: 80,
    };
    const teleported: TrackPoint = {
      latitude: 14.06,
      longitude: 101.38,
      at: 13_000,
      accuracyMeters: 5,
    };

    expect(isTrackPointUsable(inaccurate, first)).toBe(false);
    expect(isTrackPointUsable(teleported, first)).toBe(false);
  });
});

describe('live pace metrics', () => {
  const steadyTrack: TrackPoint[] = Array.from({ length: 8 }, (_, index) => ({
    latitude: 14.05,
    longitude: 101.37 + index * 0.0001,
    at: index * 3_000,
  }));

  it('ยังไม่แสดง pace ปัจจุบันถ้าจุดหรือระยะล่าสุดน้อยเกินไป', () => {
    expect(currentPaceSecPerKm(steadyTrack.slice(0, 2))).toBeNull();
  });

  it('pace ปัจจุบันคำนวณจากช่วงล่าสุด ไม่เอาค่าเฉลี่ยทั้งการวิ่งมาปน', () => {
    const oldPoint: TrackPoint = {
      latitude: 14.05,
      longitude: 101.36,
      at: -120_000,
    };
    expect(currentPaceSecPerKm([oldPoint, ...steadyTrack])).toBeCloseTo(
      currentPaceSecPerKm(steadyTrack)!,
      5
    );
  });

  it('หา pace ที่ดีที่สุดจากช่วงต่อเนื่องที่มีข้อมูลมากพอ ไม่ใช้ GPS spike จุดเดียว', () => {
    const slowerThenFaster: TrackPoint[] = [
      { latitude: 14.05, longitude: 101.37, at: 0 },
      { latitude: 14.05, longitude: 101.3702, at: 6_000 },
      { latitude: 14.05, longitude: 101.3704, at: 12_000 },
      { latitude: 14.05, longitude: 101.3708, at: 18_000 },
      { latitude: 14.05, longitude: 101.3712, at: 24_000 },
    ];

    const best = bestPaceSecPerKm(slowerThenFaster);
    expect(best).not.toBeNull();
    expect(best!).toBeLessThan(currentPaceSecPerKm(slowerThenFaster.slice(0, 3))!);
  });
});

describe('computeSplits', () => {
  const LAT = 14.05;
  const LON_STEP = 0.001; // ระยะห่างจุดต่อจุดคงที่ตลอด ประมาณ 111 เมตรที่ละติจูดนี้
  const TIME_STEP_MS = 20000;

  function buildConstantPaceTrack(pointCount: number): TrackPoint[] {
    return Array.from({ length: pointCount }, (_, i) => ({
      latitude: LAT,
      longitude: 101.37 + i * LON_STEP,
      at: i * TIME_STEP_MS,
    }));
  }

  it('ไม่มีจุดหรือมีจุดเดียว ไม่มี Split เลย', () => {
    expect(computeSplits([])).toEqual([]);
    expect(computeSplits([{ latitude: LAT, longitude: 101.37, at: 0 }])).toEqual([]);
  });

  it('วิ่งไม่ถึงหนึ่งกิโลเมตร ไม่มี Split เลย', () => {
    expect(computeSplits(buildConstantPaceTrack(3))).toEqual([]);
  });

  it('กิโลเมตรถูกนับเรียงลำดับ 1, 2, 3, ... ไม่กระโดดข้าม', () => {
    const splits = computeSplits(buildConstantPaceTrack(60));
    expect(splits.length).toBeGreaterThanOrEqual(5);
    splits.forEach((split, i) => expect(split.km).toBe(i + 1));
  });

  it('pace คงที่ตลอดทาง (ความเร็วเท่ากันทุกช่วง) ทุก Split ต้องได้ pace ใกล้เคียงกันมาก', () => {
    const splits = computeSplits(buildConstantPaceTrack(60));
    const firstPace = splits[0].paceSecPerKm;
    for (const split of splits) {
      expect(split.paceSecPerKm).toBeCloseTo(firstPace, 0);
    }
  });

  it('วิ่งช้าลงครึ่งหลัง Split ท้ายต้องช้ากว่า Split ต้น', () => {
    const half = 30;
    const points: TrackPoint[] = [];
    let at = 0;
    for (let i = 0; i < 60; i++) {
      points.push({ latitude: LAT, longitude: 101.37 + i * LON_STEP, at });
      at += i < half ? TIME_STEP_MS : TIME_STEP_MS * 2;
    }

    const splits = computeSplits(points);
    expect(splits[splits.length - 1].paceSecPerKm).toBeGreaterThan(splits[0].paceSecPerKm);
  });
});
