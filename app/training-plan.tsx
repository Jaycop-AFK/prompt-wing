import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { THAI_WEEKDAY_SHORT } from '@/components/format';
import { PlusLockedCard } from '@/components/plus/plus-locked-card';
import { GOAL_LABEL, workoutTitle } from '@/components/training-plan/copy';
import { ForecastScheduleCard } from '@/components/training-plan/forecast-schedule-card';
import { PlanReminderCard } from '@/components/training-plan/plan-reminder-card';
import { PlanSetupForm } from '@/components/training-plan/plan-setup-form';
import { TrainingWeekCard } from '@/components/training-plan/training-week-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { buildTrainingWeek, type TrainingPlanSettings } from '@/core/coach';
import { useAuth } from '@/hooks/use-auth';
import { useSubscription } from '@/hooks/use-subscription';
import { useTheme } from '@/hooks/use-theme';
import { useTrainingPlan } from '@/hooks/use-training-plan';
import { useWeekForecast } from '@/hooks/use-week-forecast';
import type { SessionRecord } from '@/services/session-record';
import { formatMinuteOfDay } from '@/services/training-plan-settings';
import { listSessions } from '@/storage/session-storage';

/** ตัวอย่างสัปดาห์แรกของแผน 5K ให้ผู้ใช้ฟรีเห็นว่าแผนหน้าตาเป็นอย่างไร ตรงกับระดับ 1 ใน core/coach */
const PREVIEW_WEEK = [
  { day: 1, kind: 'easy', target: { kind: 'time', minutes: 20 } },
  { day: 3, kind: 'steady', target: { kind: 'time', minutes: 15 } },
  { day: 5, kind: 'long', target: { kind: 'distance', km: 3 } },
] as const;

export default function TrainingPlanScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { userId } = useAuth();
  const { isPlus } = useSubscription();
  const { settings, saveSettings } = useTrainingPlan();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);
  const [sessions, setSessions] = useState<SessionRecord[] | null>(null);
  const [historyFailed, setHistoryFailed] = useState(false);

  const planActive = isPlus && settings !== null;
  const forecast = useWeekForecast(planActive && !editing);

  // โหลดประวัติใหม่ทุกครั้งที่กลับเข้าจอ ผู้ใช้เพิ่งวิ่งจบจากปุ่มในจอนี้แล้วย้อนกลับมาต้องเห็นว่าซ้อมแล้ว
  useFocusEffect(
    useCallback(() => {
      if (!isPlus) return;
      let cancelled = false;
      listSessions()
        .then((found) => {
          if (cancelled) return;
          setSessions(found);
          setHistoryFailed(false);
        })
        .catch(() => {
          if (!cancelled) setHistoryFailed(true);
        });
      return () => {
        cancelled = true;
      };
    }, [isPlus])
  );

  const save = async (next: TrainingPlanSettings | null) => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveSettings(next);
      setEditing(false);
      setConfirmStop(false);
    } catch {
      setSaveError('บันทึกแผนซ้อมไม่สำเร็จ ตรวจการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง');
    } finally {
      setSaving(false);
    }
  };

  if (!isPlus) {
    return (
      <Screen title="แผนซ้อม" back>
        <PlusLockedCard feature="trainingPlan">
          <View style={[styles.preview, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <AppText variant="caption" weight="semibold" tone="muted">
              ตัวอย่างสัปดาห์แรกของแผน 5K
            </AppText>
            {PREVIEW_WEEK.map((item) => (
              <AppText key={item.day} variant="small">
                {THAI_WEEKDAY_SHORT[item.day]}. {workoutTitle(item)}
              </AppText>
            ))}
          </View>
        </PlusLockedCard>
        <PlusLockedCard feature="forecastSchedule" />
      </Screen>
    );
  }

  if (settings === null || editing) {
    return (
      <Screen title="แผนซ้อม" back>
        {settings === null ? (
          <AppText tone="muted">
            เลือกระยะที่อยากทำให้ได้ วันที่สะดวก และเวลาที่ตั้งใจออกไปวิ่ง ระบบจะจัดการซ้อมรายสัปดาห์
            และปรับระดับสัปดาห์ถัดไปจากการวิ่งจริงของคุณ
          </AppText>
        ) : null}
        <PlanSetupForm
          initial={settings}
          saving={saving}
          error={saveError}
          onSubmit={save}
          onCancel={settings === null ? undefined : () => setEditing(false)}
        />
        {settings !== null ? (
          <Card>
            <AppText variant="small" tone="muted">
              หยุดใช้แผนซ้อมจะลบการตั้งค่าแผนออกจากบัญชี ประวัติการวิ่งยังอยู่ครบ
            </AppText>
            <Pressable
              onPress={() => (confirmStop ? save(null) : setConfirmStop(true))}
              disabled={saving}
              accessibilityRole="button"
              style={({ pressed }) => [styles.stopRow, pressed && styles.pressed]}>
              <AppText variant="body" weight="semibold" color={colors.clearRed}>
                {confirmStop ? 'แตะอีกครั้งเพื่อยืนยันหยุดใช้แผน' : 'หยุดใช้แผนซ้อม'}
              </AppText>
            </Pressable>
          </Card>
        ) : null}
      </Screen>
    );
  }

  if (historyFailed) {
    return (
      <Screen title="แผนซ้อม" back>
        <Card>
          <AppText variant="heading" weight="semibold">
            เปิดแผนซ้อมไม่สำเร็จ
          </AppText>
          <AppText tone="muted">
            อ่านประวัติการวิ่งไม่ได้ เลยยังบอกไม่ได้ว่าสัปดาห์นี้ซ้อมไปแค่ไหน แผนที่ตั้งไว้ยังอยู่ครบ
          </AppText>
          <Button
            label="ลองอีกครั้ง"
            onPress={() => {
              setHistoryFailed(false);
              listSessions()
                .then(setSessions)
                .catch(() => setHistoryFailed(true));
            }}
          />
        </Card>
      </Screen>
    );
  }

  if (sessions === null || userId === null) {
    return (
      <Screen title="แผนซ้อม" back scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </Screen>
    );
  }

  const now = Date.now();
  const week = buildTrainingWeek({
    settings,
    runs: sessions.map((session) => ({
      at: session.finishedAt,
      distanceKm: session.distanceKm,
      movingSeconds: session.movingSeconds,
    })),
    now,
  });

  return (
    <Screen title="แผนซ้อม" back>
      <TrainingWeekCard
        goal={settings.goal}
        week={week}
        now={now}
        onStartWorkout={() =>
          // dismissTo ย้อนกลับไปแท็บเดิมที่อยู่ใต้จอนี้ ถ้าใช้ navigate จะซ้อนชุดแท็บใหม่ทับขึ้นมาอีกชั้น
          // ค่า plan เป็นเวลาที่กด ทำให้หน้าวิ่งเลือกแผนซ้อมให้ใหม่ทุกครั้ง แม้จะเคยเลือกอย่างอื่นไว้แล้ว
          router.dismissTo({ pathname: '/(tabs)/run', params: { plan: String(Date.now()) } })
        }
      />

      <ForecastScheduleCard
        settings={settings}
        week={week}
        now={now}
        status={forecast.status}
        days={forecast.days}
        location={forecast.location}
        onRetry={forecast.reload}
      />

      <PlanReminderCard userId={userId} settings={settings} />

      <Card>
        <View style={styles.settingsRow}>
          <View style={styles.settingsCopy}>
            <AppText variant="heading" weight="semibold">
              การตั้งค่าแผน
            </AppText>
            <AppText variant="small" tone="muted">
              แผน {GOAL_LABEL[settings.goal]} · ซ้อมวัน{' '}
              {settings.runDays.map((day) => THAI_WEEKDAY_SHORT[day]).join(' ')} · เวลา{' '}
              {formatMinuteOfDay(settings.preferredMinuteOfDay)}
            </AppText>
          </View>
        </View>
        <Button label="แก้ไขแผนซ้อม" onPress={() => setEditing(true)} variant="secondary" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stopRow: { alignItems: 'center', paddingVertical: spacing.sm },
  settingsRow: { flexDirection: 'row', alignItems: 'center' },
  settingsCopy: { flex: 1, gap: 2 },
  pressed: { opacity: 0.7 },
});
