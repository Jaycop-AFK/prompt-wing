import { describe, expect, it } from 'vitest';

import { distanceKm } from './geo';
import { generateCircularRoute } from './route-generator';

const START = { latitude: 14.164, longitude: 101.3452 };

describe('generateCircularRoute', () => {
  it('จุดแรกคือ start พอดี', () => {
    const route = generateCircularRoute(START, 5);
    expect(route[0].latitude).toBeCloseTo(START.latitude, 9);
    expect(route[0].longitude).toBeCloseTo(START.longitude, 9);
  });

  it('จุดสุดท้ายวนกลับมาที่ start พอดี (เส้นทางปิด)', () => {
    const route = generateCircularRoute(START, 5);
    const last = route[route.length - 1];
    expect(last.latitude).toBeCloseTo(START.latitude, 9);
    expect(last.longitude).toBeCloseTo(START.longitude, 9);
  });

  it('จุดกึ่งกลางเส้นทางอยู่ฝั่งตรงข้ามของวงกลม ห่างจาก start เท่ากับเส้นผ่านศูนย์กลาง', () => {
    const distanceRequestedKm = 10;
    const route = generateCircularRoute(START, distanceRequestedKm, 36);
    const farPoint = route[18]; // ครึ่งทางของ 36 ช่วง

    const expectedDiameterKm = distanceRequestedKm / Math.PI;
    expect(distanceKm(START, farPoint)).toBeCloseTo(expectedDiameterKm, 2);
  });

  it('เส้นรอบวงจริงใกล้เคียงระยะที่ขอ (คลาดเคลื่อนได้เล็กน้อยจากการประมาณด้วยเส้นตรงหลายท่อน)', () => {
    const distanceRequestedKm = 8;
    const route = generateCircularRoute(START, distanceRequestedKm, 36);

    let actualPerimeterKm = 0;
    for (let i = 1; i < route.length; i++) {
      actualPerimeterKm += distanceKm(route[i - 1], route[i]);
    }

    expect(actualPerimeterKm).toBeGreaterThan(distanceRequestedKm * 0.99);
    expect(actualPerimeterKm).toBeLessThanOrEqual(distanceRequestedKm);
  });

  it('ระยะที่ขอมากขึ้น ทำให้จุดที่ไกลที่สุดห่างจาก start มากขึ้นตาม', () => {
    const shortRoute = generateCircularRoute(START, 3);
    const longRoute = generateCircularRoute(START, 15);

    const maxDistance = (route: ReturnType<typeof generateCircularRoute>) =>
      Math.max(...route.map((point) => distanceKm(START, point)));

    expect(maxDistance(longRoute)).toBeGreaterThan(maxDistance(shortRoute));
  });
});
