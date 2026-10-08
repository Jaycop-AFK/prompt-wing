import { describe, expect, it } from 'vitest';

import {
  addCalendarMonths,
  changePlan,
  FREE_SUBSCRIPTION,
  hasPlus,
  monthlyPriceThb,
  nextRenewalAt,
  PAID_PLANS,
  planChangeOf,
  subscriptionFromMetadata,
  subscriptionToMetadata,
  yearlySavingThb,
  type Subscription,
} from './subscription';

// ใช้ตัวสร้าง Date ตามเขตเวลาของเครื่อง เพราะรอบต่ออายุนับตามปฏิทินของเครื่องผู้ใช้ เทสต์จึงรันได้ทุกเขตเวลา
const at = (year: number, month: number, day: number, hour = 9) =>
  new Date(year, month - 1, day, hour, 0, 0, 0).getTime();

describe('subscriptionFromMetadata — อ่านไม่ออกถือเป็นแพ็กเกจฟรีเสมอ', () => {
  it('บัญชีใหม่ที่ยังไม่มีข้อมูลแพ็กเกจเป็นแพ็กเกจฟรี', () => {
    expect(subscriptionFromMetadata(undefined)).toEqual(FREE_SUBSCRIPTION);
    expect(subscriptionFromMetadata({})).toEqual(FREE_SUBSCRIPTION);
    expect(subscriptionFromMetadata({ subscription: null })).toEqual(FREE_SUBSCRIPTION);
  });

  it('ชื่อแพ็กเกจที่ไม่รู้จักไม่ถูกปลดล็อกเป็น Plus', () => {
    expect(subscriptionFromMetadata({ subscription: { plan: 'gold', started_at: '2026-09-01T00:00:00.000Z' } }))
      .toEqual(FREE_SUBSCRIPTION);
  });

  it('แพ็กเกจเสียเงินที่ไม่มีวันเริ่มถือว่าข้อมูลไม่ครบ', () => {
    expect(subscriptionFromMetadata({ subscription: { plan: 'plusMonthly' } })).toEqual(FREE_SUBSCRIPTION);
    expect(subscriptionFromMetadata({ subscription: { plan: 'plusMonthly', started_at: 'เมื่อวาน' } }))
      .toEqual(FREE_SUBSCRIPTION);
  });

  it('อ่านแพ็กเกจที่เขียนด้วย subscriptionToMetadata กลับมาได้ตรงเดิม', () => {
    const subscription: Subscription = { plan: 'plusYearly', startedAt: at(2026, 9, 16) };
    const stored = { subscription: subscriptionToMetadata(subscription) };

    expect(subscriptionFromMetadata(stored)).toEqual(subscription);
    expect(hasPlus(subscriptionFromMetadata(stored))).toBe(true);
  });
});

describe('planChangeOf และ changePlan', () => {
  it('แยกการสมัคร สลับรอบบิล ยกเลิก และกดแพ็กเกจเดิมออกจากกัน', () => {
    expect(planChangeOf('free', 'plusMonthly')).toBe('subscribe');
    expect(planChangeOf('plusMonthly', 'plusYearly')).toBe('switch');
    expect(planChangeOf('plusYearly', 'free')).toBe('cancel');
    expect(planChangeOf('plusYearly', 'plusYearly')).toBe('none');
  });

  it('สลับรอบบิลเริ่มนับรอบใหม่ตั้งแต่ตอนที่เปลี่ยน', () => {
    const current: Subscription = { plan: 'plusMonthly', startedAt: at(2026, 6, 1) };
    const now = at(2026, 9, 16);

    expect(changePlan(current, 'plusYearly', now)).toEqual({ plan: 'plusYearly', startedAt: now });
  });

  it('ยกเลิกแล้วกลับเป็นแพ็กเกจฟรีทันที', () => {
    const current: Subscription = { plan: 'plusYearly', startedAt: at(2026, 6, 1) };
    expect(changePlan(current, 'free', at(2026, 9, 16))).toEqual(FREE_SUBSCRIPTION);
  });

  it('กดแพ็กเกจเดิมซ้ำไม่รีเซ็ตรอบบิล', () => {
    const current: Subscription = { plan: 'plusMonthly', startedAt: at(2026, 6, 1) };
    expect(changePlan(current, 'plusMonthly', at(2026, 9, 16))).toBe(current);
  });
});

describe('addCalendarMonths — วันที่ที่ไม่มีในเดือนปลายทาง', () => {
  it('31 ม.ค. บวกหนึ่งเดือนเป็นวันสุดท้ายของ ก.พ. ทั้งปีปกติและปีอธิกสุรทิน', () => {
    expect(addCalendarMonths(at(2026, 1, 31), 1)).toBe(at(2026, 2, 28));
    expect(addCalendarMonths(at(2028, 1, 31), 1)).toBe(at(2028, 2, 29));
  });

  it('นับจากวันเริ่มเดิม จึงกลับมาเป็นวันที่ 31 ในเดือนที่มี 31 วัน', () => {
    expect(addCalendarMonths(at(2026, 1, 31), 2)).toBe(at(2026, 3, 31));
  });
});

describe('nextRenewalAt', () => {
  it('แพ็กเกจฟรีไม่มีวันต่ออายุ', () => {
    expect(nextRenewalAt(FREE_SUBSCRIPTION, at(2026, 9, 16))).toBeNull();
  });

  it('รายเดือนต่ออายุรอบถัดไปที่ยังมาไม่ถึง', () => {
    const subscription: Subscription = { plan: 'plusMonthly', startedAt: at(2026, 1, 31) };

    expect(nextRenewalAt(subscription, at(2026, 2, 10))).toBe(at(2026, 2, 28));
    expect(nextRenewalAt(subscription, at(2026, 3, 1))).toBe(at(2026, 3, 31));
    expect(nextRenewalAt(subscription, at(2026, 9, 16))).toBe(at(2026, 9, 30));
  });

  it('ถึงเวลาต่ออายุพอดีแล้ว รอบถัดไปคืออีกหนึ่งรอบ', () => {
    const subscription: Subscription = { plan: 'plusMonthly', startedAt: at(2026, 8, 16) };
    expect(nextRenewalAt(subscription, at(2026, 9, 16))).toBe(at(2026, 10, 16));
  });

  it('รายปีต่ออายุวันเดียวกันของปีถัดไป', () => {
    const subscription: Subscription = { plan: 'plusYearly', startedAt: at(2026, 9, 16) };

    expect(nextRenewalAt(subscription, at(2026, 9, 16, 10))).toBe(at(2027, 9, 16));
    expect(nextRenewalAt(subscription, at(2029, 3, 1))).toBe(at(2029, 9, 16));
  });
});

describe('ราคา', () => {
  it('รายปีเฉลี่ยถูกกว่ารายเดือน และบอกส่วนที่ประหยัดเป็นบาทได้ตรง', () => {
    expect(monthlyPriceThb(PAID_PLANS.plusYearly)).toBeLessThan(monthlyPriceThb(PAID_PLANS.plusMonthly));
    expect(yearlySavingThb()).toBe(99 * 12 - 990);
  });
});
