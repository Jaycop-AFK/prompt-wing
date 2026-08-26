import { describe, expect, it } from 'vitest';

import { evaluateRunClearance } from './run-clearance';
import type { HourlyConditions } from './types';

const HOUR = 60 * 60 * 1000;
/** เที่ยงคืนของวันสมมติ ใช้เป็นฐานของทุกเทสต์ */
const MIDNIGHT = Date.UTC(2026, 7, 26, 0, 0, 0);

/** เวลา ณ ชั่วโมงที่ h ของวันสมมติ */
const at = (h: number) => MIDNIGHT + h * HOUR;

/** ชั่วโมงที่สภาพทุกอย่างดี ปรับเฉพาะค่าที่สนใจผ่าน overrides */
const goodHour = (h: number, overrides: Partial<HourlyConditions> = {}): HourlyConditions => ({
  at: at(h),
  apparentTemperature: 28,
  pm25: 10,
  uvIndex: 3,
  thunderstorm: false,
  ...overrides,
});

/** วันที่สภาพดีตลอด 24 ชั่วโมง */
const goodDay = () => Array.from({ length: 24 }, (_, h) => goodHour(h));

/** วันที่สภาพดีตลอด ยกเว้นชั่วโมงที่ระบุ */
const dayWith = (h: number, overrides: Partial<HourlyConditions>) =>
  goodDay().map((hour, i) => (i === h ? { ...hour, ...overrides } : hour));

/** พระอาทิตย์ตกสองทุ่มตรง ไกลจากชั่วโมงที่เทสต์ส่วนใหญ่ใช้ */
const LATE_SUNSET = at(20);

describe('evaluateRunClearance — เกณฑ์สีแดง', () => {
  it('แดงเมื่ออุณหภูมิที่รู้สึกได้ถึง 41 องศา', () => {
    const result = evaluateRunClearance({
      hours: dayWith(6, { apparentTemperature: 41 }),
      sunset: LATE_SUNSET,
      now: at(6),
    });

    expect(result.level).toBe('red');
    expect(result.decidedBy).toContain('heat');
  });

  it('แดงเมื่อ PM2.5 ถึง 37.5 ซึ่งเป็นค่ามาตรฐาน 24 ชั่วโมงของไทย', () => {
    const result = evaluateRunClearance({
      hours: dayWith(6, { pm25: 37.5 }),
      sunset: LATE_SUNSET,
      now: at(6),
    });

    expect(result.level).toBe('red');
    expect(result.decidedBy).toContain('pm25');
  });

  it('แดงเมื่อมีพายุฝนฟ้าคะนอง แม้อากาศอย่างอื่นจะดี', () => {
    const result = evaluateRunClearance({
      hours: dayWith(6, { thunderstorm: true }),
      sunset: LATE_SUNSET,
      now: at(6),
    });

    expect(result.level).toBe('red');
    expect(result.decidedBy).toContain('storm');
  });
});

describe('evaluateRunClearance — เกณฑ์สีเหลือง', () => {
  it('เหลืองเมื่ออุณหภูมิที่รู้สึกได้ถึง 35 องศา', () => {
    const result = evaluateRunClearance({
      hours: dayWith(6, { apparentTemperature: 35 }),
      sunset: LATE_SUNSET,
      now: at(6),
    });

    expect(result.level).toBe('yellow');
    expect(result.decidedBy).toContain('heat');
  });

  it('เหลืองเมื่อ PM2.5 ถึง 25', () => {
    const result = evaluateRunClearance({
      hours: dayWith(6, { pm25: 25 }),
      sunset: LATE_SUNSET,
      now: at(6),
    });

    expect(result.level).toBe('yellow');
    expect(result.decidedBy).toContain('pm25');
  });

  it('เหลืองเมื่อ UV ถึง 8', () => {
    const result = evaluateRunClearance({
      hours: dayWith(6, { uvIndex: 8 }),
      sunset: LATE_SUNSET,
      now: at(6),
    });

    expect(result.level).toBe('yellow');
    expect(result.decidedBy).toContain('uv');
  });

  it('เหลืองเมื่อเลยเวลาพระอาทิตย์ตกไปแล้ว แม้อากาศจะดีทุกอย่าง', () => {
    const result = evaluateRunClearance({
      hours: goodDay(),
      sunset: at(18) + 40 * 60 * 1000,
      now: at(19),
    });

    expect(result.level).toBe('yellow');
    expect(result.decidedBy).toEqual(['dark']);
  });
});

describe('evaluateRunClearance — สีเขียว', () => {
  it('เขียวเมื่อต่ำกว่าเกณฑ์เหลืองทุกตัวและยังไม่ถึงเวลาพระอาทิตย์ตก', () => {
    const result = evaluateRunClearance({
      hours: goodDay(),
      sunset: LATE_SUNSET,
      now: at(6),
    });

    expect(result.level).toBe('green');
    expect(result.decidedBy).toEqual([]);
  });
});

describe('evaluateRunClearance — ค่าตรงเส้นแบ่งพอดี', () => {
  it('อุณหภูมิ 34.9 ยังเขียว แต่ 35 เป็นเหลือง', () => {
    const below = evaluateRunClearance({
      hours: dayWith(6, { apparentTemperature: 34.9 }),
      sunset: LATE_SUNSET,
      now: at(6),
    });
    const boundary = evaluateRunClearance({
      hours: dayWith(6, { apparentTemperature: 35 }),
      sunset: LATE_SUNSET,
      now: at(6),
    });

    expect(below.level).toBe('green');
    expect(boundary.level).toBe('yellow');
  });

  it('อุณหภูมิ 40.9 ยังเหลือง แต่ 41 เป็นแดง', () => {
    const below = evaluateRunClearance({
      hours: dayWith(6, { apparentTemperature: 40.9 }),
      sunset: LATE_SUNSET,
      now: at(6),
    });
    const boundary = evaluateRunClearance({
      hours: dayWith(6, { apparentTemperature: 41 }),
      sunset: LATE_SUNSET,
      now: at(6),
    });

    expect(below.level).toBe('yellow');
    expect(boundary.level).toBe('red');
  });

  it('UV 7.9 ยังเขียว แต่ 8 เป็นเหลือง', () => {
    const below = evaluateRunClearance({
      hours: dayWith(6, { uvIndex: 7.9 }),
      sunset: LATE_SUNSET,
      now: at(6),
    });
    const boundary = evaluateRunClearance({
      hours: dayWith(6, { uvIndex: 8 }),
      sunset: LATE_SUNSET,
      now: at(6),
    });

    expect(below.level).toBe('green');
    expect(boundary.level).toBe('yellow');
  });

  it('PM2.5 24.9 ยังเขียว 25 เป็นเหลือง 37.4 ยังเหลือง 37.5 เป็นแดง', () => {
    const levelAt = (pm25: number) =>
      evaluateRunClearance({
        hours: dayWith(6, { pm25 }),
        sunset: LATE_SUNSET,
        now: at(6),
      }).level;

    expect(levelAt(24.9)).toBe('green');
    expect(levelAt(25)).toBe('yellow');
    expect(levelAt(37.4)).toBe('yellow');
    expect(levelAt(37.5)).toBe('red');
  });
});

describe('evaluateRunClearance — ตัวที่แย่ที่สุดเป็นคนตัดสิน', () => {
  it('อากาศเย็นสบายไม่ชดเชย PM2.5 ที่พุ่ง', () => {
    const result = evaluateRunClearance({
      hours: dayWith(6, { apparentTemperature: 22, uvIndex: 0, pm25: 60 }),
      sunset: LATE_SUNSET,
      now: at(6),
    });

    expect(result.level).toBe('red');
    expect(result.decidedBy).toEqual(['pm25']);
  });

  it('รายงานทุกปัจจัยที่ถึงเกณฑ์ของระดับที่ตัดสิน ไม่ใช่แค่ตัวแรก', () => {
    const result = evaluateRunClearance({
      hours: dayWith(6, { apparentTemperature: 42, pm25: 90 }),
      sunset: LATE_SUNSET,
      now: at(6),
    });

    expect(result.level).toBe('red');
    expect(result.decidedBy).toEqual(['heat', 'pm25']);
  });

  it('ไม่รายงานปัจจัยระดับเหลืองเมื่อผลรวมเป็นแดง', () => {
    const result = evaluateRunClearance({
      hours: dayWith(6, { apparentTemperature: 42, uvIndex: 9 }),
      sunset: LATE_SUNSET,
      now: at(6),
    });

    expect(result.level).toBe('red');
    expect(result.decidedBy).toEqual(['heat']);
  });
});

describe('evaluateRunClearance — ไม่มีค่า PM2.5', () => {
  it('ประเมินจากปัจจัยที่เหลือได้ และบอกว่าไม่มีข้อมูล PM2.5', () => {
    const result = evaluateRunClearance({
      hours: dayWith(6, { pm25: null }),
      sunset: LATE_SUNSET,
      now: at(6),
    });

    expect(result.level).toBe('green');
    expect(result.pm25Unknown).toBe(true);
    expect(result.decidedBy).toEqual([]);
  });

  it('ไม่มีค่า PM2.5 ต้องไม่ถูกนับเป็นค่าศูนย์หรือค่าที่แย่', () => {
    const unknown = evaluateRunClearance({
      hours: dayWith(6, { pm25: null, apparentTemperature: 36 }),
      sunset: LATE_SUNSET,
      now: at(6),
    });

    expect(unknown.level).toBe('yellow');
    expect(unknown.decidedBy).toEqual(['heat']);
  });

  it('บอกว่ามีข้อมูล PM2.5 เมื่อมีค่าจริง', () => {
    const result = evaluateRunClearance({
      hours: goodDay(),
      sunset: LATE_SUNSET,
      now: at(6),
    });

    expect(result.pm25Unknown).toBe(false);
  });
});

describe('evaluateRunClearance — ClearWindow', () => {
  it('คืน null เมื่อไม่มีชั่วโมงเขียวเหลืออยู่เลย', () => {
    const hours = goodDay().map((hour) => ({ ...hour, pm25: 80 }));
    const result = evaluateRunClearance({ hours, sunset: LATE_SUNSET, now: at(6) });

    expect(result.clearWindow).toBeNull();
  });

  it('เลือกช่วงที่ยาวกว่าเมื่อมีช่วงเขียวสองช่วง', () => {
    // ช่วงสั้น 6:00-8:00 (2 ชม.) แล้วช่วงยาว 16:00-20:00 (4 ชม.)
    const hours = goodDay().map((hour, h) => {
      const isShortWindow = h >= 6 && h < 8;
      const isLongWindow = h >= 16 && h < 20;
      return isShortWindow || isLongWindow ? hour : { ...hour, apparentTemperature: 36 };
    });

    const result = evaluateRunClearance({ hours, sunset: LATE_SUNSET, now: at(5) });

    expect(result.clearWindow).toEqual({ start: at(16), end: at(20) });
  });

  it('ไม่เลือกช่วงเขียวที่ผ่านไปแล้ว แม้จะเป็นช่วงที่ยาวที่สุด', () => {
    // ช่วงยาว 4:00-9:00 (ผ่านไปแล้ว) และช่วงสั้น 17:00-19:00 (ยังมาไม่ถึง)
    const hours = goodDay().map((hour, h) => {
      const isMorning = h >= 4 && h < 9;
      const isEvening = h >= 17 && h < 19;
      return isMorning || isEvening ? hour : { ...hour, apparentTemperature: 36 };
    });

    const result = evaluateRunClearance({ hours, sunset: LATE_SUNSET, now: at(12) });

    expect(result.clearWindow).toEqual({ start: at(17), end: at(19) });
  });

  it('ตัดหัวช่วงที่กำลังดำเนินอยู่ให้เริ่มที่เวลาปัจจุบัน', () => {
    const hours = goodDay().map((hour, h) =>
      h >= 5 && h < 9 ? hour : { ...hour, apparentTemperature: 36 }
    );
    const now = at(6) + 30 * 60 * 1000;

    const result = evaluateRunClearance({ hours, sunset: LATE_SUNSET, now });

    expect(result.clearWindow).toEqual({ start: now, end: at(9) });
  });

  it('ตัดท้ายช่วงด้วยเวลาพระอาทิตย์ตก', () => {
    const sunset = at(18) + 40 * 60 * 1000;
    const hours = goodDay().map((hour, h) =>
      h >= 15 ? hour : { ...hour, apparentTemperature: 36 }
    );

    const result = evaluateRunClearance({ hours, sunset, now: at(14) });

    expect(result.clearWindow).toEqual({ start: at(15), end: sunset });
  });

  it('ยังคืน ClearWindow ของช่วงถัดไปแม้ตอนนี้จะเป็นสีแดง', () => {
    const hours = goodDay().map((hour, h) =>
      h >= 16 ? hour : { ...hour, apparentTemperature: 42 }
    );

    const result = evaluateRunClearance({ hours, sunset: LATE_SUNSET, now: at(9) });

    expect(result.level).toBe('red');
    expect(result.clearWindow).toEqual({ start: at(16), end: at(20) });
  });
});

describe('evaluateRunClearance — ข้อมูลไม่ครบ', () => {
  it('คืนสีเหลืองเมื่อไม่มีข้อมูลของชั่วโมงปัจจุบัน แทนที่จะเดาว่าอากาศดี', () => {
    const result = evaluateRunClearance({
      hours: goodDay().slice(0, 4),
      sunset: LATE_SUNSET,
      now: at(10),
    });

    expect(result.level).toBe('yellow');
    expect(result.pm25Unknown).toBe(true);
  });

  it('ไม่พังเมื่อไม่มีข้อมูลรายชั่วโมงเลย', () => {
    const result = evaluateRunClearance({ hours: [], sunset: LATE_SUNSET, now: at(10) });

    expect(result.level).toBe('yellow');
    expect(result.clearWindow).toBeNull();
  });
});
