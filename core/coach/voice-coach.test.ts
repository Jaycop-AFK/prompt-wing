import { describe, expect, it } from 'vitest';

import { classifyPaceDrift, nextKmMilestone, PACE_DRIFT_TOLERANCE_SEC_PER_KM } from './voice-coach';

describe('classifyPaceDrift', () => {
  const recommended = 450;

  it('pace ตรงกับที่แนะนำเป๊ะ ถือว่า onPace', () => {
    expect(classifyPaceDrift(recommended, recommended)).toBe('onPace');
  });

  it('pace เร็วกว่าที่แนะนำแต่ยังอยู่ในช่วงยอมรับได้ ถือว่า onPace', () => {
    expect(classifyPaceDrift(recommended - PACE_DRIFT_TOLERANCE_SEC_PER_KM + 1, recommended)).toBe(
      'onPace'
    );
  });

  it('pace ช้ากว่าที่แนะนำแต่ยังอยู่ในช่วงยอมรับได้ ถือว่า onPace', () => {
    expect(classifyPaceDrift(recommended + PACE_DRIFT_TOLERANCE_SEC_PER_KM - 1, recommended)).toBe(
      'onPace'
    );
  });

  it('pace เร็วกว่าที่แนะนำเกินขอบเขต ถือว่า tooFast (ตัวเลขวินาทีต่อกิโลเมตรน้อยกว่า = เร็วกว่า)', () => {
    expect(classifyPaceDrift(recommended - PACE_DRIFT_TOLERANCE_SEC_PER_KM, recommended)).toBe(
      'tooFast'
    );
  });

  it('pace ช้ากว่าที่แนะนำเกินขอบเขต ถือว่า tooSlow', () => {
    expect(classifyPaceDrift(recommended + PACE_DRIFT_TOLERANCE_SEC_PER_KM, recommended)).toBe(
      'tooSlow'
    );
  });

  it('ยังไม่มี pace ให้คำนวณ (null) ถือว่า onPace เสมอ ไม่เดา', () => {
    expect(classifyPaceDrift(null, recommended)).toBe('onPace');
  });
});

describe('nextKmMilestone', () => {
  it('ยังไม่ครบกิโลเมตรถัดไป คืน null', () => {
    expect(nextKmMilestone(0.8, 0)).toBeNull();
  });

  it('เพิ่งครบกิโลเมตรแรกพอดี คืน 1', () => {
    expect(nextKmMilestone(1.0, 0)).toBe(1);
  });

  it('ครบกิโลเมตรที่สองแล้วแต่ยังไม่ได้ประกาศ คืน 2', () => {
    expect(nextKmMilestone(2.4, 1)).toBe(2);
  });

  it('ระยะทางเท่าเดิมกับที่ประกาศไปแล้ว ไม่ประกาศซ้ำ', () => {
    expect(nextKmMilestone(2.4, 2)).toBeNull();
  });

  it('ระยะทางกระโดดข้ามมากกว่าหนึ่งกิโลเมตรในจังหวะเดียว ประกาศแค่กิโลเมตรปัจจุบัน ไม่ไล่ย้อนหลัง', () => {
    expect(nextKmMilestone(5.2, 1)).toBe(5);
  });
});
