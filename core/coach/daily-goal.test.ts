import { describe, expect, it } from 'vitest';

import { computeDailyGoal } from './daily-goal';
import type { Objective, RunHistoryEntry } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 7, 27, 6, 0, 0);

const daysAgo = (n: number) => NOW - n * DAY_MS;

const OBJECTIVES: Objective[] = ['loseWeight', 'health', 'marathon', 'endurance'];

describe('computeDailyGoal — แต่ละเป้าหมายให้ผลต่างกันจริง', () => {
  it('ทั้งสี่เป้าหมายให้ระยะทางไม่เท่ากันเลยสักคู่ เมื่อไม่มีประวัติ', () => {
    const results = OBJECTIVES.map(
      (objective) => computeDailyGoal({ objective, history: [], now: NOW }).distanceKm
    );

    const unique = new Set(results.map((km) => km.toFixed(4)));
    expect(unique.size).toBe(OBJECTIVES.length);
  });

  it.each(['loseWeight', 'health'] as const)(
    '%s ให้ระยะคงที่ไม่ว่าประวัติจะเป็นอย่างไร',
    (objective) => {
      const noHistory = computeDailyGoal({ objective, history: [], now: NOW });
      const heavyHistory = computeDailyGoal({
        objective,
        history: [{ at: daysAgo(1), distanceKm: 20 }],
        now: NOW,
      });

      expect(noHistory.distanceKm).toBe(heavyHistory.distanceKm);
    }
  );
});

describe('computeDailyGoal — มาราธอนไม่เพิ่มระยะเกิน 10% ต่อสัปดาห์', () => {
  it('สัปดาห์ที่แล้ววิ่งรวม 20 กม. เป้าหมายรายวันต้องไม่เกิน 22/4 กม.', () => {
    const goal = computeDailyGoal({
      objective: 'marathon',
      history: [
        { at: daysAgo(1), distanceKm: 8 },
        { at: daysAgo(3), distanceKm: 7 },
        { at: daysAgo(5), distanceKm: 5 },
      ],
      now: NOW,
    });

    expect(goal.distanceKm).toBeLessThanOrEqual((20 * 1.1) / 4 + 1e-9);
  });

  it('ไม่นับระยะที่เกินเจ็ดวันย้อนหลังเข้าไปในสัปดาห์นี้', () => {
    const withOldRun = computeDailyGoal({
      objective: 'marathon',
      history: [
        { at: daysAgo(2), distanceKm: 10 },
        { at: daysAgo(10), distanceKm: 100 },
      ],
      now: NOW,
    });
    const withoutOldRun = computeDailyGoal({
      objective: 'marathon',
      history: [{ at: daysAgo(2), distanceKm: 10 }],
      now: NOW,
    });

    expect(withOldRun.distanceKm).toBeCloseTo(withoutOldRun.distanceKm, 5);
  });

  it('ไม่นับระยะที่อยู่ในอนาคตของ now', () => {
    const goal = computeDailyGoal({
      objective: 'marathon',
      history: [
        { at: daysAgo(2), distanceKm: 8 },
        { at: NOW + DAY_MS, distanceKm: 999 },
      ],
      now: NOW,
    });

    expect(goal.distanceKm).toBeCloseTo((8 * 1.1) / 4, 5);
  });

  it('สัปดาห์ที่วิ่งมาก เป้าหมายสัปดาห์ถัดไปมากกว่าสัปดาห์ที่วิ่งน้อย', () => {
    const lightWeek = computeDailyGoal({
      objective: 'marathon',
      history: [{ at: daysAgo(2), distanceKm: 10 }],
      now: NOW,
    });
    const heavyWeek = computeDailyGoal({
      objective: 'marathon',
      history: [
        { at: daysAgo(2), distanceKm: 15 },
        { at: daysAgo(4), distanceKm: 12 },
        { at: daysAgo(6), distanceKm: 10 },
      ],
      now: NOW,
    });

    expect(heavyWeek.distanceKm).toBeGreaterThan(lightWeek.distanceKm);
  });

  it('ระยะรายวันไม่มีทางเกิน 10% ของค่าเฉลี่ยรายวันของสัปดาห์ก่อนไม่ว่าประวัติจะเป็นอย่างไร', () => {
    const scenarios: RunHistoryEntry[][] = [
      [{ at: daysAgo(1), distanceKm: 5 }],
      [
        { at: daysAgo(1), distanceKm: 3 },
        { at: daysAgo(4), distanceKm: 3 },
      ],
      [
        { at: daysAgo(1), distanceKm: 12 },
        { at: daysAgo(2), distanceKm: 12 },
        { at: daysAgo(3), distanceKm: 12 },
      ],
    ];

    for (const history of scenarios) {
      const weeklyTotal = history.reduce((sum, entry) => sum + entry.distanceKm, 0);
      const goal = computeDailyGoal({ objective: 'marathon', history, now: NOW });

      expect(goal.distanceKm * 4).toBeLessThanOrEqual(weeklyTotal * 1.1 + 1e-9);
    }
  });
});

describe('computeDailyGoal — เพิ่มความอึดสลับวันหนักเบา', () => {
  it('ยังไม่มีประวัติเลย เริ่มด้วยวันเบาก่อน', () => {
    const goal = computeDailyGoal({ objective: 'endurance', history: [], now: NOW });
    const heavyGoal = computeDailyGoal({
      objective: 'endurance',
      history: [{ at: daysAgo(1), distanceKm: 5 }],
      now: NOW,
    });

    expect(goal.distanceKm).toBeLessThan(heavyGoal.distanceKm);
  });

  it('สลับหนักเบาสองค่าเท่านั้น ไม่ไล่ระดับต่อเนื่อง', () => {
    const results = new Set(
      Array.from({ length: 6 }, (_, count) =>
        computeDailyGoal({
          objective: 'endurance',
          history: Array.from({ length: count }, (_, i) => ({ at: daysAgo(i + 1), distanceKm: 5 })),
          now: NOW,
        }).distanceKm
      )
    );

    expect(results.size).toBe(2);
  });
});

describe('computeDailyGoal — ไม่มีประวัติได้ค่าเริ่มต้นที่ปลอดภัย', () => {
  it('ทุกเป้าหมายให้ค่าที่เป็นบวกและไม่สูงเกินจริงเมื่อไม่มีประวัติ', () => {
    for (const objective of OBJECTIVES) {
      const goal = computeDailyGoal({ objective, history: [], now: NOW });
      expect(goal.distanceKm).toBeGreaterThan(0);
      expect(goal.distanceKm).toBeLessThanOrEqual(10);
    }
  });
});

describe('computeDailyGoal — เป้าหมายของวันนี้ต้องนิ่งตลอดวัน', () => {
  /** เที่ยงวันของวันนี้ตามเขตเวลาเครื่อง ให้แน่ใจว่าอยู่ในวันเดียวกับ NOW เสมอ */
  function earlierToday(): number {
    const d = new Date(NOW);
    d.setHours(0, 30, 0, 0);
    return d.getTime();
  }

  it('วิ่งจบวันนี้แล้ว เป้าหมายของวันนี้ต้องไม่เปลี่ยน ไม่งั้นแถบความคืบหน้าจะถอยหลัง', () => {
    for (const objective of OBJECTIVES) {
      const before = computeDailyGoal({ objective, history: [], now: NOW });
      const after = computeDailyGoal({
        objective,
        history: [{ at: earlierToday(), distanceKm: 5 }],
        now: NOW,
      });

      expect(after.distanceKm).toBe(before.distanceKm);
    }
  });

  it('วิ่งหลายครั้งในวันนี้ก็ยังไม่ขยับเป้าหมายของวันนี้', () => {
    const history: RunHistoryEntry[] = [
      { at: earlierToday(), distanceKm: 4 },
      { at: earlierToday() + 60 * 60 * 1000, distanceKm: 6 },
    ];

    for (const objective of OBJECTIVES) {
      expect(computeDailyGoal({ objective, history, now: NOW }).distanceKm).toBe(
        computeDailyGoal({ objective, history: [], now: NOW }).distanceKm
      );
    }
  });

  it('การวิ่งของเมื่อวานยังมีผลกับเป้าหมายของวันนี้ตามปกติ', () => {
    // ตัดเฉพาะของวันนี้เท่านั้น ไม่ใช่ตัดประวัติทั้งหมดทิ้ง
    const yesterday = computeDailyGoal({
      objective: 'endurance',
      history: [{ at: daysAgo(1), distanceKm: 5 }],
      now: NOW,
    });

    expect(yesterday.distanceKm).not.toBe(
      computeDailyGoal({ objective: 'endurance', history: [], now: NOW }).distanceKm
    );
  });
});
