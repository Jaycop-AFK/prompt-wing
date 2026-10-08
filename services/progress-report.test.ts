import { describe, expect, it } from 'vitest';

import { insightCopy } from '@/components/progress/copy';

import { buildProgressReport, type Insight } from './progress-report';
import type { SessionRecord } from './session-record';

/** 16 ก.ย. 2026 เวลา 20:00 ตามเขตเวลาของเครื่องที่รันเทสต์ */
const NOW = new Date(2026, 8, 16, 20, 0).getTime();

/** เจ็ดโมงเช้าของ n วันก่อนวันนี้ */
function daysAgo(n: number): number {
  return new Date(2026, 8, 16 - n, 7, 0).getTime();
}

function session(
  daysBefore: number,
  distanceKm: number,
  paceSecPerKm = 420,
  form: Partial<SessionRecord['formScore']> = {}
): SessionRecord {
  const movingSeconds = distanceKm * paceSecPerKm;
  return {
    id: daysBefore * 100 + distanceKm,
    finishedAt: daysAgo(daysBefore),
    distanceKm,
    elapsedSeconds: movingSeconds,
    movingSeconds,
    paceSecPerKm,
    bestPaceSecPerKm: null,
    runMode: 'free',
    programName: null,
    sessionTarget: null,
    calories: 0,
    formScore: { hasEnoughData: true, cadenceDropped: false, paceDropped: false, summary: '', ...form },
    splits: [],
    route: [],
  };
}

const kinds = (insights: Insight[]) => insights.map((insight) => insight.kind);

describe('buildProgressReport — ช่วงเวลาและสถิติ', () => {
  it('แยก 28 วันล่าสุดกับ 28 วันก่อนหน้าตามวัน ไม่ใช่ตามเดือนปฏิทิน', () => {
    const report = buildProgressReport([session(0, 5), session(27, 4), session(28, 3), session(55, 2), session(56, 9)], NOW);

    expect(report.recent.runs).toBe(2);
    expect(report.recent.distanceKm).toBe(9);
    expect(report.previous.runs).toBe(2);
    expect(report.previous.distanceKm).toBe(5);
  });

  it('pace เฉลี่ยถ่วงตามระยะ การวิ่งยาวมีน้ำหนักมากกว่า', () => {
    const report = buildProgressReport([session(1, 9, 400), session(2, 1, 600)], NOW);
    expect(report.recent.paceSecPerKm).toBeCloseTo((9 * 400 + 600) / 10, 5);
  });

  it('นับวันที่วิ่ง ไม่ใช่จำนวนครั้ง', () => {
    const report = buildProgressReport([session(1, 3), session(1, 2), session(3, 4)], NOW);
    expect(report.recent.activeDays).toBe(2);
    expect(report.recent.runs).toBe(3);
  });

  it('มีกราฟแปดช่วงเจ็ดวัน ช่วงสุดท้ายคือ 7 วันล่าสุด', () => {
    const report = buildProgressReport([session(0, 5), session(6, 2), session(7, 4)], NOW);

    expect(report.weeks).toHaveLength(8);
    expect(report.weeks[7].isCurrent).toBe(true);
    expect(report.weeks[7].distanceKm).toBe(7);
    expect(report.weeks[6].distanceKm).toBe(4);
  });

  it('pace ปกติเป็นมัธยฐาน ไม่ถูกดึงด้วยการวิ่งครั้งเดียวที่ช้าผิดปกติ', () => {
    const report = buildProgressReport([session(1, 5, 400), session(2, 5, 410), session(3, 5, 900)], NOW);
    expect(report.typicalPaceSecPerKm).toBe(410);
  });
});

describe('buildProgressReport — ข้อสังเกต', () => {
  it('ไม่มีประวัติเลยไม่มีข้อสังเกต', () => {
    expect(buildProgressReport([], NOW).insights).toEqual([]);
  });

  it('ประวัติยังน้อยบอกว่าต้องวิ่งอีกกี่ครั้ง', () => {
    const report = buildProgressReport([session(1, 3)], NOW);
    expect(report.insights).toContainEqual({ kind: 'firstSteps', runsNeeded: 3 });
  });

  it('ไม่ได้วิ่งเกินหนึ่งสัปดาห์ แนะนำให้กลับมาเบา ๆ ก่อนเป็นเรื่องแรก', () => {
    const report = buildProgressReport([session(10, 5), session(12, 5), session(14, 5), session(16, 5)], NOW);
    expect(report.insights[0]).toEqual({ kind: 'comeback', daysSinceLastRun: 10 });
  });

  it('ระยะเจ็ดวันล่าสุดพุ่งจากเจ็ดวันก่อนหน้า เตือนให้ค่อย ๆ เพิ่ม', () => {
    const report = buildProgressReport([session(1, 6), session(3, 6), session(8, 4), session(10, 2)], NOW);
    expect(report.insights).toContainEqual({ kind: 'loadJump', percent: 100 });
  });

  it('ระยะเดิมที่น้อยมากไม่ถูกนับว่าเพิ่มเร็ว เพราะเปอร์เซ็นต์แกว่งเกินแปลผล', () => {
    const report = buildProgressReport([session(1, 4), session(8, 1)], NOW);
    expect(kinds(report.insights)).not.toContain('loadJump');
  });

  it('pace เร็วขึ้นอย่างน้อยสิบวินาทีต่อกิโลเมตรเมื่อมีข้อมูลพอทั้งสองช่วง', () => {
    const recent = [session(2, 5, 400), session(9, 5, 400), session(16, 5, 400)];
    const previous = [session(30, 5, 430), session(37, 5, 430), session(44, 5, 430)];

    const report = buildProgressReport([...recent, ...previous], NOW);
    expect(report.insights).toContainEqual({ kind: 'paceFaster', secPerKm: 30 });
  });

  it('cadence ตกช่วงท้ายเกินครึ่งของครั้งที่ประเมินได้ แนะนำเรื่องจังหวะก้าว', () => {
    const report = buildProgressReport(
      [
        session(1, 4, 420, { cadenceDropped: true }),
        session(3, 4, 420, { cadenceDropped: true }),
        session(5, 4, 420),
        session(6, 4, 420, { hasEnoughData: false }),
      ],
      NOW
    );
    expect(report.insights).toContainEqual({ kind: 'cadenceFade', count: 2, rated: 3 });
  });

  it('ข้อสังเกตไม่เกินสี่ข้อ และเรื่องฟอร์มที่ปรับได้ทันทีไม่ถูกคำชมเบียดหลุดไป', () => {
    const history = [
      ...Array.from({ length: 14 }, (_, i) => session(i * 2, i < 3 ? 8 : 3, 390, { cadenceDropped: true })),
      session(30, 1, 450),
      session(33, 1, 450),
      session(36, 1, 450),
    ];
    const insights = kinds(buildProgressReport(history, NOW).insights);

    expect(insights.length).toBeLessThanOrEqual(4);
    expect(insights).toContain('cadenceFade');
  });
});

describe('insightCopy', () => {
  it('ทุกข้อสังเกตมีหัวข้อและรายละเอียดที่ไม่ว่าง', () => {
    const samples: Insight[] = [
      { kind: 'comeback', daysSinceLastRun: 9 },
      { kind: 'loadJump', percent: 45 },
      { kind: 'paceFaster', secPerKm: 12 },
      { kind: 'paceSlower', secPerKm: 20 },
      { kind: 'distanceUp', percent: 15 },
      { kind: 'distanceDown', percent: 40 },
      { kind: 'longestRun', km: 8.2 },
      { kind: 'cadenceFade', count: 3, rated: 4 },
      { kind: 'paceFade', count: 2, rated: 3 },
      { kind: 'consistencyGood', activeDays: 13 },
      { kind: 'consistencyLow', activeDays: 3 },
      { kind: 'firstSteps', runsNeeded: 2 },
    ];

    for (const sample of samples) {
      const copy = insightCopy(sample);
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.detail.length).toBeGreaterThan(0);
    }
  });

  it('ไม่อ้างว่าป้องกันการบาดเจ็บ', () => {
    const copy = insightCopy({ kind: 'loadJump', percent: 60 });
    expect(copy.detail).not.toContain('ป้องกัน');
  });
});
