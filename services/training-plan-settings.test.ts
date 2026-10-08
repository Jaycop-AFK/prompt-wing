import { describe, expect, it } from 'vitest';

import type { TrainingPlanSettings } from '@/core/coach';

import { reminderSlots } from './reminder-slots';
import {
  formatMinuteOfDay,
  parseMinuteOfDay,
  trainingPlanFromMetadata,
  trainingPlanToMetadata,
} from './training-plan-settings';

const settings: TrainingPlanSettings = {
  goal: '10k',
  runDays: [1, 3, 5],
  preferredMinuteOfDay: 5 * 60 + 30,
  startedAt: new Date(2026, 8, 14, 20, 0).getTime(),
};

describe('trainingPlanFromMetadata', () => {
  it('อ่านแผนที่เขียนด้วย trainingPlanToMetadata กลับมาได้ตรงเดิม', () => {
    const stored = { training_plan: trainingPlanToMetadata(settings) };
    expect(trainingPlanFromMetadata(stored)).toEqual(settings);
  });

  it('ยังไม่ได้ตั้งแผนคืน null', () => {
    expect(trainingPlanFromMetadata({})).toBeNull();
    expect(trainingPlanFromMetadata(undefined)).toBeNull();
  });

  it('ข้อมูลที่ใช้ไม่ได้ถือว่ายังไม่มีแผน ไม่เดาค่าให้', () => {
    const valid = trainingPlanToMetadata(settings);
    expect(trainingPlanFromMetadata({ training_plan: { ...valid, goal: 'marathon' } })).toBeNull();
    expect(trainingPlanFromMetadata({ training_plan: { ...valid, run_days: [1, 2] } })).toBeNull();
    expect(trainingPlanFromMetadata({ training_plan: { ...valid, preferred_time: '25:00' } })).toBeNull();
    expect(trainingPlanFromMetadata({ training_plan: { ...valid, started_at: 'ไม่ใช่วันที่' } })).toBeNull();
  });

  it('เรียงวันซ้อมให้เสมอแม้ที่เก็บไว้จะไม่เรียง', () => {
    const stored = { training_plan: { ...trainingPlanToMetadata(settings), run_days: [5, 1, 3] } };
    expect(trainingPlanFromMetadata(stored)?.runDays).toEqual([1, 3, 5]);
  });
});

describe('เวลาแบบ HH:MM', () => {
  it('แปลงไปกลับได้ตรงกัน', () => {
    expect(formatMinuteOfDay(330)).toBe('05:30');
    expect(parseMinuteOfDay('05:30')).toBe(330);
    expect(parseMinuteOfDay('5:30')).toBe(330);
  });

  it('ไม่รับเวลาที่ไม่มีจริง', () => {
    expect(parseMinuteOfDay('24:00')).toBeNull();
    expect(parseMinuteOfDay('06:60')).toBeNull();
    expect(parseMinuteOfDay('หกโมง')).toBeNull();
  });
});

describe('reminderSlots', () => {
  it('เตือนก่อนเวลาซ้อม และใช้เลขวันแบบ expo-notifications ที่ 1 คือวันอาทิตย์', () => {
    expect(reminderSlots([1, 3, 5], 6 * 60, 30)).toEqual([
      { weekday: 2, hour: 5, minute: 30 },
      { weekday: 4, hour: 5, minute: 30 },
      { weekday: 6, hour: 5, minute: 30 },
    ]);
  });

  it('เวลาเตือนที่ย้อนไปก่อนเที่ยงคืนย้ายไปคืนของวันก่อนหน้า', () => {
    // ซ้อมวันอาทิตย์ 00:15 เตือนก่อน 30 นาที ต้องเป็นคืนวันเสาร์ 23:45
    expect(reminderSlots([0], 15, 30)).toEqual([{ weekday: 7, hour: 23, minute: 45 }]);
  });
});
