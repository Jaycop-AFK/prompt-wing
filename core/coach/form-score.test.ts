import { describe, expect, it } from 'vitest';

import { evaluateFormScore } from './form-score';
import type { FormSample } from './types';

/** สร้างชุดตัวอย่างของการวิ่งหนึ่งครั้ง ระยะห่างกันทุก 200 เมตร */
function makeRun(
  totalKm: number,
  cadenceAt: (km: number) => number,
  paceAt: (km: number) => number
): FormSample[] {
  const samples: FormSample[] = [];
  const step = 0.2;

  for (let km = step; km < totalKm; km += step) {
    samples.push({ distanceKm: km, cadenceSpm: cadenceAt(km), paceSecPerKm: paceAt(km) });
  }
  samples.push({ distanceKm: totalKm, cadenceSpm: cadenceAt(totalKm), paceSecPerKm: paceAt(totalKm) });

  return samples;
}

const CONSTANT_CADENCE = () => 170;
const CONSTANT_PACE = () => 300;

describe('evaluateFormScore — cadence คงที่ตลอด', () => {
  it('ไม่ถูกตัดสินว่าฟอร์มเสีย', () => {
    const run = makeRun(5, CONSTANT_CADENCE, CONSTANT_PACE);
    const result = evaluateFormScore(run);

    expect(result.hasEnoughData).toBe(true);
    expect(result.cadenceDropped).toBe(false);
  });

  it('เมื่อ pace ก็คงที่ด้วย ผลลัพธ์เป็นบวก', () => {
    const run = makeRun(5, CONSTANT_CADENCE, CONSTANT_PACE);
    const result = evaluateFormScore(run);

    expect(result.paceDropped).toBe(false);
    expect(result.summary.length).toBeGreaterThan(0);
  });
});

describe('evaluateFormScore — cadence ตกช่วงท้าย', () => {
  const droppingCadence = (km: number) => (km >= 4 ? 150 : 170);
  const run = makeRun(5, droppingCadence, CONSTANT_PACE);
  const result = evaluateFormScore(run);

  it('จับได้ว่า cadence ตก', () => {
    expect(result.hasEnoughData).toBe(true);
    expect(result.cadenceDropped).toBe(true);
  });

  it('ประโยคบอกตัวเลขจริงของ cadence ก่อนและหลัง ไม่ใช่แค่บอกว่าตก', () => {
    expect(result.summary).toContain('170');
    expect(result.summary).toContain('150');
  });

  it('เชื่อมโยงกับความเสี่ยงบาดเจ็บ ไม่ใช่แค่รายงานตัวเลข', () => {
    expect(result.summary).toMatch(/หน้าแข้ง|น่อง/);
  });

  it('cadence ที่ตกเพียงเล็กน้อยไม่ถึงเกณฑ์ ไม่ถูกจับว่าตก', () => {
    const barelyDropping = (km: number) => (km >= 4 ? 168 : 170); // ตกแค่ ~1.2%
    const barelyResult = evaluateFormScore(makeRun(5, barelyDropping, CONSTANT_PACE));

    expect(barelyResult.cadenceDropped).toBe(false);
  });
});

describe('evaluateFormScore — pace ตกช่วงท้าย', () => {
  it('จับได้ว่า pace ช้าลง เมื่อ cadence ยังคงที่', () => {
    const droppingPace = (km: number) => (km >= 4 ? 340 : 300);
    const run = makeRun(5, CONSTANT_CADENCE, droppingPace);
    const result = evaluateFormScore(run);

    expect(result.paceDropped).toBe(true);
    expect(result.cadenceDropped).toBe(false);
  });

  it('pace ที่ช้าลงเพียงเล็กน้อยไม่ถึงเกณฑ์ ไม่ถูกจับว่าตก', () => {
    const barelySlower = (km: number) => (km >= 4 ? 305 : 300); // ช้าลงแค่ ~1.7%
    const result = evaluateFormScore(makeRun(5, CONSTANT_CADENCE, barelySlower));

    expect(result.paceDropped).toBe(false);
  });
});

describe('evaluateFormScore — เมื่อทั้งสองสัญญาณตกพร้อมกัน', () => {
  it('รายงานทั้งคู่ และประโยคให้น้ำหนักกับ cadence ซึ่งเกี่ยวกับบาดเจ็บมากกว่า', () => {
    const bothDrop = makeRun(
      5,
      (km) => (km >= 4 ? 150 : 170),
      (km) => (km >= 4 ? 340 : 300)
    );
    const result = evaluateFormScore(bothDrop);

    expect(result.cadenceDropped).toBe(true);
    expect(result.paceDropped).toBe(true);
    expect(result.summary).toMatch(/หน้าแข้ง|น่อง/);
  });
});

describe('evaluateFormScore — Session สั้นเกินไป', () => {
  it('ระยะรวมสั้นเกินไปคืนผลว่าข้อมูลไม่พอ ไม่เดาฟอร์ม', () => {
    const shortRun = makeRun(1, CONSTANT_CADENCE, CONSTANT_PACE);
    const result = evaluateFormScore(shortRun);

    expect(result.hasEnoughData).toBe(false);
    expect(result.cadenceDropped).toBe(false);
    expect(result.paceDropped).toBe(false);
    expect(result.summary).toMatch(/สั้น|ไม่พอ/);
  });

  it('ไม่มีตัวอย่างเลยก็ไม่พัง และบอกว่าข้อมูลไม่พอ', () => {
    const result = evaluateFormScore([]);

    expect(result.hasEnoughData).toBe(false);
    expect(result.summary.length).toBeGreaterThan(0);
  });
});

describe('evaluateFormScore — ประโยคสรุปมีเสมอ', () => {
  it('ทุกสถานการณ์ได้ประโยคภาษาไทยที่ไม่ว่างเปล่า', () => {
    const scenarios: FormSample[][] = [
      [],
      makeRun(1, CONSTANT_CADENCE, CONSTANT_PACE),
      makeRun(5, CONSTANT_CADENCE, CONSTANT_PACE),
      makeRun(5, (km) => (km >= 4 ? 150 : 170), CONSTANT_PACE),
      makeRun(5, CONSTANT_CADENCE, (km) => (km >= 4 ? 340 : 300)),
    ];

    for (const scenario of scenarios) {
      const result = evaluateFormScore(scenario);
      expect(result.summary.length).toBeGreaterThan(0);
    }
  });
});
