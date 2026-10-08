import { describe, expect, it, vi } from 'vitest';

import {
  buildGpxTrace,
  matchTrackToRoad,
  mergeMatchedRoute,
} from './graphhopper-map-matching';

const RAW_POINTS = [
  { latitude: 14.05, longitude: 101.37, at: 1_000 },
  { latitude: 14.0501, longitude: 101.3701, at: 4_000 },
  { latitude: 14.0502, longitude: 101.3702, at: 7_000 },
  { latitude: 14.0503, longitude: 101.3703, at: 10_000 },
];

describe('GraphHopper map matching', () => {
  it('สร้าง GPX ตามลำดับ GPS พร้อมเวลาเพื่อให้ระบบจับเข้าถนนได้', () => {
    const gpx = buildGpxTrace(RAW_POINTS);

    expect(gpx).toContain('<trkpt lat="14.05" lon="101.37">');
    expect(gpx).toContain('<time>1970-01-01T00:00:01.000Z</time>');
    expect(gpx.indexOf('14.05')).toBeLessThan(gpx.indexOf('14.0503'));
  });

  it('อ่านเส้นถนนจาก GraphHopper โดยสลับ GeoJSON longitude/latitude ให้ถูกต้อง', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          paths: [{ points: { coordinates: [[101.37, 14.05], [101.3702, 14.0502]] } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await expect(matchTrackToRoad(RAW_POINTS, fetcher, 'test-key')).resolves.toEqual([
      { latitude: 14.05, longitude: 101.37 },
      { latitude: 14.0502, longitude: 101.3702 },
    ]);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' });
  });

  it('ต่อ batch ใหม่จากจุดร่วมที่ใกล้ที่สุด ไม่ลากเส้นย้อนกลับเป็นสามเหลี่ยม', () => {
    const existing = [
      { latitude: 14.05, longitude: 101.37 },
      { latitude: 14.0501, longitude: 101.3701 },
      { latitude: 14.0502, longitude: 101.3702 },
    ];
    const next = [
      { latitude: 14.0501, longitude: 101.3701 },
      { latitude: 14.0502, longitude: 101.3702 },
      { latitude: 14.0503, longitude: 101.3703 },
      { latitude: 14.0504, longitude: 101.3704 },
    ];

    expect(mergeMatchedRoute(existing, next)).toEqual([
      ...existing,
      { latitude: 14.0503, longitude: 101.3703 },
      { latitude: 14.0504, longitude: 101.3704 },
    ]);
  });
});
