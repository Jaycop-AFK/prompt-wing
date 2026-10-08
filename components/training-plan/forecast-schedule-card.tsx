import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { levelColors } from '@/components/clearance/colors';
import { formatTime, reasonSentence } from '@/components/clearance/copy';
import { formatThaiDay } from '@/components/format';
import { workoutTitle } from '@/components/training-plan/copy';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import {
  evaluateDayOutlook,
  hourAt,
  WORKOUT_DONE_THRESHOLD,
  type ClearanceLevel,
  type DayOutlook,
  type HourClearance,
  type TrainingPlanSettings,
  type TrainingWeek,
} from '@/core/coach';
import { useTheme } from '@/hooks/use-theme';
import { FALLBACK_LOCATION_LABEL, type LocationResult } from '@/services/location';
import type { ForecastDay } from '@/services/open-meteo';
import { startOfDay } from '@/services/run-history';
import { formatMinuteOfDay } from '@/services/training-plan-settings';

const DAY_LEVEL_LABEL: Record<ClearanceLevel, string> = {
  green: 'มีช่วงวิ่งได้เต็มที่',
  yellow: 'วิ่งได้ แต่ควรลดความหนัก',
  red: 'ไม่เหมาะวิ่งกลางแจ้ง',
};

interface ForecastScheduleCardProps {
  settings: TrainingPlanSettings;
  week: TrainingWeek;
  now: number;
  status: 'loading' | 'ready' | 'error';
  days: ForecastDay[];
  location: LocationResult | null;
  onRetry: () => void;
}

/** เวลาที่ห่างจากเที่ยงคืนของวันนั้นไป minuteOfDay นาที สร้างด้วยตัวสร้าง Date เพื่อไม่เพี้ยนในวันที่ปรับเวลาตามฤดูกาล */
function minuteOn(day: number, minuteOfDay: number): number {
  const d = new Date(day);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, minuteOfDay).getTime();
}

const MINUTES_PER_DAY = 24 * 60;

/**
 * เหตุผลที่เวลาที่ตั้งไว้ไม่เหมาะ ป้าย "ฟ้ามืดแล้ว" ของใบอนุญาตวิ่งเขียนไว้สำหรับช่วงหลังพระอาทิตย์ตก
 * ตารางซ้อมมีเวลาเช้ามืดด้วย ถ้าใช้ป้ายเดิมจะอ่านเป็นว่าตีห้าครึ่งฟ้ามืดแล้ว ซึ่งผิดความหมาย
 */
function preferredTimeReason(hour: HourClearance, at: number, sunrise: number): string {
  return hour.factors
    .map((factor) => (factor === 'dark' && at < sunrise ? 'ฟ้ายังไม่สว่าง' : reasonSentence([factor])))
    .join(' และ ');
}

function windowText(outlook: DayOutlook): string {
  if (outlook.clearWindow !== null) {
    return `ช่วงเหมาะวิ่ง ${formatTime(outlook.clearWindow.start)}–${formatTime(outlook.clearWindow.end)}`;
  }
  if (outlook.bestLevel === null) return 'ผ่านช่วงกลางวันไปแล้ว';
  const reason = reasonSentence(outlook.factors);
  return reason ? `ไม่มีช่วงสีเขียว เพราะ${reason}` : 'ไม่มีช่วงสีเขียว';
}

/**
 * ตารางซ้อม 7 วันข้างหน้าคู่กับพยากรณ์อากาศ (ฟีเจอร์ของ Plus)
 *
 * วันซ้อมของสัปดาห์นี้บอกการซ้อมที่วางไว้ วันซ้อมที่เลยสัปดาห์นี้ไปยังบอกไม่ได้ เพราะระดับของสัปดาห์หน้า
 * ขึ้นกับผลการซ้อมที่ยังไม่เกิด จึงบอกแค่ว่าเป็นวันซ้อม ไม่เดาการซ้อมล่วงหน้าให้ผิดจากที่จะได้จริง
 */
export function ForecastScheduleCard({
  settings,
  week,
  now,
  status,
  days,
  location,
  onRetry,
}: ForecastScheduleCardProps) {
  const { colors } = useTheme();

  return (
    <Card>
      <AppText variant="heading" weight="bold">
        ตารางซ้อม 7 วันกับพยากรณ์
      </AppText>

      {status === 'loading' ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand} />
          <AppText variant="small" tone="muted">
            กำลังดูพยากรณ์อากาศและฝุ่นรอบตัวคุณ
          </AppText>
        </View>
      ) : null}

      {status === 'error' ? (
        <>
          <AppText variant="small" tone="muted">
            ดึงพยากรณ์ไม่สำเร็จ ตารางซ้อมยังใช้ได้ตามปกติ
          </AppText>
          <Button label="ลองอีกครั้ง" onPress={onRetry} variant="secondary" />
        </>
      ) : null}

      {status === 'ready'
        ? days.map((day) => {
            const date = startOfDay(day.date);
            const isRunDay = settings.runDays.includes(new Date(date).getDay());
            const workout = week.workouts.find((item) => startOfDay(item.scheduledOn) === date) ?? null;
            const outlook = evaluateDayOutlook({ hours: day.hours, sunrise: day.sunrise, sunset: day.sunset, now });
            const tone = outlook.bestLevel === null ? null : levelColors(colors, outlook.bestLevel);

            const preferredAt = minuteOn(date, settings.preferredMinuteOfDay);
            const preferredHour = isRunDay && preferredAt > now ? hourAt(outlook.hours, preferredAt) : undefined;
            const dayLabel =
              date === startOfDay(now)
                ? 'วันนี้'
                : date === minuteOn(now, MINUTES_PER_DAY)
                  ? 'พรุ่งนี้'
                  : formatThaiDay(date);

            const planText = workout
              ? `${workoutTitle(workout)}${workout.completion >= WORKOUT_DONE_THRESHOLD ? ' · ทำแล้ว' : ''}`
              : isRunDay
                ? 'วันซ้อม · รายละเอียดจะปรับหลังจบสัปดาห์นี้'
                : 'วันพัก';

            return (
              <View
                key={day.date}
                style={[
                  styles.day,
                  {
                    borderColor: colors.border,
                    backgroundColor: isRunDay ? colors.surfaceAlt : colors.surface,
                  },
                ]}>
                <View style={styles.dayHeader}>
                  <AppText variant="small" weight="bold">
                    {dayLabel}
                  </AppText>
                  {tone && outlook.bestLevel ? (
                    <View style={[styles.levelPill, { backgroundColor: tone.background }]}>
                      <View style={[styles.levelDot, { backgroundColor: tone.foreground }]} />
                      <AppText variant="caption" weight="semibold" color={tone.foreground}>
                        {DAY_LEVEL_LABEL[outlook.bestLevel]}
                      </AppText>
                    </View>
                  ) : null}
                </View>
                <AppText
                  variant={isRunDay ? 'body' : 'small'}
                  weight={isRunDay ? 'semibold' : 'regular'}
                  tone={isRunDay ? 'default' : 'muted'}>
                  {planText}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {windowText(outlook)}
                </AppText>
                {preferredHour ? (
                  <AppText
                    variant="caption"
                    weight="semibold"
                    color={preferredHour.level === 'green' ? colors.clearGreen : colors.clearYellow}>
                    {preferredHour.level === 'green'
                      ? `เวลาที่ตั้งไว้ ${formatMinuteOfDay(settings.preferredMinuteOfDay)} อากาศเหมาะวิ่ง`
                      : `เวลาที่ตั้งไว้ ${formatMinuteOfDay(settings.preferredMinuteOfDay)} ${preferredTimeReason(preferredHour, preferredAt, day.sunrise) || 'อากาศไม่ค่อยเหมาะ'}${outlook.clearWindow ? ' ลองย้ายไปช่วงเหมาะวิ่งด้านบน' : ''}`}
                  </AppText>
                ) : null}
                {outlook.pm25Unknown ? (
                  <AppText variant="caption" tone="faint">
                    บางชั่วโมงยังไม่มีพยากรณ์ PM2.5
                  </AppText>
                ) : null}
              </View>
            );
          })
        : null}

      <AppText variant="caption" tone="faint">
        พยากรณ์รายชั่วโมงจาก Open-Meteo เป็นค่าจากแบบจำลอง อาจคลาดเคลื่อน ก่อนออกไปวิ่งให้ดูใบอนุญาตวิ่งวันนี้อีกครั้ง
        {location?.isFallback ? ` · แสดงพยากรณ์ของ ${FALLBACK_LOCATION_LABEL} เพราะยังไม่ได้รับสิทธิ์ตำแหน่ง` : ''}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  day: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: 2,
  },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  levelDot: { width: 6, height: 6, borderRadius: 3 },
});
