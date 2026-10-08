import { describe, expect, it } from 'vitest';

import { getRaceEventDetail, googleMapsUrl } from '@/services/race-event-detail';

describe('race event detail', () => {
  it('adds curated place information to a known event', () => {
    const detail = getRaceEventDetail({
      id: 1,
      name: 'วิ่งการกุศลสวนหลวง',
      dateAt: new Date('2026-10-11').getTime(),
      distanceKm: 5,
      province: 'กรุงเทพมหานคร',
      feeThb: 250,
    });

    expect(detail.venueName).toBe('สวนหลวง ร.9');
    expect(detail.schedule).not.toHaveLength(0);
    expect(googleMapsUrl(detail)).toContain('13.6871,100.6636');
  });

  it('provides a safe fallback for an event without curated details', () => {
    const detail = getRaceEventDetail({
      id: 99,
      name: 'งานวิ่งใหม่',
      dateAt: Date.now(),
      distanceKm: 10,
      province: 'ขอนแก่น',
      feeThb: 0,
    });

    expect(detail.venueName).toBe('ขอนแก่น');
    expect(detail.coordinates).toEqual({ latitude: 16.4322, longitude: 102.8236 });
  });
});
