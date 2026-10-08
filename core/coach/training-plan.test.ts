import { describe, expect, it } from 'vitest';

import {
  buildTrainingWeek,
  isValidRunDays,
  nextWorkout,
  runDaysBetween,
  totalLevelsOf,
} from './training-plan';
import type { CompletedRun, TrainingPlanSettings } from './types';

// 7 ก.ย. 2026 เป็นวันจันทร์ ใช้ตัวสร้าง Date ตามเขตเวลาของเครื่องเพราะแผนนับวันตามปฏิทินของผู้ใช้
const PLAN_START = new Date(2026, 8, 7, 20, 0).getTime();
const MON_WED_FRI = [1, 3, 5];

const settings = (overrides: Partial<TrainingPlanSettings> = {}): TrainingPlanSettings => ({
  goal: '5k',
  runDays: MON_WED_FRI,
  preferredMinuteOfDay: 6 * 60,
  startedAt: PLAN_START,
  ...overrides,
});

/** เวลาในวันที่ห่างจากวันเริ่มแผน dayOffset วัน */
const onDay = (dayOffset: number, hour = 7) => new Date(2026, 8, 7 + dayOffset, hour, 0).getTime();

const run = (dayOffset: number, distanceKm: number, minutes: number): CompletedRun => ({
  at: onDay(dayOffset),
  distanceKm,
  movingSeconds: minutes * 60,
});

/** สามครั้งที่ยาวพอสำหรับทุกการซ้อมของแผน 5K ทุกระดับ */
const fullWeek = (weekIndex: number): CompletedRun[] => [
  run(weekIndex * 7, 6, 45),
  run(weekIndex * 7 + 2, 6, 45),
  run(weekIndex * 7 + 4, 6, 45),
];

describe('buildTrainingWeek — สัปดาห์แรก', () => {
  it('เริ่มที่ระดับ 1 ยังไม่มีผลทบทวน และมีการซ้อมเท่าจำนวนวันที่เลือก', () => {
    const week = buildTrainingWeek({ settings: settings(), runs: [], now: onDay(1) });

    expect(week.weekNumber).toBe(1);
    expect(week.level).toBe(1);
    expect(week.totalLevels).toBe(totalLevelsOf('5k'));
    expect(week.review).toBeNull();
    expect(week.workouts.map((workout) => workout.kind)).toEqual(['easy', 'steady', 'long']);
    expect(week.workouts[2].target).toEqual({ kind: 'distance', km: 3 });
  });

  it('วางการซ้อมบนวันที่เลือกตามลำดับวันที่ วิ่งยาวอยู่ท้ายสัปดาห์', () => {
    const week = buildTrainingWeek({ settings: settings(), runs: [], now: onDay(0) });
    expect(week.workouts.map((workout) => workout.scheduledOn)).toEqual([onDay(0, 0), onDay(2, 0), onDay(4, 0)]);
  });

  it('เริ่มแผนกลางสัปดาห์ สัปดาห์ของแผนนับจากวันเริ่ม ไม่ใช่วันจันทร์', () => {
    const thursdayStart = new Date(2026, 8, 10, 9, 0).getTime();
    const week = buildTrainingWeek({
      settings: settings({ startedAt: thursdayStart }),
      runs: [],
      now: thursdayStart,
    });

    // พฤหัส 10 → ศุกร์ 11, จันทร์ 14, พุธ 16
    expect(week.workouts.map((workout) => new Date(workout.scheduledOn).getDate())).toEqual([11, 14, 16]);
  });

  it('เลือกสี่วันได้วิ่งเบาเพิ่มหนึ่งครั้งก่อนวิ่งยาว', () => {
    const week = buildTrainingWeek({ settings: settings({ runDays: [1, 3, 5, 6] }), runs: [], now: onDay(0) });
    expect(week.workouts.map((workout) => workout.kind)).toEqual(['easy', 'steady', 'easy', 'long']);
  });
});

describe('buildTrainingWeek — ปรับระดับตามผลสัปดาห์ที่จบแล้ว', () => {
  it('ซ้อมครบ สัปดาห์ถัดไปขยับขึ้นหนึ่งระดับ', () => {
    const week = buildTrainingWeek({ settings: settings(), runs: fullWeek(0), now: onDay(7) });

    expect(week.weekNumber).toBe(2);
    expect(week.level).toBe(2);
    expect(week.review).toEqual({ level: 1, completion: 1, adjustment: 'progress' });
  });

  it('ซ้อมได้ราวสองในสาม ทำระดับเดิมซ้ำ', () => {
    const runs = [run(0, 2.8, 20), run(4, 3.1, 22)];
    const week = buildTrainingWeek({ settings: settings(), runs, now: onDay(8) });

    expect(week.level).toBe(1);
    expect(week.review?.adjustment).toBe('repeat');
    expect(week.review?.completion).toBeCloseTo(2 / 3, 5);
  });

  it('สัปดาห์ที่ไม่ได้วิ่งลดลงหนึ่งระดับ แต่ไม่ต่ำกว่าระดับ 1', () => {
    const climbed = [...fullWeek(0), ...fullWeek(1)];

    expect(buildTrainingWeek({ settings: settings(), runs: climbed, now: onDay(14) }).level).toBe(3);
    expect(buildTrainingWeek({ settings: settings(), runs: climbed, now: onDay(21) }).level).toBe(2);
    expect(buildTrainingWeek({ settings: settings(), runs: climbed, now: onDay(35) }).level).toBe(1);
  });

  it('วิ่งยาวก่อนวันเบาก็ยังนับว่าซ้อมครบ ไม่จับคู่ตามลำดับเวลา', () => {
    const runs = [run(0, 3.2, 23), run(2, 2.9, 21), run(4, 2.2, 16)];
    const week = buildTrainingWeek({ settings: settings(), runs, now: onDay(4, 12) });

    expect(week.workouts.map((workout) => workout.completion)).toEqual([1, 1, 1]);
    expect(week.completion).toBe(1);
  });

  it('วิ่งยาววันจันทร์แล้ววันที่เหลือวิ่งสั้นลง ยังจับคู่ให้ได้ผลรวมมากที่สุด', () => {
    const runs = [run(0, 5, 35), run(2, 2.9, 21), run(4, 2.2, 16)];
    const week = buildTrainingWeek({ settings: settings(), runs, now: onDay(5) });
    expect(week.completion).toBe(1);
  });

  it('วิ่งเบาครั้งเดียวต้นสัปดาห์นับเป็นวิ่งเบาของวันนั้น ไม่ถูกดึงไปนับเป็นวิ่งยาว', () => {
    const week = buildTrainingWeek({ settings: settings(), runs: [run(0, 2.9, 21)], now: onDay(1) });
    expect(week.workouts.map((workout) => workout.completion)).toEqual([1, 0, 0]);
  });

  it('ไม่นับการวิ่งสั้น ๆ ที่กดลอง GPS เป็นการซ้อม', () => {
    const runs = [run(0, 0.1, 1), run(1, 0.2, 2), run(2, 0.05, 1)];
    const week = buildTrainingWeek({ settings: settings(), runs, now: onDay(3) });
    expect(week.completion).toBe(0);
  });

  it('การวิ่งก่อนวันเริ่มแผนและหลังสัปดาห์นี้ไม่ถูกนับรวม', () => {
    const runs = [run(-1, 6, 45), run(7, 6, 45)];
    const week = buildTrainingWeek({ settings: settings(), runs, now: onDay(6) });
    expect(week.completion).toBe(0);
  });

  it('ผ่านระดับสุดท้ายแล้วถือว่าจบแผน และระดับไม่เกินระดับสุดท้าย', () => {
    const total = totalLevelsOf('5k');
    const runs = Array.from({ length: total + 1 }, (_, weekIndex) => fullWeek(weekIndex)).flat();

    const lastLevelWeek = buildTrainingWeek({ settings: settings(), runs, now: onDay(7 * (total - 1)) });
    expect(lastLevelWeek.level).toBe(total);
    expect(lastLevelWeek.finished).toBe(false);
    expect(lastLevelWeek.workouts[2].kind).toBe('test');

    const afterFinish = buildTrainingWeek({ settings: settings(), runs, now: onDay(7 * total + 1) });
    expect(afterFinish.level).toBe(total);
    expect(afterFinish.finished).toBe(true);
  });
});

describe('nextWorkout', () => {
  it('คืนการซ้อมแรกตามวันที่ที่ยังทำไม่ครบ', () => {
    const week = buildTrainingWeek({ settings: settings(), runs: [run(0, 2.9, 21)], now: onDay(1) });
    expect(nextWorkout(week)?.kind).toBe('steady');
  });

  it('ซ้อมครบทุกครั้งแล้วไม่มีการซ้อมถัดไป', () => {
    const week = buildTrainingWeek({ settings: settings(), runs: fullWeek(0), now: onDay(5) });
    expect(nextWorkout(week)).toBeNull();
  });
});

describe('runDaysBetween และ isValidRunDays', () => {
  it('คืนเที่ยงคืนของวันซ้อมทุกวันในช่วง', () => {
    expect(runDaysBetween(MON_WED_FRI, onDay(0), onDay(14, 0))).toHaveLength(6);
  });

  it('รับเฉพาะ 3–4 วันที่ไม่ซ้ำกัน', () => {
    expect(isValidRunDays([1, 3, 5])).toBe(true);
    expect(isValidRunDays([0, 2, 4, 6])).toBe(true);
    expect(isValidRunDays([1, 3])).toBe(false);
    expect(isValidRunDays([1, 1, 3])).toBe(false);
    expect(isValidRunDays([1, 2, 3, 4, 5])).toBe(false);
    expect(isValidRunDays([1, 3, 7])).toBe(false);
  });
});
