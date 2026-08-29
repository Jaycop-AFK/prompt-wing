import { describe, expect, it } from 'vitest';

import { DAYLIGHT_SAFETY_MARGIN_MINUTES, evaluateDaylightWarning, isDarkAt } from './daylight';

/** วันสมมติ พระอาทิตย์ขึ้น 06:00 ตก 18:00 ตามเขตเวลาของเครื่องที่รันเทสต์ */
const SUNRISE = new Date(2026, 5, 15, 6, 0, 0).getTime();
const SUNSET = new Date(2026, 5, 15, 18, 0, 0).getTime();

const at = (hour: number, minute = 0) => new Date(2026, 5, 15, hour, minute, 0).getTime();

const evaluate = (now: number, estimatedMinutes: number) =>
  evaluateDaylightWarning({ now, sunrise: SUNRISE, sunset: SUNSET, estimatedMinutes });

describe('isDarkAt', () => {
  it('มืดก่อนพระอาทิตย์ขึ้นและตั้งแต่พระอาทิตย์ตกเป็นต้นไป', () => {
    expect(isDarkAt(at(4), SUNRISE, SUNSET)).toBe(true);
    expect(isDarkAt(SUNSET, SUNRISE, SUNSET)).toBe(true);
    expect(isDarkAt(at(20), SUNRISE, SUNSET)).toBe(true);
  });

  it('สว่างตั้งแต่พระอาทิตย์ขึ้นพอดีจนถึงก่อนตก', () => {
    expect(isDarkAt(SUNRISE, SUNRISE, SUNSET)).toBe(false);
    expect(isDarkAt(at(12), SUNRISE, SUNSET)).toBe(false);
  });
});

describe('evaluateDaylightWarning — เวลายังพอ', () => {
  it('บ่ายสองโมง วิ่ง 30 นาที ไม่เตือน', () => {
    expect(evaluate(at(14), 30)).toBeNull();
  });

  it('เวลาเหลือพอดีกับที่ต้องใช้ ยังไม่เตือน', () => {
    // 17:00 เหลือถึงเส้นตายเผื่อแล้ว (17:45) เท่ากับ 45 นาที
    expect(evaluate(at(17), 45)).toBeNull();
  });

  it('ขาดไปนาทีเดียวก็ต้องเตือน ตรึงทิศทางของเครื่องหมายเปรียบเทียบไว้', () => {
    // ถ้าเผลอเขียน > แทน >= เทสต์ "เหลือพอดี" ด้านบนจะพัง ส่วนเทสต์นี้กันฝั่งตรงข้าม
    expect(evaluate(at(17), 46)).not.toBeNull();
  });
});

describe('evaluateDaylightWarning — เวลาไม่พอ', () => {
  it('เหลือเวลาน้อยกว่าที่ต้องใช้ ต้องเตือนพร้อมตัวเลขทั้งสองฝั่ง', () => {
    const warning = evaluate(at(17), 60);

    expect(warning).toEqual({ kind: 'notEnoughTime', minutesLeft: 45, estimatedMinutes: 60 });
  });

  it('เผื่อเวลาไว้ก่อนพระอาทิตย์ตกจริง ไม่ปล่อยให้วิ่งจบพอดีตอนฟ้ามืด', () => {
    // 17:20 ถึงพระอาทิตย์ตกจริงเหลือ 40 นาที ถ้าไม่เผื่อจะไม่เตือนการวิ่ง 35 นาที
    // แต่เมื่อเผื่อ 15 นาทีแล้วเหลือ 25 นาที จึงต้องเตือน
    expect(evaluate(at(17, 20), 35)).not.toBeNull();
  });

  it('ระยะเผื่อที่ประกาศออกไปตรงกับที่ใช้คำนวณจริง จอจะได้เอาไปเขียนบอกผู้ใช้ได้ตรง', () => {
    // 17:00 ถึงพระอาทิตย์ตกจริงเหลือ 60 นาที ที่เหลือหลังหักเผื่อต้องเป็น 60 ลบระยะเผื่อพอดี
    const warning = evaluate(at(17), 999);

    expect(warning).toMatchObject({ minutesLeft: 60 - DAYLIGHT_SAFETY_MARGIN_MINUTES });
  });

  it('นาทีที่เหลือติดลบได้เมื่อเลยเส้นตายมาแล้วแต่ยังไม่ตกดิน', () => {
    const warning = evaluate(at(17, 50), 20);

    expect(warning?.kind).toBe('notEnoughTime');
    if (warning?.kind !== 'notEnoughTime') throw new Error('ต้องเป็นกรณีเวลาไม่พอ');
    expect(warning.minutesLeft).toBeLessThan(0);
  });
});

describe('evaluateDaylightWarning — ฟ้ามืดอยู่แล้ว', () => {
  it('หลังพระอาทิตย์ตก เตือนเสมอแม้วิ่งสั้นมาก', () => {
    expect(evaluate(at(19), 5)).toEqual({ kind: 'afterSunset' });
  });

  it('ตอนพระอาทิตย์ตกพอดีถือว่ามืดแล้ว', () => {
    expect(evaluate(SUNSET, 10)).toEqual({ kind: 'afterSunset' });
  });

  it('ก่อนพระอาทิตย์ขึ้นก็มืดเหมือนกัน ต้องเตือนด้วย ไม่ใช่เงียบเพราะยังไม่ถึงเย็น', () => {
    // ตีสี่ ห่างจากพระอาทิตย์ขึ้นสองชั่วโมง
    expect(evaluate(at(4), 30)).toEqual({ kind: 'beforeSunrise', minutesUntilSunrise: 120 });
  });

  it('ก่อนฟ้าสว่างไม่มีตัวเลข "เหลือเวลากลางวัน" ให้จอหยิบไปแสดงผิด ๆ', () => {
    // ตีสี่เหลือเวลาถึงเส้นตายเย็นตั้งหลายร้อยนาที ซึ่งไม่มีความหมายเลยตอนที่ยังมืดอยู่
    // การแยกชนิดทำให้ฟิลด์นั้นไม่มีอยู่จริงในกรณีนี้ ไม่ใช่แค่ไม่ควรใช้
    const warning = evaluate(at(4), 30);
    expect(warning).not.toHaveProperty('minutesLeft');
  });

  it('ตอนพระอาทิตย์ขึ้นพอดีถือว่าสว่างแล้ว ไม่เตือนถ้าเวลาพอ', () => {
    expect(evaluate(SUNRISE, 30)).toBeNull();
  });
});
