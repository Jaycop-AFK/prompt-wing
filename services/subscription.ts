import type { EpochMillis } from '@/core/coach';

/**
 * แพ็กเกจสมาชิกของบัญชี (Subscription)
 *
 * ต้นแบบนี้ยังไม่มีระบบชำระเงิน การสมัคร เปลี่ยน และยกเลิกแพ็กเกจเป็นแค่การเปลี่ยนสถานะที่เก็บไว้ในบัญชี
 * ไฟล์นี้จึงมีแค่กติกาของสถานะ ไม่รู้จัก Supabase ตัวเก็บจริงอยู่ที่ storage/account-metadata.ts
 * เหตุผลที่เก็บใน user_metadata ของบัญชีและสิ่งที่ต้องเปลี่ยนก่อนเก็บเงินจริงอยู่ใน docs/adr/0006
 */

export type PlanId = 'free' | 'plusMonthly' | 'plusYearly';
export type PaidPlanId = Exclude<PlanId, 'free'>;
export type BillingPeriod = 'month' | 'year';

export interface PaidPlan {
  id: PaidPlanId;
  period: BillingPeriod;
  /** ราคาต่อหนึ่งรอบบิล หน่วยบาท เป็นราคาเสนอเพื่อทดสอบ ไม่ใช่ราคาที่พิสูจน์แล้ว ดู docs/business-model.md */
  priceThb: number;
}

export const PAID_PLANS: Record<PaidPlanId, PaidPlan> = {
  plusMonthly: { id: 'plusMonthly', period: 'month', priceThb: 99 },
  plusYearly: { id: 'plusYearly', period: 'year', priceThb: 990 },
};

/** ลำดับที่แสดงตัวเลือกแพ็กเกจ */
export const PAID_PLAN_ORDER: PaidPlanId[] = ['plusMonthly', 'plusYearly'];

export interface Subscription {
  plan: PlanId;
  /** เวลาที่เริ่มแพ็กเกจที่ใช้อยู่ ใช้นับรอบต่ออายุ null เมื่อเป็นแพ็กเกจฟรี */
  startedAt: EpochMillis | null;
}

export const FREE_SUBSCRIPTION: Subscription = { plan: 'free', startedAt: null };

export function isPaidPlan(plan: PlanId): plan is PaidPlanId {
  return plan !== 'free';
}

/** บัญชีนี้ใช้ฟีเจอร์ Plus ได้หรือไม่ */
export function hasPlus(subscription: Subscription): boolean {
  return isPaidPlan(subscription.plan);
}

/** ชื่อคีย์ใน user_metadata ของบัญชี Supabase */
export const SUBSCRIPTION_METADATA_KEY = 'subscription';

/** รูปร่างที่เก็บจริงในบัญชี ใช้ snake_case ตามแบบของคอลัมน์ในฐานข้อมูล */
export interface SubscriptionMetadata {
  plan: PlanId;
  started_at: string | null;
}

/**
 * อ่านแพ็กเกจจาก user_metadata ของบัญชี
 *
 * ข้อมูลที่อ่านไม่ออกหรือไม่ครบถือเป็นแพ็กเกจฟรีเสมอ ไม่เดาว่าเป็น Plus เพราะการปลดล็อกผิดคนแย่กว่า
 * การที่ผู้ใช้ต้องกดสมัครซ้ำ แพ็กเกจเสียเงินที่ไม่มีวันเริ่มก็ถือว่าไม่ครบ เพราะนับรอบต่ออายุไม่ได้
 */
export function subscriptionFromMetadata(
  metadata: Readonly<Record<string, unknown>> | null | undefined
): Subscription {
  const raw = metadata?.[SUBSCRIPTION_METADATA_KEY];
  if (typeof raw !== 'object' || raw === null) return FREE_SUBSCRIPTION;

  const { plan, started_at: startedAt } = raw as Record<string, unknown>;
  if (plan !== 'plusMonthly' && plan !== 'plusYearly') return FREE_SUBSCRIPTION;

  const at = typeof startedAt === 'string' ? Date.parse(startedAt) : Number.NaN;
  if (!Number.isFinite(at)) return FREE_SUBSCRIPTION;

  return { plan, startedAt: at };
}

export function subscriptionToMetadata(subscription: Subscription): SubscriptionMetadata {
  return {
    plan: subscription.plan,
    started_at: subscription.startedAt === null ? null : new Date(subscription.startedAt).toISOString(),
  };
}

/** ชนิดของการเปลี่ยนแพ็กเกจ ใช้เลือกถ้อยคำยืนยันให้ตรงกับสิ่งที่กำลังจะเกิด */
export type PlanChange = 'subscribe' | 'switch' | 'cancel' | 'none';

export function planChangeOf(from: PlanId, to: PlanId): PlanChange {
  if (from === to) return 'none';
  if (to === 'free') return 'cancel';
  return from === 'free' ? 'subscribe' : 'switch';
}

/**
 * สถานะหลังเปลี่ยนไปใช้แพ็กเกจ to
 *
 * สมัครใหม่หรือสลับรอบบิลเริ่มนับรอบใหม่ตั้งแต่ตอนนี้ ยกเลิกแล้วกลับเป็นแพ็กเกจฟรีทันที
 * ร้านแอปจริงจะให้ใช้ต่อจนจบรอบบิลและคิดส่วนต่างตอนสลับรอบ ต้นแบบตั้งใจทำให้เห็นผลทันที
 * เพื่อทดลองเปิดปิดฟีเจอร์ Plus ได้ในการนำเสนอ หน้าจอยืนยันต้องบอกความต่างนี้ให้ผู้ใช้รู้
 */
export function changePlan(current: Subscription, to: PlanId, now: EpochMillis): Subscription {
  switch (planChangeOf(current.plan, to)) {
    case 'none':
      return current;
    case 'cancel':
      return FREE_SUBSCRIPTION;
    case 'subscribe':
    case 'switch':
      return { plan: to, startedAt: now };
  }
}

const MONTHS_PER_PERIOD: Record<BillingPeriod, number> = { month: 1, year: 12 };

/**
 * บวกเดือนตามปฏิทินของเครื่อง วันที่ที่ไม่มีในเดือนปลายทางถูกปัดเป็นวันสุดท้ายของเดือนนั้น
 *
 * ต้องนับจากวันเริ่มเดิมทุกครั้ง ไม่ใช่ต่อจากรอบก่อนหน้า สมัครวันที่ 31 ม.ค. จึงต่ออายุ 28 ก.พ.
 * แล้วกลับมาเป็น 31 มี.ค. ถ้านับต่อจากรอบก่อนจะเลื่อนไปเป็นวันที่ 28 ตลอดไป
 */
export function addCalendarMonths(at: EpochMillis, months: number): EpochMillis {
  const start = new Date(at);
  const target = new Date(
    start.getFullYear(),
    start.getMonth() + months,
    1,
    start.getHours(),
    start.getMinutes(),
    start.getSeconds(),
    start.getMilliseconds()
  );
  const lastDayOfTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(start.getDate(), lastDayOfTargetMonth));
  return target.getTime();
}

/** วันต่ออายุรอบถัดไปที่ยังมาไม่ถึง null เมื่อเป็นแพ็กเกจฟรี */
export function nextRenewalAt(subscription: Subscription, now: EpochMillis): EpochMillis | null {
  if (!isPaidPlan(subscription.plan) || subscription.startedAt === null) return null;

  const { startedAt } = subscription;
  const step = MONTHS_PER_PERIOD[PAID_PLANS[subscription.plan].period];
  const start = new Date(startedAt);
  const current = new Date(now);
  const monthsElapsed =
    (current.getFullYear() - start.getFullYear()) * 12 + current.getMonth() - start.getMonth();

  // เดาจำนวนรอบจากเดือนที่ผ่านไปก่อน แล้วขยับทีละรอบให้ได้รอบแรกที่อยู่หลังตอนนี้พอดี
  // ไม่วนจากรอบที่หนึ่งทุกครั้ง เพราะบัญชีที่สมัครมานานจะต้องวนหลายสิบรอบทุกครั้งที่จอวาดใหม่
  let cycles = Math.max(1, Math.floor(monthsElapsed / step));
  while (cycles > 1 && addCalendarMonths(startedAt, (cycles - 1) * step) > now) cycles -= 1;
  while (addCalendarMonths(startedAt, cycles * step) <= now) cycles += 1;

  return addCalendarMonths(startedAt, cycles * step);
}

/** ราคาเฉลี่ยต่อเดือนของแพ็กเกจ */
export function monthlyPriceThb(plan: PaidPlan): number {
  return plan.priceThb / MONTHS_PER_PERIOD[plan.period];
}

/** รายปีถูกกว่าจ่ายรายเดือนครบสิบสองเดือนกี่บาท */
export function yearlySavingThb(): number {
  return PAID_PLANS.plusMonthly.priceThb * 12 - PAID_PLANS.plusYearly.priceThb;
}
