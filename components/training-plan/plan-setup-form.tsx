import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { THAI_WEEKDAY_NAME, THAI_WEEKDAY_SHORT } from '@/components/format';
import { GOAL_FIT, GOAL_LABEL, GOAL_ORDER, PREFERRED_TIME_PRESETS } from '@/components/training-plan/copy';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import {
  isValidRunDays,
  PLAN_MAX_RUN_DAYS,
  PLAN_MIN_RUN_DAYS,
  totalLevelsOf,
  type PlanGoal,
  type TrainingPlanSettings,
} from '@/core/coach';
import { useTheme } from '@/hooks/use-theme';
import { formatMinuteOfDay } from '@/services/training-plan-settings';

/** จันทร์มาก่อน เพราะคนส่วนใหญ่คิดถึงสัปดาห์ทำงานก่อนวันหยุด */
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface PlanSetupFormProps {
  /** แผนเดิมเมื่อแก้ไข null เมื่อตั้งแผนครั้งแรก */
  initial: TrainingPlanSettings | null;
  saving: boolean;
  error: string | null;
  onSubmit: (settings: TrainingPlanSettings) => void;
  onCancel?: () => void;
}

/**
 * ฟอร์มตั้งหรือแก้แผนซ้อม
 *
 * เปลี่ยนเป้าหมายระยะคือเริ่มแผนใหม่ที่ระดับ 1 เพราะระดับของแผน 5K กับ 10K เทียบกันไม่ได้ ส่วนเปลี่ยนวัน
 * หรือเวลาซ้อมเก็บวันเริ่มแผนเดิมไว้ ระดับที่ไต่มาแล้วจะไม่หายเพียงเพราะย้ายวันซ้อม
 */
export function PlanSetupForm({ initial, saving, error, onSubmit, onCancel }: PlanSetupFormProps) {
  const { colors } = useTheme();
  const [goal, setGoal] = useState<PlanGoal>(initial?.goal ?? '5k');
  const [runDays, setRunDays] = useState<number[]>(initial?.runDays ?? [1, 3, 5]);
  const [minuteOfDay, setMinuteOfDay] = useState(initial?.preferredMinuteOfDay ?? 6 * 60);

  const daysValid = isValidRunDays(runDays);
  const restarts = initial !== null && initial.goal !== goal;
  const timeOptions = PREFERRED_TIME_PRESETS.includes(minuteOfDay)
    ? PREFERRED_TIME_PRESETS
    : [...PREFERRED_TIME_PRESETS, minuteOfDay].sort((a, b) => a - b);

  const toggleDay = (day: number) => {
    setRunDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : current.length >= PLAN_MAX_RUN_DAYS
          ? current
          : [...current, day].sort((a, b) => a - b)
    );
  };

  const submit = () => {
    if (!daysValid) return;
    onSubmit({
      goal,
      runDays,
      preferredMinuteOfDay: minuteOfDay,
      startedAt: initial === null || restarts ? Date.now() : initial.startedAt,
    });
  };

  return (
    <Card>
      <AppText variant="heading" weight="bold">
        {initial === null ? 'ตั้งแผนซ้อมของคุณ' : 'แก้ไขแผนซ้อม'}
      </AppText>

      <AppText variant="small" weight="semibold">
        เป้าหมายระยะ
      </AppText>
      <View style={styles.goalRow}>
        {GOAL_ORDER.map((option) => {
          const active = option === goal;
          return (
            <Pressable
              key={option}
              onPress={() => setGoal(option)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              style={[
                styles.goal,
                {
                  backgroundColor: active ? colors.brandSoft : colors.surfaceAlt,
                  borderColor: active ? colors.brand : colors.border,
                },
              ]}>
              <AppText variant="title" weight="bold" color={active ? colors.brandStrong : colors.text}>
                {GOAL_LABEL[option]}
              </AppText>
              <AppText variant="caption" tone="muted">
                {GOAL_FIT[option]} · {totalLevelsOf(option)} ระดับ
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.labelRow}>
        <AppText variant="small" weight="semibold">
          วันที่สะดวกซ้อม
        </AppText>
        <AppText variant="caption" tone={daysValid ? 'muted' : 'default'} color={daysValid ? undefined : colors.clearYellow}>
          เลือก {PLAN_MIN_RUN_DAYS}–{PLAN_MAX_RUN_DAYS} วัน · เลือกแล้ว {runDays.length} วัน
        </AppText>
      </View>
      <View style={styles.dayRow}>
        {WEEKDAY_ORDER.map((day) => {
          const active = runDays.includes(day);
          const full = !active && runDays.length >= PLAN_MAX_RUN_DAYS;
          return (
            <Pressable
              key={day}
              onPress={() => toggleDay(day)}
              disabled={full}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active, disabled: full }}
              accessibilityLabel={`วัน${THAI_WEEKDAY_NAME[day]}`}
              style={[
                styles.day,
                {
                  backgroundColor: active ? colors.brand : colors.surfaceAlt,
                  borderColor: active ? colors.brand : colors.border,
                  opacity: full ? 0.45 : 1,
                },
              ]}>
              <AppText variant="small" weight="semibold" color={active ? colors.onBrand : colors.text}>
                {THAI_WEEKDAY_SHORT[day]}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <AppText variant="caption" tone="faint">
        เว้นอย่างน้อยหนึ่งวันระหว่างวันซ้อมถ้าทำได้ ร่างกายจะได้พักฟื้น
      </AppText>

      <AppText variant="small" weight="semibold">
        เวลาที่ตั้งใจออกไปซ้อม
      </AppText>
      <View style={styles.timeRow}>
        {timeOptions.map((option) => {
          const active = option === minuteOfDay;
          return (
            <Pressable
              key={option}
              onPress={() => setMinuteOfDay(option)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              style={[
                styles.time,
                {
                  backgroundColor: active ? colors.brandSoft : colors.surfaceAlt,
                  borderColor: active ? colors.brand : colors.border,
                },
              ]}>
              <AppText variant="small" weight="semibold" color={active ? colors.brandStrong : colors.text}>
                {formatMinuteOfDay(option)}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {restarts ? (
        <AppText variant="small" color={colors.clearYellow} weight="semibold">
          เปลี่ยนเป้าหมายระยะจะเริ่มแผน {GOAL_LABEL[goal]} ใหม่ที่ระดับ 1
        </AppText>
      ) : null}
      {error ? (
        <AppText variant="small" weight="semibold" color={colors.clearRed} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}

      <Button
        label={saving ? 'กำลังบันทึก…' : initial === null ? 'เริ่มแผนซ้อม' : 'บันทึกการตั้งค่า'}
        onPress={submit}
        disabled={saving || !daysValid}
      />
      {onCancel ? <Button label="ยกเลิก" onPress={onCancel} variant="secondary" disabled={saving} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  goalRow: { flexDirection: 'row', gap: spacing.sm },
  goal: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1.5,
    padding: spacing.md,
    gap: 2,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  dayRow: { flexDirection: 'row', gap: spacing.xs },
  day: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  time: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
