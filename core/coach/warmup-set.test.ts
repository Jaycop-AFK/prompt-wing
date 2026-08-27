import { describe, expect, it } from 'vitest';

import { MOVES } from '../../components/warmup/moves';
import { catalogMoveIds, rampPhaseOf, selectWarmUpSet, type SelectWarmUpSetInput } from './warmup-set';
import type { ClearanceFactor, RampPhase, SessionTarget, WarmUpMinutes } from './types';

const RAMP_PHASES: RampPhase[] = ['raise', 'activate', 'mobilise', 'potentiate'];
const MINUTE_OPTIONS: WarmUpMinutes[] = [5, 10, 15];

const baseInput = (overrides: Partial<SelectWarmUpSetInput> = {}): SelectWarmUpSetInput => ({
  clearanceFactors: [],
  cadenceDroppedLastTime: false,
  sessionTarget: null,
  minutes: 10,
  ...overrides,
});

function phasesPresent(slots: { moveId: string }[]): Set<RampPhase> {
  const phases = new Set<RampPhase>();
  for (const slot of slots) {
    const phase = rampPhaseOf(slot.moveId);
    if (phase) phases.add(phase);
  }
  return phases;
}

describe('selectWarmUpSet — ครบทั้งสี่ขั้น RAMP เสมอ', () => {
  for (const minutes of MINUTE_OPTIONS) {
    it(`มีท่าครบทั้งสี่ขั้นเมื่อเลือก ${minutes} นาที`, () => {
      const result = selectWarmUpSet(baseInput({ minutes }));
      const phases = phasesPresent(result.slots);

      for (const phase of RAMP_PHASES) expect(phases.has(phase)).toBe(true);
    });
  }

  it('ยังครบสี่ขั้นแม้อากาศร้อนและ cadence ตกพร้อมกัน', () => {
    const result = selectWarmUpSet(
      baseInput({ clearanceFactors: ['heat'], cadenceDroppedLastTime: true, minutes: 5 })
    );
    const phases = phasesPresent(result.slots);

    for (const phase of RAMP_PHASES) expect(phases.has(phase)).toBe(true);
  });
});

describe('selectWarmUpSet — ผลรวมเวลาไม่เกินเวลาที่มี', () => {
  const scenarios: Partial<SelectWarmUpSetInput>[] = [
    {},
    { clearanceFactors: ['heat'] },
    { cadenceDroppedLastTime: true },
    { sessionTarget: { kind: 'distance', km: 21 } },
    { sessionTarget: { kind: 'time', minutes: 90 } },
    { clearanceFactors: ['heat'], cadenceDroppedLastTime: true, sessionTarget: { kind: 'distance', km: 21 } },
  ];

  for (const minutes of MINUTE_OPTIONS) {
    for (const [i, scenario] of scenarios.entries()) {
      it(`สถานการณ์ ${i + 1} เมื่อเลือก ${minutes} นาที ไม่เกินเพดาน`, () => {
        const result = selectWarmUpSet(baseInput({ ...scenario, minutes }));
        expect(result.totalSeconds).toBeLessThanOrEqual(minutes * 60);
      });
    }
  }
});

describe('selectWarmUpSet — วันที่ร้อนลดความหนักของท่ากระโดด', () => {
  it('ท่ายกเข่าสูง ซึ่งเป็นท่ากระโดดเพียงท่าเดียวในแปดท่า ได้เวลาน้อยลงมากในวันที่ร้อน', () => {
    const hot = selectWarmUpSet(baseInput({ clearanceFactors: ['heat'] }));
    const notHot = selectWarmUpSet(baseInput({ clearanceFactors: [] }));

    const hotHighKnee = hot.slots.find((s) => s.moveId === 'high-knee')!;
    const normalHighKnee = notHot.slots.find((s) => s.moveId === 'high-knee')!;

    expect(hotHighKnee.seconds).toBeLessThan(normalHighKnee.seconds * 0.6);
  });

  it('ท่าที่ไม่ใช่ท่ากระโดดไม่ถูกลดเวลาเพราะอากาศร้อน', () => {
    const hot = selectWarmUpSet(baseInput({ clearanceFactors: ['heat'] }));
    const notHot = selectWarmUpSet(baseInput({ clearanceFactors: [] }));

    const hotLegSwing = hot.slots.find((s) => s.moveId === 'leg-swing')!;
    const normalLegSwing = notHot.slots.find((s) => s.moveId === 'leg-swing')!;

    expect(hotLegSwing.seconds).toBe(normalLegSwing.seconds);
  });

  it('มีเหตุผลอธิบายให้ผู้ใช้เห็นว่าทำไมชุดนี้ถึงถูกปรับ', () => {
    const result = selectWarmUpSet(baseInput({ clearanceFactors: ['heat'] as ClearanceFactor[] }));
    expect(result.reasons.some((reason) => reason.includes('ร้อน'))).toBe(true);
  });
});

describe('selectWarmUpSet — cadence ตกช่วงท้ายเพิ่มท่าน่องและหน้าแข้ง', () => {
  it('ท่าเขย่งปลายเท้าและกระดกปลายเท้าได้เวลามากขึ้นเมื่อ cadence ตกครั้งก่อน', () => {
    const dropped = selectWarmUpSet(baseInput({ cadenceDroppedLastTime: true }));
    const notDropped = selectWarmUpSet(baseInput({ cadenceDroppedLastTime: false }));

    const calfDropped = dropped.slots.find((s) => s.moveId === 'calf-raise')!;
    const calfNormal = notDropped.slots.find((s) => s.moveId === 'calf-raise')!;
    const toeDropped = dropped.slots.find((s) => s.moveId === 'toe-raise')!;
    const toeNormal = notDropped.slots.find((s) => s.moveId === 'toe-raise')!;

    expect(calfDropped.seconds).toBeGreaterThan(calfNormal.seconds);
    expect(toeDropped.seconds).toBeGreaterThan(toeNormal.seconds);
  });

  it('ท่าที่ไม่เกี่ยวกับน่องหรือหน้าแข้งไม่ถูกยืดเวลาจากสัญญาณนี้', () => {
    const dropped = selectWarmUpSet(baseInput({ cadenceDroppedLastTime: true }));
    const notDropped = selectWarmUpSet(baseInput({ cadenceDroppedLastTime: false }));

    const jogDropped = dropped.slots.find((s) => s.moveId === 'jog-in-place')!;
    const jogNormal = notDropped.slots.find((s) => s.moveId === 'jog-in-place')!;

    expect(jogDropped.seconds).toBe(jogNormal.seconds);
  });

  it('มีเหตุผลอธิบายให้ผู้ใช้เห็น', () => {
    const result = selectWarmUpSet(baseInput({ cadenceDroppedLastTime: true }));
    expect(result.reasons.some((reason) => reason.includes('cadence'))).toBe(true);
  });
});

describe('selectWarmUpSet — SessionTarget ระยะไกลได้ชุดที่ยาวกว่าระยะสั้น', () => {
  const LONG: SessionTarget = { kind: 'distance', km: 21 };
  const SHORT: SessionTarget = { kind: 'distance', km: 2 };

  it('ระยะไกลรวมเวลานานกว่าระยะสั้น เมื่อเวลาที่มีเท่ากัน', () => {
    const long = selectWarmUpSet(baseInput({ sessionTarget: LONG, minutes: 15 }));
    const short = selectWarmUpSet(baseInput({ sessionTarget: SHORT, minutes: 15 }));

    expect(long.totalSeconds).toBeGreaterThan(short.totalSeconds);
  });

  it('ผลเดียวกันนี้เป็นจริงทั้งสามความยาวที่เลือกได้', () => {
    for (const minutes of MINUTE_OPTIONS) {
      const long = selectWarmUpSet(baseInput({ sessionTarget: LONG, minutes }));
      const short = selectWarmUpSet(baseInput({ sessionTarget: SHORT, minutes }));

      expect(long.totalSeconds).toBeGreaterThanOrEqual(short.totalSeconds);
    }
  });

  it('เป้าหมายเป็นเวลาหรือแคลอรีก็ให้ผลทิศทางเดียวกัน', () => {
    const longByTime = selectWarmUpSet(baseInput({ sessionTarget: { kind: 'time', minutes: 90 } }));
    const shortByTime = selectWarmUpSet(baseInput({ sessionTarget: { kind: 'time', minutes: 15 } }));
    expect(longByTime.totalSeconds).toBeGreaterThan(shortByTime.totalSeconds);

    const longByCalorie = selectWarmUpSet(baseInput({ sessionTarget: { kind: 'calories', kcal: 600 } }));
    const shortByCalorie = selectWarmUpSet(baseInput({ sessionTarget: { kind: 'calories', kcal: 100 } }));
    expect(longByCalorie.totalSeconds).toBeGreaterThan(shortByCalorie.totalSeconds);
  });
});

describe('CATALOG ของ core/coach ต้องตรงกับ components/warmup/moves.ts เสมอ', () => {
  // warmup-set.ts มีแคตตาล็อกของตัวเองแยกจากตัวจริงใน components/warmup/moves.ts โดยตั้งใจ
  // (core/coach ต้องไม่ import ข้ามไปยังโฟลเดอร์ UI) เทสต์นี้คือสิ่งเดียวที่คอยจับว่าสองรายชื่อ
  // หลุดไม่ตรงกัน ถ้าใครเพิ่ม/ลบ/เปลี่ยนขั้น RAMP ของท่าใดที่ฝั่งเดียวแล้วลืมอีกฝั่ง เทสต์นี้จะแดง

  it('มีรหัสท่าครบชุดเดียวกัน ไม่ขาดไม่เกิน', () => {
    const coachIds = new Set(catalogMoveIds());
    const characterIds = new Set(MOVES.map((move) => move.id));

    expect(coachIds).toEqual(characterIds);
  });

  it('ขั้น RAMP ของแต่ละท่าตรงกันทุกตัว', () => {
    for (const move of MOVES) {
      expect(rampPhaseOf(move.id)).toBe(move.ramp);
    }
  });
});

describe('rampPhaseOf', () => {
  it('คืนขั้นที่ถูกต้องของท่าที่รู้จัก', () => {
    expect(rampPhaseOf('jog-in-place')).toBe('raise');
    expect(rampPhaseOf('high-knee')).toBe('potentiate');
  });

  it('คืน null สำหรับรหัสท่าที่ไม่รู้จัก', () => {
    expect(rampPhaseOf('cartwheel')).toBeNull();
  });
});
