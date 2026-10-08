import type { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';

import { formatBaht } from '@/components/format';
import type { BillingPeriod, PaidPlan, PlanChange, PlanId } from '@/services/subscription';

/**
 * ถ้อยคำของแพ็กเกจสมาชิก ใช้ร่วมกันทั้งหน้าแพ็กเกจ หน้าโปรไฟล์ และการ์ดฟีเจอร์ที่ล็อกอยู่
 *
 * ใน UI เรียกแพ็กเกจสมาชิกว่า "แพ็กเกจ" เสมอ ไม่ใช้คำว่า "แผน" เพราะคำนั้นจองไว้ให้ "แผนซ้อม" แล้ว
 * (ดู CONTEXT.md) ผู้ใช้จะได้ไม่สับสนระหว่างแพ็กเกจรายเดือนกับแผนซ้อมรายสัปดาห์
 */

export const PLAN_NAME: Record<PlanId, string> = {
  free: 'พร้อมวิ่ง Free',
  plusMonthly: 'พร้อมวิ่ง Plus รายเดือน',
  plusYearly: 'พร้อมวิ่ง Plus รายปี',
};

/** ชื่อสั้นสำหรับประโยคที่มีคำว่าพร้อมวิ่งอยู่แล้ว หรือที่ที่พื้นที่แคบ */
export const PLAN_SHORT_NAME: Record<PlanId, string> = {
  free: 'Free',
  plusMonthly: 'Plus รายเดือน',
  plusYearly: 'Plus รายปี',
};

export const PERIOD_LABEL: Record<BillingPeriod, string> = { month: 'รายเดือน', year: 'รายปี' };

const PERIOD_UNIT: Record<BillingPeriod, string> = { month: 'เดือน', year: 'ปี' };

/** ราคาต่อรอบบิล เช่น "990 บาท/ปี" */
export function priceLabel(plan: PaidPlan): string {
  return `${formatBaht(plan.priceThb)} บาท/${PERIOD_UNIT[plan.period]}`;
}

/** ข้อความสั้นที่บอกทุกครั้งที่มีปุ่มสมัคร ให้ไม่มีใครเข้าใจผิดว่าถูกตัดเงินจริง */
export const MOCK_BILLING_NOTE = 'โหมดทดลอง · ไม่มีการตัดเงินจริง';

export type PlusFeatureId = 'trainingPlan' | 'forecastSchedule' | 'progressReport' | 'adFree';

export interface PlusFeature {
  id: PlusFeatureId;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  /** จอของฟีเจอร์ null เมื่อไม่มีจอของตัวเอง เช่นการซ่อนโฆษณา */
  href: Href | null;
}

export const PLUS_FEATURES: PlusFeature[] = [
  {
    id: 'trainingPlan',
    icon: 'calendar-outline',
    title: 'แผนซ้อม 5K / 10K ที่ปรับตามคุณ',
    description: 'เลือกวันที่สะดวก ระบบจัดการซ้อมรายสัปดาห์ แล้วปรับระดับสัปดาห์ถัดไปจากผลการวิ่งจริง',
    href: '/training-plan',
  },
  {
    id: 'forecastSchedule',
    icon: 'partly-sunny-outline',
    title: 'ตารางซ้อมคู่พยากรณ์และการเตือน',
    description: 'ดูช่วงอากาศที่เหมาะวิ่งในวันซ้อม 7 วันข้างหน้า และตั้งเตือนก่อนถึงเวลาซ้อม',
    href: '/training-plan',
  },
  {
    id: 'progressReport',
    icon: 'trending-up-outline',
    title: 'รายงานพัฒนาการพร้อมคำแนะนำ',
    description: 'เทียบระยะ pace ความสม่ำเสมอ และฟอร์มการวิ่ง 4 สัปดาห์ล่าสุดกับช่วงก่อนหน้า',
    href: '/progress-report',
  },
  {
    id: 'adFree',
    icon: 'eye-off-outline',
    title: 'ใช้งานแบบไม่มีโฆษณา',
    description: 'ซ่อนการ์ดโฆษณาพาร์ทเนอร์ในหน้าแรกและหน้าชุมชน',
    href: null,
  },
];

export function plusFeature(id: PlusFeatureId): PlusFeature {
  return PLUS_FEATURES.find((feature) => feature.id === id) ?? PLUS_FEATURES[0];
}

/** สิ่งที่แพ็กเกจฟรีได้ ตรงกับตารางใน docs/business-model.md */
export const FREE_FEATURES = [
  'ข้อมูลอากาศ PM2.5 และการเตือนความเสี่ยงก่อนวิ่ง',
  'บันทึกการวิ่งและดูประวัติของตัวเอง',
  'ค้นหาที่วิ่ง ชุมชน และชุดวอร์มอัพพื้นฐาน',
  'มีการ์ดโฆษณาพาร์ทเนอร์ ติดป้าย "โฆษณา" ชัดเจน',
];

/** หัวข้อของหน้ายืนยันตามชนิดของการเปลี่ยนแพ็กเกจ */
export function confirmTitle(change: PlanChange, to: PlanId): string {
  switch (change) {
    case 'subscribe':
      return `ยืนยันสมัคร ${PLAN_SHORT_NAME[to]}`;
    case 'switch':
      return `ยืนยันเปลี่ยนเป็น ${PLAN_SHORT_NAME[to]}`;
    case 'cancel':
      return 'ยกเลิกพร้อมวิ่ง Plus?';
    case 'none':
      return PLAN_NAME[to];
  }
}

/** ข้อความหลังเปลี่ยนแพ็กเกจสำเร็จ */
export function changedNotice(change: PlanChange, to: PlanId): string {
  switch (change) {
    case 'subscribe':
      return `สมัคร ${PLAN_SHORT_NAME[to]} แล้ว ฟีเจอร์ Plus ทั้งหมดปลดล็อกทันที`;
    case 'switch':
      return `เปลี่ยนเป็น ${PLAN_SHORT_NAME[to]} แล้ว รอบบิลใหม่เริ่มนับวันนี้`;
    case 'cancel':
      return 'กลับมาใช้พร้อมวิ่ง Free แล้ว แผนซ้อมที่ตั้งไว้ยังอยู่ในบัญชี สมัครใหม่เมื่อไรก็ซ้อมต่อได้';
    case 'none':
      return '';
  }
}
