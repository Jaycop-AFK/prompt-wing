import { useEffect } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useSubscription } from '@/hooks/use-subscription';
import { useTrainingPlan } from '@/hooks/use-training-plan';
import {
  cancelPlanReminders,
  planRemindersSupported,
  schedulePlanReminders,
} from '@/services/plan-reminders';
import { loadPlanReminderPreference } from '@/storage/plan-reminder-preference';

/**
 * ทำให้การเตือนซ้อมในเครื่องตรงกับสถานะจริงของบัญชีเสมอ ไม่แสดงอะไรบนจอ วางไว้ที่รากของแอป
 *
 * เตือนต่อเมื่อครบทุกข้อ คือล็อกอินอยู่ ยังเป็น Plus มีแผนซ้อม และผู้ใช้เปิดการเตือนไว้บนเครื่องนี้
 * ขาดข้อไหนยกเลิกการเตือนทั้งหมด ผู้ใช้ที่ยกเลิก Plus หรือออกจากระบบจึงไม่ได้รับการเตือนค้างอยู่
 * ย้ายวันหรือเวลาซ้อมแล้วตั้งเวลาใหม่ให้ตามแผนล่าสุด โดยไม่ขอสิทธิ์แจ้งเตือนเองตอนเปิดแอป
 */
export function PlanReminderSync() {
  const { userId } = useAuth();
  const { isPlus } = useSubscription();
  const { settings } = useTrainingPlan();

  // ใช้ค่าพื้นฐานเป็น dependency แทนอ็อบเจกต์แผน เพราะอ็อบเจกต์ถูกสร้างใหม่ทุกครั้งที่ข้อมูลบัญชีเปลี่ยน
  // เช่นตอนเปลี่ยนแพ็กเกจ ซึ่งไม่ควรทำให้ตั้งการเตือนชุดเดิมใหม่
  const goal = settings?.goal ?? null;
  const runDaysKey = settings?.runDays.join(',') ?? '';
  const minuteOfDay = settings?.preferredMinuteOfDay ?? null;

  useEffect(() => {
    if (!planRemindersSupported) return;
    let cancelled = false;

    const sync = async () => {
      const enabled = userId !== null && (await loadPlanReminderPreference(userId));
      if (cancelled) return;

      if (enabled && isPlus && goal !== null && minuteOfDay !== null) {
        await schedulePlanReminders(
          { goal, runDays: runDaysKey.split(',').map(Number), minuteOfDay },
          { askPermission: false }
        );
      } else {
        await cancelPlanReminders();
      }
    };

    sync().catch(() => {
      // ตั้งการเตือนไม่สำเร็จไม่ควรทำให้แอปพัง ผู้ใช้ปิดเปิดสวิตช์ในหน้าแผนซ้อมเพื่อลองใหม่ได้
    });

    return () => {
      cancelled = true;
    };
  }, [userId, isPlus, goal, runDaysKey, minuteOfDay]);

  return null;
}
