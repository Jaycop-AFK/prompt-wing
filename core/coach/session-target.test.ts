import { describe, expect, it } from 'vitest';

import {
  describeSessionTarget,
  estimateSessionSummary,
  magnitudeOf,
  reduceSessionTargetForClearance,
} from './session-target';
import type { ClearanceLevel, SessionTarget } from './types';

const DISTANCE: SessionTarget = { kind: 'distance', km: 5 };
const TIME: SessionTarget = { kind: 'time', minutes: 30 };
const CALORIES: SessionTarget = { kind: 'calories', kcal: 400 };
const ALL_TARGETS = [DISTANCE, TIME, CALORIES];

describe('magnitudeOf', () => {
  it('ดึงตัวเลขดิบตามชนิดของ SessionTarget', () => {
    expect(magnitudeOf(DISTANCE)).toBe(5);
    expect(magnitudeOf(TIME)).toBe(30);
    expect(magnitudeOf(CALORIES)).toBe(400);
  });
});

describe('describeSessionTarget', () => {
  it('ใส่หน่วยให้ตรงกับชนิด', () => {
    expect(describeSessionTarget(DISTANCE)).toContain('กม.');
    expect(describeSessionTarget(TIME)).toContain('นาที');
    expect(describeSessionTarget(CALORIES)).toContain('แคลอรี');
  });

  it('มีตัวเลขของขนาดอยู่ในข้อความ', () => {
    expect(describeSessionTarget(DISTANCE)).toContain('5');
    expect(describeSessionTarget(TIME)).toContain('30');
    expect(describeSessionTarget(CALORIES)).toContain('400');
  });
});

describe('reduceSessionTargetForClearance — สีเขียวและสีแดงไม่ลด', () => {
  const levels: ClearanceLevel[] = ['green', 'red'];

  for (const level of levels) {
    for (const target of ALL_TARGETS) {
      it(`${level} ไม่ลดเป้าหมายชนิด ${target.kind}`, () => {
        const result = reduceSessionTargetForClearance(target, level);

        expect(result.target).toEqual(target);
        expect(result.reason).toBeNull();
      });
    }
  }
});

describe('reduceSessionTargetForClearance — สีเหลืองลดเป้าหมายพร้อมเหตุผล', () => {
  for (const target of ALL_TARGETS) {
    it(`ลดขนาดของเป้าหมายชนิด ${target.kind} ลงจริง โดยชนิดยังคงเดิม`, () => {
      const result = reduceSessionTargetForClearance(target, 'yellow');

      expect(result.target.kind).toBe(target.kind);
      expect(magnitudeOf(result.target)).toBeLessThan(magnitudeOf(target));
      expect(magnitudeOf(result.target)).toBeGreaterThan(0);
    });

    it(`ให้เหตุผลเป็นข้อความที่พูดถึงทั้งค่าก่อนและหลังลดของชนิด ${target.kind}`, () => {
      const result = reduceSessionTargetForClearance(target, 'yellow');

      expect(result.reason).not.toBeNull();
      expect(result.reason).toContain('เหลือง');
      expect(result.reason).toContain(describeSessionTarget(target));
      expect(result.reason).toContain(describeSessionTarget(result.target));
    });
  }
});

describe('estimateSessionSummary — ค่าที่คำนวณย้อนกลับได้', () => {
  it('เป้าหมายเป็นเวลา ประมาณเวลาที่ใช้ต้องใกล้เคียงเวลาที่ตั้งไว้', () => {
    const summary = estimateSessionSummary(TIME, 'green');
    expect(summary.estimatedMinutes).toBeCloseTo(TIME.minutes, 0);
  });

  it('เป้าหมายเป็นแคลอรี ประมาณแคลอรีที่เผาผลาญต้องใกล้เคียงที่ตั้งไว้', () => {
    const summary = estimateSessionSummary(CALORIES, 'green');
    expect(summary.estimatedKcal).toBeCloseTo(CALORIES.kcal, -1);
  });

  it('ทุกค่าที่คำนวณเป็นบวกและจำกัดเสมอ ไม่ว่าจะตั้งเป้าหมายแบบไหน', () => {
    for (const target of ALL_TARGETS) {
      for (const level of ['green', 'yellow', 'red'] as ClearanceLevel[]) {
        const summary = estimateSessionSummary(target, level);
        expect(summary.estimatedMinutes).toBeGreaterThan(0);
        expect(summary.estimatedKcal).toBeGreaterThan(0);
        expect(summary.recommendedPaceSecPerKm).toBeGreaterThan(0);
        expect(Number.isFinite(summary.estimatedMinutes)).toBe(true);
        expect(Number.isFinite(summary.estimatedKcal)).toBe(true);
      }
    }
  });
});

describe('estimateSessionSummary — pace แนะนำช้าลงวันสีเหลือง', () => {
  it('pace ที่แนะนำวันเหลืองช้ากว่าวันเขียว สำหรับเป้าหมายเดียวกัน', () => {
    const green = estimateSessionSummary(DISTANCE, 'green');
    const yellow = estimateSessionSummary(DISTANCE, 'yellow');

    expect(yellow.recommendedPaceSecPerKm).toBeGreaterThan(green.recommendedPaceSecPerKm);
  });

  it('วันแดงใช้ pace เดียวกับวันเขียว เพราะสีแดงไม่ได้ปรับตัวเลข ใช้คำเตือนแทน', () => {
    const green = estimateSessionSummary(DISTANCE, 'green');
    const red = estimateSessionSummary(DISTANCE, 'red');

    expect(red.recommendedPaceSecPerKm).toBe(green.recommendedPaceSecPerKm);
  });
});
