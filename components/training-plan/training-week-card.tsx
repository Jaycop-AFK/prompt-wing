import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { formatThaiDay } from '@/components/format';
import {
  ADJUSTMENT_RULE,
  GOAL_LABEL,
  reviewSentence,
  WORKOUT_HINT,
  workoutTitle,
} from '@/components/training-plan/copy';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import {
  nextWorkout,
  WORKOUT_DONE_THRESHOLD,
  type PlanGoal,
  type TrainingWeek,
} from '@/core/coach';
import { useTheme } from '@/hooks/use-theme';
import { startOfDay } from '@/services/run-history';

interface TrainingWeekCardProps {
  goal: PlanGoal;
  week: TrainingWeek;
  now: number;
  onStartWorkout: () => void;
}

/** สัปดาห์ปัจจุบันของแผนซ้อม ระดับที่ได้พร้อมเหตุผล และการซ้อมแต่ละครั้งว่าทำไปแล้วแค่ไหน */
export function TrainingWeekCard({ goal, week, now, onStartWorkout }: TrainingWeekCardProps) {
  const { colors } = useTheme();
  const next = nextWorkout(week);
  const today = startOfDay(now);
  const lastDay = startOfDay(week.endsAt - 1);

  return (
    <>
      <Card background={colors.brandSoft}>
        <View style={styles.headerRow}>
          <AppText variant="small" weight="semibold" color={colors.brandStrong}>
            แผน {GOAL_LABEL[goal]} · สัปดาห์ที่ {week.weekNumber}
          </AppText>
          <AppText variant="small" weight="bold" color={colors.brandStrong}>
            ระดับ {week.level}/{week.totalLevels}
          </AppText>
        </View>
        <View style={[styles.track, { backgroundColor: colors.surface }]}>
          <View
            style={[
              styles.fill,
              { backgroundColor: colors.brand, width: `${(week.level / week.totalLevels) * 100}%` },
            ]}
          />
        </View>
        <AppText variant="body" weight="semibold">
          {reviewSentence(week.review, week.level, week.totalLevels)}
        </AppText>
        {week.finished ? (
          <AppText variant="small" color={colors.brandStrong} weight="semibold">
            คุณซ้อมผ่านระดับสุดท้ายของแผน {GOAL_LABEL[goal]} แล้ว
            {goal === '5k' ? ' ถ้าพร้อมขยับต่อ ลองเปลี่ยนเป้าหมายเป็น 10K ในการตั้งค่าแผน' : ' ซ้อมระดับนี้ต่อเพื่อรักษาความฟิตได้เลย'}
          </AppText>
        ) : null}
        <AppText variant="caption" tone="muted">
          {ADJUSTMENT_RULE}
        </AppText>
      </Card>

      <Card>
        <View style={styles.headerRow}>
          <AppText variant="heading" weight="bold">
            สัปดาห์นี้
          </AppText>
          <AppText variant="caption" tone="muted">
            {formatThaiDay(week.startsAt)} – {formatThaiDay(lastDay)}
          </AppText>
        </View>

        {week.workouts.map((workout, index) => {
          const done = workout.completion >= WORKOUT_DONE_THRESHOLD;
          const partial = !done && workout.completion > 0;
          const isNext = workout === next;
          const missed = !done && startOfDay(workout.scheduledOn) < today;
          const status = done
            ? 'ทำแล้ว'
            : partial
              ? `ทำได้ ${Math.round(workout.completion * 100)}%`
              : isNext
                ? startOfDay(workout.scheduledOn) === today
                  ? 'วันนี้'
                  : 'ครั้งถัดไป'
                : missed
                  ? 'ยังไม่ได้ซ้อม'
                  : '';

          return (
            <View
              key={`${workout.scheduledOn}-${index}`}
              style={[
                styles.workout,
                {
                  borderColor: isNext ? colors.brand : colors.border,
                  backgroundColor: isNext ? colors.brandSoft : colors.surfaceAlt,
                },
              ]}
              accessible
              accessibilityLabel={`${formatThaiDay(workout.scheduledOn)} ${workoutTitle(workout)} ${status}`}>
              <Ionicons
                name={done ? 'checkmark-circle' : partial ? 'contrast-outline' : 'ellipse-outline'}
                size={24}
                color={done ? colors.clearGreen : partial ? colors.clearYellow : colors.textFaint}
              />
              <View style={styles.workoutCopy}>
                <AppText variant="caption" tone="muted">
                  {formatThaiDay(workout.scheduledOn)}
                </AppText>
                <AppText variant="body" weight="semibold">
                  {workoutTitle(workout)}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {WORKOUT_HINT[workout.kind]}
                </AppText>
              </View>
              {status ? (
                <AppText
                  variant="caption"
                  weight="semibold"
                  color={done ? colors.clearGreen : isNext ? colors.brandStrong : colors.textMuted}>
                  {status}
                </AppText>
              ) : null}
            </View>
          );
        })}

        <View style={styles.headerRow}>
          <AppText variant="small" tone="muted">
            ซ้อมแล้วสัปดาห์นี้
          </AppText>
          <AppText variant="small" weight="bold">
            {Math.round(week.completion * 100)}%
          </AppText>
        </View>
        <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
          <View
            style={[
              styles.fill,
              { backgroundColor: colors.clearGreen, width: `${Math.min(100, week.completion * 100)}%` },
            ]}
          />
        </View>

        {next ? (
          <Button label={`ไปหน้าวิ่ง · ${workoutTitle(next)}`} onPress={onStartWorkout} />
        ) : (
          <AppText variant="small" weight="semibold" color={colors.clearGreen}>
            ซ้อมครบทุกครั้งของสัปดาห์นี้แล้ว พักให้เต็มที่ก่อนเริ่มสัปดาห์ถัดไป
          </AppText>
        )}
        <AppText variant="caption" tone="faint">
          ทุกการวิ่งที่บันทึกในสัปดาห์นี้ถูกนับรวม ไม่ต้องวิ่งตรงวันที่วางไว้ แผนเป็นแนวทางการซ้อมทั่วไป
          ถ้ารู้สึกเจ็บให้หยุดพักก่อน
        </AppText>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  workout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  workoutCopy: { flex: 1, gap: 1 },
});
