import { describe, expect, it } from 'vitest';

import { daysInRange, distanceOnDay, formTrend, rangeBounds, summarizeHistory } from './run-history';
import type { SessionRecord } from './session-record';

/** 15 มิถุนายน 2026 เวลา 10:00 ตามเขตเวลาของเครื่องที่รันเทสต์ */
const NOW = new Date(2026, 5, 15, 10, 0, 0).getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

function session(overrides: Partial<SessionRecord> & { finishedAt: number }): SessionRecord {
  return {
    id: overrides.finishedAt,
    distanceKm: 5,
    elapsedSeconds: 1800,
    paceSecPerKm: 360,
    calories: 300,
    formScore: {
      hasEnoughData: true,
      cadenceDropped: false,
      paceDropped: false,
      summary: 'ฟอร์มดี',
    },
    splits: [],
    route: [],
    ...overrides,
  };
}

/** เที่ยงวันของ N วันก่อนหน้า NOW เลือกเที่ยงวันเพื่อไม่ให้คร่อมเส้นแบ่งวันโดยไม่ตั้งใจ */
function daysAgo(n: number): number {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d.getTime();
}

describe('rangeBounds', () => {
  it('รายสัปดาห์คือเจ็ดวันล่าสุดรวมวันนี้ ไม่ใช่สัปดาห์ตามปฏิทิน', () => {
    const { start, end } = rangeBounds('week', NOW);
    expect(Math.round((end - start) / DAY_MS)).toBe(7);
  });

  it('รายเดือนเริ่มที่วันที่ 1 ของเดือนนี้', () => {
    const { start } = rangeBounds('month', NOW);
    const d = new Date(start);
    expect(d.getDate()).toBe(1);
    expect(d.getMonth()).toBe(5);
  });

  it('รายปีเริ่มที่ 1 มกราคมของปีนี้', () => {
    const { start } = rangeBounds('year', NOW);
    const d = new Date(start);
    expect(d.getDate()).toBe(1);
    expect(d.getMonth()).toBe(0);
    expect(d.getFullYear()).toBe(2026);
  });

  it('ทุกช่วงจบที่สิ้นวันนี้ ไม่ใช่วินาทีนี้ การวิ่งเมื่อเช้าจึงยังนับอยู่ในช่วง', () => {
    for (const range of ['week', 'month', 'year'] as const) {
      expect(rangeBounds(range, NOW).end).toBeGreaterThan(NOW);
    }
  });
});

describe('daysInRange', () => {
  it('รายสัปดาห์นับเจ็ดวันเสมอ', () => {
    expect(daysInRange('week', NOW)).toBe(7);
  });

  it('รายเดือนนับเฉพาะวันที่ผ่านมาแล้ว ไม่นับวันที่ยังมาไม่ถึง', () => {
    // วันที่ 15 มิถุนายน แปลว่าผ่านมาแล้ว 15 วันของเดือนนี้ ไม่ใช่ 30
    expect(daysInRange('month', NOW)).toBe(15);
  });
});

describe('summarizeHistory', () => {
  it('กรองเฉพาะ Session ที่อยู่ในช่วง ตัดของเก่ากว่านั้นทิ้ง', () => {
    const sessions = [session({ finishedAt: daysAgo(2) }), session({ finishedAt: daysAgo(30) })];

    const week = summarizeHistory(sessions, 'week', NOW, 3);

    expect(week.sessions).toHaveLength(1);
    expect(week.totalDistanceKm).toBe(5);
  });

  it('รวมระยะทางของหลาย Session ในวันเดียวกันเข้าแท่งเดียวกัน', () => {
    const sessions = [
      session({ finishedAt: daysAgo(1), distanceKm: 3 }),
      session({ finishedAt: daysAgo(1) + 60 * 60 * 1000, distanceKm: 4, id: 999 }),
    ];

    const week = summarizeHistory(sessions, 'week', NOW, 3);
    const filled = week.buckets.filter((b) => b.distanceKm > 0);

    expect(filled).toHaveLength(1);
    expect(filled[0].distanceKm).toBe(7);
  });

  it('รายสัปดาห์มีเจ็ดแท่งเสมอ แม้ไม่มีการวิ่งเลย เพื่อให้เห็นวันที่ขาดไป', () => {
    const week = summarizeHistory([], 'week', NOW, 3);

    expect(week.buckets).toHaveLength(7);
    expect(week.buckets.every((b) => b.distanceKm === 0)).toBe(true);
    expect(week.totalDistanceKm).toBe(0);
  });

  it('รายปีมีแท่งละเดือน เฉพาะเดือนที่ผ่านมาแล้ว ไม่รวมเดือนในอนาคต', () => {
    const year = summarizeHistory([session({ finishedAt: daysAgo(100) })], 'year', NOW, 3);

    // NOW คือมิถุนายน (เดือนที่ 6) จึงต้องมีหกแท่ง ม.ค. ถึง มิ.ย. ไม่ใช่สิบสองแท่งเต็มปี
    expect(year.buckets).toHaveLength(6);
    expect(year.buckets[0].label).toBe('ม.ค.');
    expect(year.buckets[5].label).toBe('มิ.ย.');
    expect(year.buckets.filter((b) => b.distanceKm > 0)).toHaveLength(1);
  });

  it('ทุกแท่งจับคู่กับ Session ได้จริง ไม่มีการวิ่งไหนหายไปจากกราฟ', () => {
    // เทียบระยะรวมของทุกแท่งกับระยะรวมของ Session ที่อยู่ในช่วง ถ้า startsAt ของแท่งไม่ตรงกับ
    // วันของ Session แม้แต่มิลลิวินาทีเดียว ระยะจะหายไปจากกราฟเงียบ ๆ โดยยอดรวมยังถูกอยู่
    const sessions = [
      session({ finishedAt: daysAgo(0), distanceKm: 2 }),
      session({ finishedAt: daysAgo(3), distanceKm: 4, id: 2 }),
      session({ finishedAt: daysAgo(6), distanceKm: 6, id: 3 }),
    ];

    for (const range of ['week', 'month', 'year'] as const) {
      const summary = summarizeHistory(sessions, range, NOW, 3);
      const charted = summary.buckets.reduce((sum, b) => sum + b.distanceKm, 0);
      expect(charted).toBeCloseTo(summary.totalDistanceKm, 6);
    }
  });

  it('Session เรียงจากล่าสุดไปเก่าสุด', () => {
    const sessions = [session({ finishedAt: daysAgo(5) }), session({ finishedAt: daysAgo(1) })];

    const week = summarizeHistory(sessions, 'week', NOW, 3);

    expect(week.sessions[0].finishedAt).toBeGreaterThan(week.sessions[1].finishedAt);
  });

  it('เป้าหมายของช่วงคือเป้าหมายรายวันคูณจำนวนวันในช่วง', () => {
    expect(summarizeHistory([], 'week', NOW, 3).goalDistanceKm).toBe(21);
    expect(summarizeHistory([], 'month', NOW, 3).goalDistanceKm).toBe(45);
  });

  it('การวิ่งเมื่อเช้านี้ยังนับอยู่ในช่วง ไม่ตกหล่นเพราะเวลายังไม่ถึงสิ้นวัน', () => {
    const thisMorning = new Date(NOW);
    thisMorning.setHours(6, 0, 0, 0);

    const week = summarizeHistory([session({ finishedAt: thisMorning.getTime() })], 'week', NOW, 3);

    expect(week.sessions).toHaveLength(1);
    expect(week.buckets[week.buckets.length - 1].distanceKm).toBe(5);
  });
});

describe('summarizeHistory — วันที่คร่อมการปรับเวลาตามฤดูกาล', () => {
  // ⚠️ เทสต์กลุ่มนี้ผ่านแบบไม่มีความหมายเมื่อรันในเขตเวลาที่ไม่มีการปรับเวลาตามฤดูกาล ซึ่งรวมถึง
  // ไทยและเครื่องที่พัฒนาโปรเจกต์นี้ ยืนยันแล้วว่า Node บนวินโดวส์ไม่สนใจตัวแปรแวดล้อม TZ เลย
  // (Intl ยังรายงาน Asia/Bangkok อยู่ดี) จึงบังคับให้รันในเขตเวลาที่มี DST เพื่อทดสอบจริงไม่ได้
  // ที่นี่ ตรวจสอบแล้วว่าโค้ดเวอร์ชันที่มีบั๊กก็ผ่านเทสต์กลุ่มนี้บนเครื่องนี้เหมือนกัน
  //
  // เก็บไว้เพราะจะจับบั๊กได้จริงถ้าวันหนึ่งมีคนรันบนเครื่องหรือ CI ที่ตั้งเขตเวลาแบบมี DST
  // ส่วนความถูกต้องของโค้ดจริงมาจากการไม่บวกลบมิลลิวินาทีกับขอบเขตของวันเลย (ใช้ตัวสร้าง Date
  // เสมอ) ซึ่งถูกต้องโดยตัวมันเองไม่ว่าจะรันที่เขตเวลาไหน ไม่ได้พึ่งเทสต์กลุ่มนี้เป็นหลักฐาน
  const DST_NOW = new Date(2026, 2, 10, 10, 0, 0).getTime();

  function daysBefore(base: number, n: number): number {
    const d = new Date(base);
    d.setDate(d.getDate() - n);
    d.setHours(12, 0, 0, 0);
    return d.getTime();
  }

  it('จุดเริ่มของช่วงยังเป็นเที่ยงคืนพอดี ไม่เลื่อนไปชั่วโมงอื่น', () => {
    expect(new Date(rangeBounds('week', DST_NOW).start).getHours()).toBe(0);
  });

  it('การวิ่งดึกของวันที่ยาว 25 ชั่วโมงยังถูกนับ ไม่หลุดออกจากช่วงเพราะจุดจบเพี้ยน', () => {
    // 1 พ.ย. 2026 เป็นวันที่สหรัฐปรับเวลาถอยหลัง วันนั้นจึงยาว 25 ชั่วโมง ถ้าคำนวณจุดจบด้วยการ
    // บวก 24 ชั่วโมง จุดจบจะไปตกที่ 23:00 ทำให้การวิ่งที่จบ 23:30 หายไปจากทุกช่วงโดยไม่มีร่องรอย
    // (ดูคำเตือนของ describe ด้านบน เทสต์นี้ไม่ได้พิสูจน์อะไรบนเครื่องที่ไม่มี DST)
    const fallBackNow = new Date(2026, 10, 1, 20, 0, 0).getTime();
    const lateRun = new Date(2026, 10, 1, 23, 30, 0).getTime();

    for (const range of ['week', 'month', 'year'] as const) {
      const summary = summarizeHistory([session({ finishedAt: lateRun })], range, fallBackNow, 3);
      expect(summary.sessions).toHaveLength(1);
      expect(summary.totalDistanceKm).toBe(5);
    }
  });

  it('ระยะทางทุก Session ยังขึ้นกราฟครบ ไม่หายไปเพราะแท่งจับคู่ไม่ตรง', () => {
    const sessions = [
      session({ finishedAt: daysBefore(DST_NOW, 0), distanceKm: 2 }),
      session({ finishedAt: daysBefore(DST_NOW, 3), distanceKm: 4, id: 2 }),
      session({ finishedAt: daysBefore(DST_NOW, 6), distanceKm: 6, id: 3 }),
    ];

    const summary = summarizeHistory(sessions, 'week', DST_NOW, 3);
    const charted = summary.buckets.reduce((sum, b) => sum + b.distanceKm, 0);

    expect(summary.buckets).toHaveLength(7);
    expect(summary.totalDistanceKm).toBe(12);
    expect(charted).toBe(12);
  });
});

describe('summarizeHistory — แท่งปัจจุบัน', () => {
  it('มีแท่งที่เป็นปัจจุบันแท่งเดียวเสมอในทุกช่วง', () => {
    for (const range of ['week', 'month', 'year'] as const) {
      const buckets = summarizeHistory([], range, NOW, 3).buckets;
      expect(buckets.filter((b) => b.isCurrent)).toHaveLength(1);
      // แท่งปัจจุบันต้องเป็นแท่งสุดท้ายเสมอ เพราะไม่มีแท่งของอนาคตในทุกช่วงแล้ว
      expect(buckets[buckets.length - 1].isCurrent).toBe(true);
    }
  });
});

describe('formTrend', () => {
  const good = { hasEnoughData: true, cadenceDropped: false, paceDropped: false, summary: 'ดี' };
  const cadence = { hasEnoughData: true, cadenceDropped: true, paceDropped: false, summary: 'ตก' };
  const short = { hasEnoughData: false, cadenceDropped: false, paceDropped: false, summary: 'สั้น' };

  it('เรียงจากเก่าไปใหม่ เพื่ออ่านซ้ายไปขวาเป็นเส้นเวลา', () => {
    const sessions = [
      session({ finishedAt: daysAgo(1), formScore: cadence }),
      session({ finishedAt: daysAgo(5), formScore: good }),
    ];

    expect(formTrend(sessions).points).toEqual(['good', 'cadenceDropped']);
  });

  it('ไม่นับครั้งที่ข้อมูลไม่พอเป็นครั้งที่ประเมินได้', () => {
    const sessions = [
      session({ finishedAt: daysAgo(3), formScore: good }),
      session({ finishedAt: daysAgo(2), formScore: short, id: 2 }),
    ];

    const trend = formTrend(sessions);

    expect(trend.points).toEqual(['good', 'notEnoughData']);
    expect(trend.ratedCount).toBe(1);
    expect(trend.goodCount).toBe(1);
  });

  it('เอาเฉพาะครั้งล่าสุดตามจำนวนที่กำหนด ไม่ใช่ทั้งหมด', () => {
    const sessions = Array.from({ length: 20 }, (_, i) =>
      session({ finishedAt: daysAgo(i + 1), id: i })
    );

    expect(formTrend(sessions, 5).points).toHaveLength(5);
  });

  it('ไม่มีประวัติเลย คืนค่าว่างโดยไม่พัง', () => {
    expect(formTrend([])).toEqual({ points: [], goodCount: 0, ratedCount: 0 });
  });
});

describe('distanceOnDay', () => {
  it('รวมเฉพาะการวิ่งที่จบในวันเดียวกัน ไม่รวมวันอื่น', () => {
    const sessions = [
      session({ finishedAt: daysAgo(0), distanceKm: 3 }),
      session({ finishedAt: daysAgo(0) + 60 * 60 * 1000, distanceKm: 2, id: 2 }),
      session({ finishedAt: daysAgo(1), distanceKm: 9, id: 3 }),
    ];

    expect(distanceOnDay(sessions, NOW)).toBe(5);
  });

  it('ไม่มีการวิ่งวันนั้นเลย ได้ศูนย์ ไม่ใช่ค่าที่ทำให้หารพัง', () => {
    expect(distanceOnDay([], NOW)).toBe(0);
  });
});
