import { describe, expect, it } from 'vitest';

import { buildFormSamples, evaluateSessionFormScore } from './form-samples';
import type { TrackPoint } from './geo';

const LAT = 14.05;

/** จุด GPS เรียงเป็นเส้นตรงไปทางตะวันออก ห่างกันคงที่ทั้งระยะและเวลา (pace คงที่ตลอด) */
function buildTrack(pointCount: number, lonStep = 0.001, timeStepMs = 20000): TrackPoint[] {
  return Array.from({ length: pointCount }, (_, i) => ({
    latitude: LAT,
    longitude: 101.37 + i * lonStep,
    at: i * timeStepMs,
  }));
}

describe('buildFormSamples', () => {
  it('มีจุด GPS น้อยกว่าสอง คืนอาร์เรย์ว่าง', () => {
    expect(buildFormSamples([], [{ cadenceSpm: 170, at: 0 }])).toEqual([]);
    expect(buildFormSamples([{ latitude: LAT, longitude: 101.37, at: 0 }], [{ cadenceSpm: 170, at: 0 }])).toEqual(
      []
    );
  });

  it('ไม่มีตัวอย่าง cadence เลย คืนอาร์เรย์ว่าง', () => {
    expect(buildFormSamples(buildTrack(10), [])).toEqual([]);
  });

  it('จุด GPS ก่อนมี cadence ตัวอย่างแรกถูกข้าม ไม่ประดิษฐ์ค่า cadence ขึ้นมาเอง', () => {
    const track = buildTrack(5); // เวลา 0, 20000, 40000, 60000, 80000
    const cadence = [{ cadenceSpm: 170, at: 50000 }]; // มาถึงหลังจุดที่ 40000 แต่ก่อนจุดที่ 60000

    const samples = buildFormSamples(track, cadence);

    // สองช่วงแรก (0→20000, 20000→40000) จบก่อนที่ cadence ตัวอย่างแรกจะมาถึง เลยถูกข้าม
    // เหลือแค่สองช่วงหลัง (→60000, →80000) ที่มี cadence ให้ผูกด้วยแล้ว
    expect(samples).toHaveLength(2);
    expect(samples.every((s) => s.cadenceSpm === 170)).toBe(true);
  });

  it('cadence ผูกแบบ carry-forward ค่าล่าสุดที่รู้ ณ เวลานั้น ไม่ใช่ค่าเฉลี่ยหรือค่าถัดไป', () => {
    const track = buildTrack(4); // เวลา 0, 20000, 40000, 60000
    const cadence = [
      { cadenceSpm: 160, at: 10000 },
      { cadenceSpm: 180, at: 50000 },
    ];

    const samples = buildFormSamples(track, cadence);

    // จุดที่ 20000, 40000 ควรได้ cadence 160 (ตัวอย่างล่าสุดก่อนหน้า) จุดที่ 60000 ควรได้ 180
    expect(samples.map((s) => s.cadenceSpm)).toEqual([160, 160, 180]);
  });

  it('ระยะทางสะสมถูกต้องและ pace คำนวณจากช่วงสั้น ๆ ระหว่างจุดติดกัน', () => {
    const track = buildTrack(3, 0.001, 20000);
    const cadence = [{ cadenceSpm: 170, at: 0 }];

    const samples = buildFormSamples(track, cadence);

    expect(samples).toHaveLength(2);
    expect(samples[1].distanceKm).toBeGreaterThan(samples[0].distanceKm);
    // pace คงที่ตลอดเพราะระยะห่างและเวลาห่างระหว่างจุดคงที่ทุกช่วง
    expect(samples[1].paceSecPerKm).toBeCloseTo(samples[0].paceSecPerKm, 0);
  });

  it('จุดซ้ำตำแหน่งเดิม (ระยะทางช่วงนั้นเป็นศูนย์) ถูกข้าม ไม่ทำให้ pace เป็น Infinity', () => {
    const cadence = [{ cadenceSpm: 170, at: 0 }];
    const track: TrackPoint[] = [
      { latitude: LAT, longitude: 101.37, at: 0 },
      { latitude: LAT, longitude: 101.37, at: 20000 }, // จุดซ้ำตำแหน่งเดิม
      { latitude: LAT, longitude: 101.371, at: 40000 },
    ];

    const samples = buildFormSamples(track, cadence);

    for (const sample of samples) {
      expect(Number.isFinite(sample.paceSecPerKm)).toBe(true);
    }
  });

  it('สองจุดมีเวลาเท่ากัน (ช่วงเวลาเป็นศูนย์) ถูกข้าม ไม่ทำให้ pace เป็น Infinity', () => {
    const cadence = [{ cadenceSpm: 170, at: 0 }];
    const track: TrackPoint[] = [
      { latitude: LAT, longitude: 101.37, at: 0 },
      { latitude: LAT, longitude: 101.371, at: 0 }, // เวลาเดียวกับจุดก่อนหน้า
      { latitude: LAT, longitude: 101.372, at: 20000 },
    ];

    const samples = buildFormSamples(track, cadence);

    expect(samples.length).toBeGreaterThan(0);
    for (const sample of samples) {
      expect(Number.isFinite(sample.paceSecPerKm)).toBe(true);
    }
  });
});

describe('evaluateSessionFormScore', () => {
  it('ไม่มีตัวอย่าง cadence เลย บอกตรง ๆ ว่าไม่มีข้อมูล ไม่ใช่บอกว่า Session สั้นเกินไป', () => {
    const longTrack = buildTrack(500, 0.001, 20000); // ระยะทางไกลมาก ไม่ได้สั้นเลย
    const result = evaluateSessionFormScore(longTrack, []);

    expect(result.hasEnoughData).toBe(false);
    expect(result.summary).toContain('ไม่มีข้อมูล');
    expect(result.summary).not.toContain('สั้นเกินไป');
  });

  it('มีข้อมูลพอ ส่งต่อให้ evaluateFormScore ประเมินจริง', () => {
    const track = buildTrack(400, 0.001, 20000); // ระยะไกลพอให้มีข้อมูลเพียงพอ
    const cadence = [{ cadenceSpm: 170, at: 0 }]; // cadence คงที่ตลอด ไม่ควรถูกตัดสินว่าฟอร์มเสีย

    const result = evaluateSessionFormScore(track, cadence);

    expect(result.hasEnoughData).toBe(true);
    expect(result.cadenceDropped).toBe(false);
  });
});
