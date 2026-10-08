import { describe, expect, it } from 'vitest';

import { mapCenterFromLocation } from './live-location';
import { isTrackPointUsable } from './geo';

describe('live map initial location', () => {
  it('ใช้ GPS accuracy 80 เมตรจัดกล้องเข้าหามือถือได้ แต่ไม่เอาไปเพิ่มระยะวิ่ง', () => {
    const location = {
      coords: { latitude: 14.164, longitude: 101.3452, accuracy: 80 },
      timestamp: 1_000,
    };

    expect(mapCenterFromLocation(location)).toEqual({
      latitude: 14.164,
      longitude: 101.3452,
      accuracyMeters: 80,
    });
    expect(
      isTrackPointUsable({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracyMeters: location.coords.accuracy,
        at: location.timestamp,
      })
    ).toBe(false);
  });

  it('ไม่ยอมจัดกล้องด้วยพิกัดเสียหรือคลาดเคลื่อนระดับหลายกิโลเมตร', () => {
    expect(
      mapCenterFromLocation({
        coords: { latitude: 999, longitude: 101.3452, accuracy: 10 },
      })
    ).toBeNull();
    expect(
      mapCenterFromLocation({
        coords: { latitude: 14.164, longitude: 101.3452, accuracy: 20_000 },
      })
    ).toBeNull();
  });
});
