import { describe, expect, it } from 'vitest';

import { DAYLIGHT_SAFETY_MARGIN_MINUTES, type DaylightWarning } from '@/core/coach';

import { daylightWarningSentence, daylightWarningTitle } from './copy';

const SUNSET = new Date(2026, 5, 15, 18, 0, 0).getTime();

describe('daylightWarningSentence', () => {
  it('ทุกกรณีเสนอทางเลือกที่ทำได้จริงเสมอ ไม่ใช่แค่บอกว่ามีปัญหา', () => {
    const warnings: DaylightWarning[] = [
      { kind: 'beforeSunrise', minutesUntilSunrise: 90 },
      { kind: 'afterSunset' },
      { kind: 'notEnoughTime', minutesLeft: 20, estimatedMinutes: 45 },
    ];

    for (const warning of warnings) {
      const sentence = daylightWarningSentence(warning, SUNSET);
      // ทุกประโยคต้องมีอย่างน้อยหนึ่งทางที่ผู้ใช้ลงมือทำได้ คือหาที่วิ่งที่มีไฟ ลดเป้าหมาย หรือรอ
      const offersOption =
        sentence.includes('ไฟส่องสว่าง') || sentence.includes('ลดเป้าหมายรอบนี้') || sentence.includes('รออีก');
      expect(offersOption).toBe(true);
    }
  });

  it('กรณีเวลาไม่พอ บอกทั้งเวลาที่เหลือ เวลาที่ต้องใช้ และระยะเผื่อ ให้ตัวเลขบวกลบกันลงตัว', () => {
    const sentence = daylightWarningSentence(
      { kind: 'notEnoughTime', minutesLeft: 20, estimatedMinutes: 45 },
      SUNSET
    );

    expect(sentence).toContain('20');
    expect(sentence).toContain('45');
    expect(sentence).toContain(String(DAYLIGHT_SAFETY_MARGIN_MINUTES));
    expect(sentence).toContain('18:00');
  });

  it('กรณีเวลาไม่พอ เสนอทั้งลดเป้าหมายรอบนี้และหาที่วิ่งที่มีไฟตามที่ตั๋วกำหนด', () => {
    const sentence = daylightWarningSentence(
      { kind: 'notEnoughTime', minutesLeft: 20, estimatedMinutes: 45 },
      SUNSET
    );

    expect(sentence).toContain('ลดเป้าหมายรอบนี้');
    expect(sentence).toContain('ไฟส่องสว่าง');
  });

  it('เลยเส้นตายมาแล้วแต่ยังไม่ตกดิน ไม่แสดงนาทีติดลบให้ผู้ใช้เห็น', () => {
    const sentence = daylightWarningSentence(
      { kind: 'notEnoughTime', minutesLeft: -12, estimatedMinutes: 30 },
      SUNSET
    );

    expect(sentence).not.toContain('-12');
    expect(sentence).toContain('0 นาที');
  });

  it('ก่อนฟ้าสว่าง เสนอให้รอ ซึ่งเป็นทางที่ดีที่สุดและมีเฉพาะกรณีนี้', () => {
    const sentence = daylightWarningSentence(
      { kind: 'beforeSunrise', minutesUntilSunrise: 90 },
      SUNSET
    );

    expect(sentence).toContain('90');
    expect(sentence).toContain('รออีก');
  });
});

describe('daylightWarningTitle', () => {
  it('หัวข้อไม่ซ้ำกับต้นประโยคเต็ม ไม่งั้นผู้ใช้อ่านข้อความเดียวกันสองรอบติดกัน', () => {
    const warnings: DaylightWarning[] = [
      { kind: 'beforeSunrise', minutesUntilSunrise: 90 },
      { kind: 'afterSunset' },
      { kind: 'notEnoughTime', minutesLeft: 20, estimatedMinutes: 45 },
    ];

    for (const warning of warnings) {
      const title = daylightWarningTitle(warning);
      expect(daylightWarningSentence(warning, SUNSET).startsWith(title)).toBe(false);
    }
  });

  it('หัวข้อกรณีเวลาไม่พอไม่ฟันธง เพราะเวลาที่คาดมาจาก pace มาตรฐาน ไม่ใช่ pace จริงของผู้ใช้', () => {
    expect(daylightWarningTitle({ kind: 'notEnoughTime', minutesLeft: 20, estimatedMinutes: 45 })).toContain(
      'อาจ'
    );
  });
});
