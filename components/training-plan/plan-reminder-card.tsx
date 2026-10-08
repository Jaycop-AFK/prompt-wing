import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { THAI_WEEKDAY_SHORT } from '@/components/format';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/text';
import type { TrainingPlanSettings } from '@/core/coach';
import { useTheme } from '@/hooks/use-theme';
import {
  cancelPlanReminders,
  planRemindersSupported,
  REMINDER_LEAD_MINUTES,
  schedulePlanReminders,
} from '@/services/plan-reminders';
import { formatMinuteOfDay } from '@/services/training-plan-settings';
import { loadPlanReminderPreference, savePlanReminderPreference } from '@/storage/plan-reminder-preference';

/**
 * สวิตช์เตือนก่อนเวลาซ้อม เปิดแล้วตั้งการแจ้งเตือนรายสัปดาห์ของทุกวันซ้อมในเครื่องนี้ทันที
 *
 * การตั้งเวลาใหม่เมื่อแผนเปลี่ยนหรือแพ็กเกจเปลี่ยน เป็นหน้าที่ของ PlanReminderSync ที่รากของแอป
 * การ์ดนี้จัดการแค่ตอนผู้ใช้กดเปิดหรือปิดเอง ซึ่งเป็นจังหวะเดียวที่ควรขอสิทธิ์แจ้งเตือน
 */
export function PlanReminderCard({ userId, settings }: { userId: string; settings: TrainingPlanSettings }) {
  const { colors } = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPlanReminderPreference(userId)
      .then((stored) => {
        if (!cancelled) setEnabled(stored);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const days = settings.runDays.map((day) => THAI_WEEKDAY_SHORT[day]).join(' ');
  const reminderAt = formatMinuteOfDay(settings.preferredMinuteOfDay - REMINDER_LEAD_MINUTES);

  const toggle = async (next: boolean) => {
    setBusy(true);
    setMessage(null);
    try {
      if (next) {
        const result = await schedulePlanReminders(
          { goal: settings.goal, runDays: settings.runDays, minuteOfDay: settings.preferredMinuteOfDay },
          { askPermission: true }
        );
        if (result === 'scheduled') {
          await savePlanReminderPreference(userId, true);
          setEnabled(true);
        } else if (result === 'denied') {
          setMessage('ยังไม่ได้รับสิทธิ์แจ้งเตือน เปิดสิทธิ์ให้พร้อมวิ่งได้ที่การตั้งค่าของเครื่อง');
        }
      } else {
        await savePlanReminderPreference(userId, false);
        await cancelPlanReminders();
        setEnabled(false);
      }
    } catch {
      setMessage('ตั้งการเตือนไม่สำเร็จ ลองอีกครั้ง');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.copy}>
          <AppText variant="heading" weight="bold">
            เตือนก่อนเวลาซ้อม
          </AppText>
          <AppText variant="small" tone="muted">
            {planRemindersSupported
              ? `แจ้งเตือน ${reminderAt} ทุกวัน ${days} ก่อนเวลาซ้อม ${formatMinuteOfDay(settings.preferredMinuteOfDay)} อยู่ ${REMINDER_LEAD_MINUTES} นาที`
              : 'การเตือนใช้ได้บนแอปในมือถือเท่านั้น เว็บตั้งเวลาแจ้งเตือนในเครื่องไม่ได้'}
          </AppText>
        </View>
        <Switch
          value={enabled}
          onValueChange={toggle}
          disabled={busy || !planRemindersSupported}
          trackColor={{ false: colors.border, true: colors.brand }}
          thumbColor={colors.surface}
          accessibilityLabel="เตือนก่อนเวลาซ้อม"
        />
      </View>
      {message ? (
        <AppText variant="small" weight="semibold" color={colors.clearYellow} accessibilityLiveRegion="polite">
          {message}
        </AppText>
      ) : null}
      <AppText variant="caption" tone="faint">
        เป็นการแจ้งเตือนในเครื่องนี้ ย้ายวันหรือเวลาซ้อมแล้วการเตือนจะเลื่อนตามให้เอง
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1, gap: 2 },
});
