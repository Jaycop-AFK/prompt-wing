import { useCallback, useMemo } from 'react';

import { useAuth } from '@/hooks/use-auth';
import {
  changePlan,
  hasPlus,
  planChangeOf,
  SUBSCRIPTION_METADATA_KEY,
  subscriptionFromMetadata,
  subscriptionToMetadata,
  type PlanChange,
  type PlanId,
} from '@/services/subscription';
import { updateAccountMetadata } from '@/storage/account-metadata';

/**
 * แพ็กเกจสมาชิกของบัญชีที่ล็อกอินอยู่ จุดเดียวที่จอใช้ตัดสินว่าจะปลดล็อกฟีเจอร์ Plus หรือไม่
 *
 * ไม่มี state ของตัวเอง อ่านจาก user_metadata ที่ AuthProvider ถืออยู่ทุกครั้ง ทุกจอที่เรียกจึงเห็นแพ็กเกจ
 * เดียวกันเสมอ และเปลี่ยนตามทันทีหลังสมัครหรือยกเลิก โดยไม่ต้องมี Provider แยกอีกชั้น
 */
export function useSubscription() {
  const { accountMetadata } = useAuth();
  const subscription = useMemo(() => subscriptionFromMetadata(accountMetadata), [accountMetadata]);

  /** เปลี่ยนแพ็กเกจในบัญชี (จำลอง ไม่มีการตัดเงิน) คืนชนิดของการเปลี่ยนที่เกิดขึ้นจริง */
  const switchPlan = useCallback(
    async (to: PlanId): Promise<PlanChange> => {
      const change = planChangeOf(subscription.plan, to);
      if (change === 'none') return change;

      const next = changePlan(subscription, to, Date.now());
      await updateAccountMetadata({ [SUBSCRIPTION_METADATA_KEY]: subscriptionToMetadata(next) });
      return change;
    },
    [subscription]
  );

  return { subscription, isPlus: hasPlus(subscription), switchPlan };
}
