import { useCallback, useMemo } from 'react';

import type { TrainingPlanSettings } from '@/core/coach';
import { useAuth } from '@/hooks/use-auth';
import {
  TRAINING_PLAN_METADATA_KEY,
  trainingPlanFromMetadata,
  trainingPlanToMetadata,
} from '@/services/training-plan-settings';
import { updateAccountMetadata } from '@/storage/account-metadata';

/**
 * การตั้งค่าแผนซ้อมของบัญชีที่ล็อกอินอยู่ อ่านจาก user_metadata เหมือนแพ็กเกจสมาชิก (ดู use-subscription.ts)
 *
 * แผนที่ตั้งไว้ยังอยู่ในบัญชีแม้ยกเลิก Plus ไปแล้ว กลับมาสมัครใหม่ก็ซ้อมต่อจากเดิมได้ การปิดกั้นการใช้งาน
 * เป็นหน้าที่ของจอที่เช็ค isPlus ไม่ใช่การลบแผนทิ้ง
 */
export function useTrainingPlan() {
  const { accountMetadata } = useAuth();
  const settings = useMemo(() => trainingPlanFromMetadata(accountMetadata), [accountMetadata]);

  /** บันทึกแผนใหม่ทับของเดิม ส่ง null เพื่อเลิกใช้แผน */
  const saveSettings = useCallback(async (next: TrainingPlanSettings | null) => {
    await updateAccountMetadata({
      [TRAINING_PLAN_METADATA_KEY]: next === null ? null : trainingPlanToMetadata(next),
    });
  }, []);

  return { settings, saveSettings };
}
